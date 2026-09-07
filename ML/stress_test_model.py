"""
SIH26025 — Model Stress Test Harness
=========================================
Continuously injects synthetic sensor readings into the trained model and
evaluates it against scenarios the model has NEVER seen in training:

  1. in_distribution        - sanity baseline: fresh random draw from the
                               SAME parameter ranges as training (expect it
                               to do well; if it doesn't, something's broken)
  2. out_of_distribution     - physics-consistent events, but mine geometry
                               pushed well beyond the training parameter
                               ranges (deeper, wider, thicker seams)
  3. pure_random_noise       - features with NO physical relationship to
                               each other at all (random per-tick values).
                               There is no "correct" class here — what we
                               actually measure is whether the model stays
                               humble (flags anomaly / low confidence)
                               instead of confidently hallucinating a label.
  4. sensor_failure_extreme  - simultaneous multi-sensor dropout + outlier
                               spikes, well beyond the training 3% dropout
                               rate — simulates real hardware degrading.
  5. adversarial_boundary    - starts from a real normal sample and applies
                               increasing random perturbation until the
                               prediction flips, to measure decision
                               boundary fragility (smaller flip distance =
                               more fragile).

Reports, per scenario: accuracy (where ground truth exists), confusion
matrix, latency (mean/p95/max ms — directly relevant to Pi 3B+ feasibility),
anomaly-flag rate, and CONFIDENTLY-WRONG rate (wrong prediction with >80%
class probability) — the single most important safety metric for this PS,
since a confident wrong "Normal" call on a dangerous input is the failure
mode that actually gets someone hurt.

Run: python stress_test_model.py [--ticks 2000] [--live]
"""

import argparse
import time
from collections import deque, Counter, defaultdict

import numpy as np
import joblib

RANDOM_SEED = None  # None = different randomness every run, on purpose
rng = np.random.default_rng(RANDOM_SEED)

WINDOW = 6
BASE_FEATURES = ["tilt_deg", "accel_rms", "load_delta_kg", "distance_cm",
                  "moisture", "strain_mm_per_m", "curvature"]

# --- Robustness layer: hard physical plausibility bounds -------------------
# ML confidence is NOT a trustworthy safety signal at the input boundary --
# your own stress test showed 500 pure-noise rows getting 57-94% mean
# classifier confidence. The fix is a simple, fully explainable rule-based
# gate that overrides the ML output whenever a raw reading is outside what
# is physically possible for this sensor, regardless of what the model
# "thinks". These defaults are editable in the dashboard sidebar.
DEFAULT_PLAUSIBILITY_BOUNDS = {
    "tilt_deg": (-15.0, 15.0),
    "accel_rms": (0.0, 2.0),
    "load_delta_kg": (-150.0, 150.0),
    "distance_cm": (0.0, 400.0),
    "moisture": (0.0, 1.0),
    "strain_mm_per_m": (-20.0, 20.0),
    "curvature": (-0.5, 0.5),
}


def check_plausibility(raw: dict, bounds: dict = None) -> list:
    """Returns a list of feature names that violate their plausible physical
    range. Empty list = all readings physically sane."""
    bounds = bounds or DEFAULT_PLAUSIBILITY_BOUNDS
    violations = []
    for f, (lo, hi) in bounds.items():
        v = raw.get(f)
        if v is None:
            continue
        if isinstance(v, (int, float)) and not isinstance(v, bool) and not np.isnan(v):
            if v < lo or v > hi:
                violations.append(f)
    return violations


CORRELATED_GROUP = ["tilt_deg", "load_delta_kg", "distance_cm", "strain_mm_per_m"]


def gated_decision(pred: str, proba_max: float, is_anomaly: bool, violations: list,
                    corroborating_count: int = 0, min_corroboration: int = 2) -> str:
    """Final robustness gate combining classifier + anomaly detector + hard
    bounds check + cross-sensor correlation check.

    Key fix: a bound violation alone is NOT automatically a sensor fault.
    A genuinely large real event moves several correlated sensors together
    (tilt, load, displacement, strain all shift at once). A sensor glitch
    usually moves ONE channel while its neighbours stay near baseline.
    So: if a value is out of bounds AND corroborated by other correlated
    sensors also moving, trust it as a real (if extreme) event instead of
    suppressing it as SENSOR_FAULT.
    """
    if violations:
        if corroborating_count >= min_corroboration:
            # extreme, but multiple independent sensors agree -> likely real
            return pred
        return "SENSOR_FAULT"
    if is_anomaly and pred == "normal":
        return "UNCERTAIN"
    if is_anomaly and proba_max < 0.6:
        return "UNCERTAIN"
    return pred

MODEL_FILES = dict(
    clf="risk_classifier_v3.joblib",
    iso="anomaly_model_v3.joblib",
    scaler="feature_scaler_v3.joblib",
    feature_cols="feature_cols_v3.joblib",
)


