"""
SIH26025 — Dataset Generator v3
====================================
Improvements over v2:
  1. 50 independent simulated mine panels (was 10) -> stable held-out eval
  2. Full subsidence profile physics per NCB Subsidence Engineer's Handbook
     methodology: vertical subsidence, horizontal strain (1st derivative),
     and curvature (2nd derivative) -- not just a single vertical value.
  3. Bord & Pillar bulking-coefficient formulation for max subsidence:
        S_max = m - h(K_p - 1)     [key-stratum / goaf-bulking theory]
     alongside the NIRM/Sheorey empirical cross-check formula, and we use
     whichever is more conservative (lower) per panel, which is standard
     engineering practice (take the safer bound).

Run: python generate_dataset_v3.py
Output: subsidence_dataset_v3.jsonl (~100,000 rows across 50 nodes)
"""

import json
import numpy as np

RANDOM_SEED = 42
rng = np.random.default_rng(RANDOM_SEED)

SAMPLE_INTERVAL_SEC = 5
NUM_NODES = 50
ROWS_PER_NODE = 2_000          # 50 x 2000 = 100,000 rows
DROPOUT_RATE = 0.03


class MineGeometry:
    def __init__(self):
        self.extraction_height_m = rng.uniform(2.0, 4.0)   # m: mining/seam thickness
        self.panel_width_m = rng.uniform(80, 220)           # W
        self.depth_m = rng.uniform(80, 200)                 # H
        self.overburden_thickness_m = rng.uniform(20, 60)   # h: strata above key stratum
        self.bulking_coeff = rng.uniform(1.15, 1.35)         # K_p: goaf bulking factor
        self.influence_radius_m = self.depth_m * rng.uniform(0.6, 1.1)  # tan(beta) proxy

    def s_max_sheorey(self) -> float:
        """NIRM / Sheorey et al. (2000) empirical Bord & Pillar formula."""
        ratio = self.panel_width_m / self.depth_m
        s = self.extraction_height_m * 0.65 * (((1 + ratio) / 0.75) - 8)
        return max(s, 0.05)

    def s_max_bulking(self) -> float:
        """Key-stratum / goaf-bulking theory: S_max = m - h(K_p - 1)."""
        s = self.extraction_height_m - self.overburden_thickness_m * (self.bulking_coeff - 1)
        return max(s, 0.05)

    def s_max(self) -> float:
        # take the more conservative (lower) of the two estimates
        return min(self.s_max_sheorey(), self.s_max_bulking())


def knothe(t, s_max, c):
    return s_max * (1 - np.exp(-c * t))


SEVERITY_PROFILES = {
    "watch":    (0.55, (0.5, 2.0), False),
    "warning":  (0.30, (2.0, 5.0), False),
    "critical": (0.15, (5.0, 12.0), True),
}

STAGE_BOUNDARIES = {
    "watch":    [(0.20, "normal"), (1.01, "watch")],
    "warning":  [(0.15, "normal"), (0.40, "watch"), (1.01, "warning")],
    "critical": [(0.10, "normal"), (0.30, "watch"), (0.70, "warning"), (1.01, "critical")],
}


def label_from_position(severity, position_frac):
    for boundary, label in STAGE_BOUNDARIES[severity]:
        if position_frac < boundary:
            return label
    return STAGE_BOUNDARIES[severity][-1][1]


def generate_event(duration_samples, geom):
    names = list(SEVERITY_PROFILES.keys())
    weights = np.array([SEVERITY_PROFILES[n][0] for n in names])
    severity = rng.choice(names, p=weights / weights.sum())
    c_lo, c_hi = SEVERITY_PROFILES[severity][1]
    c = rng.uniform(c_lo, c_hi)
    has_spike = SEVERITY_PROFILES[severity][2]

    s_max = geom.s_max()
    t = np.linspace(0, 1, duration_samples)
    subsidence = knothe(t, s_max, c)

    if has_spike and rng.random() < 0.6:
        spike_start = int(duration_samples * rng.uniform(0.88, 0.95))
        spike_len = duration_samples - spike_start
        spike_curve = np.linspace(0, 1, spike_len) ** 3
        subsidence[spike_start:] += spike_curve * s_max * rng.uniform(0.15, 0.35)

    # Horizontal strain: proportional to the spatial derivative of subsidence,
    # approximated here via a fixed influence-radius scaling (NCB profile-
    # function relationship between vertical subsidence and horizontal strain).
    strain = np.gradient(subsidence, t) / (geom.influence_radius_m + 1e-6) * 1e3  # mm/m proxy

    # Curvature: second derivative -- large curvature is what actually cracks
    # rigid structures/supports, independent of absolute subsidence magnitude.
    curvature = np.gradient(np.gradient(subsidence, t), t) / (geom.influence_radius_m ** 2 + 1e-6)

    rate = np.gradient(subsidence, t)
    return subsidence, rate, strain, curvature, severity, s_max