# ============================================================
# Streaming feature engineering — mirrors training exactly
# ============================================================
class NodeStream:
    """Maintains rolling history for ONE virtual node so injected raw
    readings get the same rolling-window feature treatment used in training."""

    def __init__(self):
        self.history = {f: deque(maxlen=WINDOW) for f in BASE_FEATURES}
        self.baseline = {f: deque(maxlen=30) for f in BASE_FEATURES}  # longer, pre-update baseline
        self.prev = {"tilt_deg": 0.0, "load_delta_kg": 0.0}

    @staticmethod
    def _is_bad(val) -> bool:
        if val is None:
            return True
        if isinstance(val, (int, float)) and not isinstance(val, bool):
            return bool(np.isnan(val))
        return False

    def corroboration_count(self, raw: dict, violated_features: list, z_threshold: float = 1.5) -> int:
        """How many OTHER correlated sensors are also moving significantly,
        judged against each feature's baseline BEFORE this tick (so one
        spike can't inflate its own reference stats). Called before push()."""
        count = 0
        for f in CORRELATED_GROUP:
            if f in violated_features:
                continue
            base = self.baseline.get(f)
            v = raw.get(f)
            if not base or len(base) < 5 or v is None or (isinstance(v, float) and np.isnan(v)):
                continue
            arr = np.array(base, dtype=float)
            mean, std = arr.mean(), arr.std() or 1e-6
            z = abs((v - mean) / std)
            if z > z_threshold:
                count += 1
        return count

    def push(self, raw: dict) -> dict:
        feats = {}
        for f in BASE_FEATURES:
            val = raw.get(f, 0.0)
            # -1 is the ultrasonic "out of range" sentinel from the real hardware
            if f == "distance_cm" and not self._is_bad(val) and val <= 0:
                val = None
            if self._is_bad(val):
                val = self.history[f][-1] if self.history[f] else (50.0 if f == "distance_cm" else 0.0)
            self.baseline[f].append(val)  # update AFTER corroboration_count() reads pre-tick baseline
            self.history[f].append(val)
            arr = np.array(self.history[f], dtype=float)
            feats[f] = val
            feats[f"{f}_roll_mean"] = float(arr.mean())
            feats[f"{f}_roll_std"] = float(arr.std()) if len(arr) > 1 else 0.0

        feats["ir_detected"] = int(bool(raw.get("ir_detected", False)))
        feats["tilt_rate"] = feats["tilt_deg"] - self.prev["tilt_deg"]
        feats["load_rate"] = feats["load_delta_kg"] - self.prev["load_delta_kg"]
        self.prev["tilt_deg"] = feats["tilt_deg"]
        self.prev["load_delta_kg"] = feats["load_delta_kg"]
        return feats


# ============================================================
# Scenario generators — each yields (raw_reading_dict, true_label_or_None)
# ============================================================
def knothe(t, s_max, c):
    return s_max * (1 - np.exp(-c * t))


def physics_event(depth_range, width_range, height_range, n_ticks):
    """One injected event using the SAME Knothe/NIRM physics as training,
    but geometry ranges are parameterised so we can push them out-of-range."""
    depth = rng.uniform(*depth_range)
    width = rng.uniform(*width_range)
    height = rng.uniform(*height_range)
    ratio = width / depth
    s_max = max(height * 0.65 * (((1 + ratio) / 0.75) - 8), 0.05)
    severity = rng.choice(["watch", "warning", "critical"], p=[0.5, 0.3, 0.2])
    c = {"watch": rng.uniform(0.5, 2.0),
         "warning": rng.uniform(2.0, 5.0),
         "critical": rng.uniform(5.0, 12.0)}[severity]
    t = np.linspace(0, 1, n_ticks)
    subsidence = knothe(t, s_max, c)
    rate = np.gradient(subsidence, t)
    boundaries = {
        "watch":    [(0.20, "normal"), (1.01, "watch")],
        "warning":  [(0.15, "normal"), (0.40, "watch"), (1.01, "warning")],
        "critical": [(0.10, "normal"), (0.30, "watch"), (0.70, "warning"), (1.01, "critical")],
    }[severity]
    for i in range(n_ticks):
        pos = i / n_ticks
        label = next(lbl for b, lbl in boundaries if pos < b)
        yield {
            "tilt_deg": float(np.degrees(np.arctan(rate[i])) * 20 + rng.normal(0, 0.03)),
            "accel_rms": float(max(0, 0.4 * abs(rate[i]) / (s_max + 1e-6) + rng.normal(0, 0.005))),
            "load_delta_kg": float(35 * subsidence[i] / s_max + rng.normal(0, 0.5)),
            "distance_cm": float(50 - (subsidence[i] * 1000 * 0.4) / 10),
            "moisture": float(np.clip(0.15 + 0.3 * subsidence[i] / s_max, 0, 1)),
            "strain_mm_per_m": float(rate[i] / (depth * 0.8) * 1e3),
            "curvature": float(np.gradient(rate, t)[i] / (depth * 0.8) ** 2),
            "ir_detected": bool(subsidence[i] * 1000 * 0.4 > 8),
        }, label


def scenario_in_distribution(n_ticks):
    yield from physics_event((80, 200), (80, 220), (2.0, 4.0), n_ticks)


def scenario_out_of_distribution(n_ticks):
    # geometry well beyond training ranges: deeper, wider, thicker seams
    yield from physics_event((350, 600), (400, 900), (7.0, 14.0), n_ticks)


def scenario_pure_random_noise(n_ticks):
    for _ in range(n_ticks):
        yield {
            "tilt_deg": float(rng.uniform(-60, 60)),
            "accel_rms": float(rng.uniform(0, 8)),
            "load_delta_kg": float(rng.uniform(-800, 800)),
            "distance_cm": float(rng.uniform(-5, 150)),
            "moisture": float(rng.uniform(0, 1.5)),
            "strain_mm_per_m": float(rng.uniform(-50, 50)),
            "curvature": float(rng.uniform(-1, 1)),
            "ir_detected": bool(rng.random() > 0.5),
        }, None  # no ground truth — this is structureless noise by design


def scenario_sensor_failure(n_ticks):
    for _ in range(n_ticks):
        reading = {
            "tilt_deg": rng.normal(0, 0.05),
            "accel_rms": abs(rng.normal(0.02, 0.005)),
            "load_delta_kg": rng.normal(0, 0.5),
            "distance_cm": 50.0,
            "moisture": 0.15,
            "strain_mm_per_m": rng.normal(0, 0.01),
            "curvature": rng.normal(0, 0.001),
            "ir_detected": False,
        }
        # simultaneously fail 2-4 sensors at once, far beyond training's 3% single-sensor rate
        for f in rng.choice(BASE_FEATURES, size=rng.integers(2, 5), replace=False):
            if rng.random() < 0.5:
                reading[f] = None  # dropout
            else:
                reading[f] = reading[f] * rng.choice([-1, 1]) * rng.uniform(20, 200)  # spike
        yield reading, "normal"  # ground truth: nothing is actually moving, sensors just failed