def simulate_node(node_id, n_rows):
    geom = MineGeometry()

    tilt = rng.normal(0, 0.03, n_rows)
    accel_rms = np.abs(rng.normal(0.02, 0.005, n_rows))
    load_delta = rng.normal(0, 0.5, n_rows)
    displacement = rng.normal(0, 0.3, n_rows)
    moisture = np.clip(rng.normal(0.15, 0.05, n_rows), 0, 1)
    strain_signal = rng.normal(0, 0.01, n_rows)
    curvature_signal = rng.normal(0, 0.001, n_rows)
    labels = ["normal"] * n_rows

    n_events = rng.integers(2, 6)
    cursor = 0
    for _ in range(n_events):
        gap = rng.integers(50, 250)
        cursor += gap
        if cursor >= n_rows - 30:
            break
        duration = rng.integers(50, min(600, n_rows - cursor))
        subsidence, rate, strain, curvature, severity, event_smax = generate_event(duration, geom)
        end = cursor + duration

        frac = subsidence / event_smax
        position = np.linspace(0, 1, duration)

        tilt[cursor:end] += np.degrees(np.arctan(np.gradient(subsidence))) * 20
        accel_rms[cursor:end] += 0.4 * np.abs(rate) / (event_smax + 1e-6)
        load_delta[cursor:end] += 35 * frac
        displacement[cursor:end] += subsidence * 1000 * 0.4
        strain_signal[cursor:end] += strain
        curvature_signal[cursor:end] += curvature
        if severity in ("warning", "critical") and rng.random() < 0.5:
            moisture[cursor:end] += 0.3 * frac

        for i in range(cursor, end):
            labels[i] = label_from_position(severity, position[i - cursor])
        cursor = end

    accel_rms = np.clip(accel_rms, 0, None)
    moisture = np.clip(moisture, 0, 1)
    crack_state = displacement > (8 + rng.normal(0, 1))
    flip_noise = rng.random(n_rows) < 0.01
    crack_state = np.logical_xor(crack_state, flip_noise)

    rows = []
    ts = 0
    for i in range(n_rows):
        ts += SAMPLE_INTERVAL_SEC * 1000
        row = {
            "device": node_id,
            "timestamp_ms": int(ts),
            "distance_cm": round(50 - displacement[i] / 10, 2),
            "ir_detected": bool(crack_state[i]),
            "tilt_deg": round(float(tilt[i]), 4),
            "accel_rms": round(float(accel_rms[i]), 5),
            "load_delta_kg": round(float(load_delta[i]), 3),
            "moisture": round(float(moisture[i]), 4),
            "strain_mm_per_m": round(float(strain_signal[i]), 5),
            "curvature": round(float(curvature_signal[i]), 7),
            "risk_label": labels[i],
        }
        if rng.random() < DROPOUT_RATE:
            row["distance_cm"] = -1
        if rng.random() < DROPOUT_RATE:
            row["accel_rms"] = None
        rows.append(row)
    return rows


def main():
    all_rows = []
    for n in range(NUM_NODES):
        node_id = f"Node{n+1:03d}"
        all_rows.extend(simulate_node(node_id, ROWS_PER_NODE))

    with open("subsidence_dataset_v3.jsonl", "w") as f:
        for row in all_rows:
            f.write(json.dumps(row) + "\n")

    from collections import Counter
    counts = Counter(r["risk_label"] for r in all_rows)
    total = len(all_rows)
    print(f"Wrote {total} rows across {NUM_NODES} nodes to subsidence_dataset_v3.jsonl")
    for label in ("normal", "watch", "warning", "critical"):
        c = counts.get(label, 0)
        print(f"  {label:9s}: {c:7d}  ({100*c/total:.1f}%)")


if __name__ == "__main__":
    main()