def run_scenario(name, generator_fn, n_ticks, clf, iso, scaler, feature_cols, live=False):
    stream = NodeStream()
    y_true, y_pred, y_gated, latencies_ms, confidences, anomaly_flags = [], [], [], [], [], []
    confidently_wrong = 0
    fault_flags = 0

    for i, (raw, true_label) in enumerate(generator_fn(n_ticks)):
        violations = check_plausibility(raw)
        corroboration = stream.corroboration_count(raw, violations)
        feats = stream.push(raw)
        x = np.array([[feats.get(c, 0.0) for c in feature_cols]])

        t0 = time.perf_counter()
        x_s = scaler.transform(x)
        proba = clf.predict_proba(x_s)[0]
        pred = clf.classes_[np.argmax(proba)]
        anomaly = iso.predict(x_s)[0] == -1
        gated = gated_decision(pred, proba.max(), anomaly, violations, corroboration)
        latency_ms = (time.perf_counter() - t0) * 1000

        latencies_ms.append(latency_ms)
        confidences.append(proba.max())
        anomaly_flags.append(anomaly)
        y_pred.append(pred)
        y_gated.append(gated)
        if gated in ("SENSOR_FAULT", "UNCERTAIN"):
            fault_flags += 1
        if true_label is not None:
            y_true.append(true_label)
            if pred != true_label and proba.max() > 0.8:
                confidently_wrong += 1

        if live and i % max(1, n_ticks // 20) == 0:
            print(f"  [{name}] tick {i}/{n_ticks}  pred={pred:9s} gated={gated:12s} "
                  f"conf={proba.max():.2f}  anomaly={anomaly}  lat={latency_ms:.2f}ms")

    result = {
        "name": name,
        "n": n_ticks,
        "latency_mean": np.mean(latencies_ms),
        "latency_p95": np.percentile(latencies_ms, 95),
        "latency_max": np.max(latencies_ms),
        "anomaly_rate": np.mean(anomaly_flags),
        "mean_confidence": np.mean(confidences),
        "pred_distribution": Counter(y_pred),
        "gated_distribution": Counter(y_gated),
        "fault_flag_rate": fault_flags / n_ticks,
    }
    if y_true:
        correct = sum(p == t for p, t in zip(y_pred, y_true))
        result["accuracy"] = correct / len(y_true)
        result["confidently_wrong_rate"] = confidently_wrong / len(y_true)
        confusion = defaultdict(Counter)
        for t, p in zip(y_true, y_pred):
            confusion[t][p] += 1
        result["confusion"] = confusion
    return result


def adversarial_boundary_test(n_samples, clf, scaler, feature_cols):
    """Start from real normal points, add growing random noise, find the
    smallest perturbation (in scaled-feature L2 norm) that flips the class."""
    stream = NodeStream()
    flip_distances = []
    for raw, _ in list(scenario_in_distribution(n_samples))[:n_samples]:
        feats = stream.push(raw)
        base_x = np.array([[feats.get(c, 0.0) for c in feature_cols]])
        base_s = scaler.transform(base_x)
        base_pred = clf.predict(base_s)[0]
        flipped_at = None
        for step in np.linspace(0.05, 5.0, 40):
            noise = rng.normal(0, step, size=base_s.shape)
            trial_pred = clf.predict(base_s + noise)[0]
            if trial_pred != base_pred:
                flipped_at = np.linalg.norm(noise)
                break
        if flipped_at is not None:
            flip_distances.append(flipped_at)
    return flip_distances


def print_report(result):
    print(f"\n--- Scenario: {result['name']} ---")
    print(f"  Ticks: {result['n']}")
    print(f"  Latency: mean={result['latency_mean']:.2f}ms  "
          f"p95={result['latency_p95']:.2f}ms  max={result['latency_max']:.2f}ms")
    print(f"  Isolation Forest anomaly-flag rate: {result['anomaly_rate']*100:.1f}%")
    print(f"  Mean classifier confidence: {result['mean_confidence']:.2f}")
    print(f"  Prediction distribution: {dict(result['pred_distribution'])}")
    print(f"  GATED distribution (after robustness layer): {dict(result['gated_distribution'])}")
    print(f"  Fault/Uncertain flag rate: {result['fault_flag_rate']*100:.1f}%")
    if "accuracy" in result:
        print(f"  Accuracy vs ground truth: {result['accuracy']*100:.1f}%")
        print(f"  CONFIDENTLY WRONG rate (>80% conf, still wrong): "
              f"{result['confidently_wrong_rate']*100:.2f}%  <-- key safety metric")
        print("  Confusion (actual -> predicted counts):")
        for actual, preds in result["confusion"].items():
            print(f"    {actual:9s} -> {dict(preds)}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--ticks", type=int, default=2000,
                         help="ticks per scenario")
    parser.add_argument("--live", action="store_true",
                         help="print per-tick progress instead of only a summary")
    args = parser.parse_args()

    print("Loading model artifacts...")
    clf = joblib.load(MODEL_FILES["clf"])
    iso = joblib.load(MODEL_FILES["iso"])
    scaler = joblib.load(MODEL_FILES["scaler"])
    feature_cols = joblib.load(MODEL_FILES["feature_cols"])
    print(f"Loaded. {len(feature_cols)} features expected.\n")

    scenarios = [
        ("in_distribution", scenario_in_distribution),
        ("out_of_distribution_geometry", scenario_out_of_distribution),
        ("pure_random_noise", scenario_pure_random_noise),
        ("sensor_failure_extreme", scenario_sensor_failure),
    ]

    results = []
    for name, fn in scenarios:
        print(f"Running scenario: {name} ({args.ticks} ticks)...")
        r = run_scenario(name, fn, args.ticks, clf, iso, scaler, feature_cols, live=args.live)
        print_report(r)
        results.append(r)

    print("\nRunning adversarial boundary-fragility test...")
    flips = adversarial_boundary_test(300, clf, scaler, feature_cols)
    if flips:
        print(f"  Median perturbation-to-flip (scaled L2 norm): {np.median(flips):.3f}")
        print(f"  Min: {np.min(flips):.3f}   Max: {np.max(flips):.3f}")
        print(f"  {len(flips)}/300 base samples had a flip found within tested noise range.")
    else:
        print("  No flips found within tested noise range — decision regions are locally stable.")

    print("\n=== SUMMARY: things worth fixing before you trust this for a demo ===")
    for r in results:
        flag = ""
        if "confidently_wrong_rate" in r and r["confidently_wrong_rate"] > 0.05:
            flag += " [HIGH CONFIDENTLY-WRONG RATE]"
        if r["name"] == "pure_random_noise" and r["anomaly_rate"] < 0.5:
            flag += " [NOISE NOT BEING FLAGGED AS ANOMALOUS — MODEL TOO CONFIDENT ON GARBAGE]"
        if r["latency_p95"] > 50:
            flag += " [LATENCY MAY BE TOO HIGH FOR REAL-TIME PI 3B+ INFERENCE]"
        print(f"  {r['name']}: {'OK' if not flag else flag}")


if __name__ == "__main__":
    main()
