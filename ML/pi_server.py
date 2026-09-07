"""
SIH26025 — Pi Ingestion Server (ESP8266 --WiFi--> Pi --ML--> Result)
==========================================================================
One process, one file: receives sensor JSON from any number of ESP8266
nodes on the same WiFi, runs it through the same feature engineering +
model + robustness gate used throughout this project, prints a live
terminal view, and responds to the node with the risk assessment.

----------------------------------------------------------------------
EXACTLY WHAT TO SEND  (POST http://<this-pi-ip>:5000/ingest)
----------------------------------------------------------------------
Required:
    "device": "<unique id per node, e.g. 'esp8266_node01'>"

Optional (send whatever your current hardware actually has -- missing
fields default to a safe baseline and won't crash anything, but the
model's accuracy depends on how many of these are real):
    "tilt_deg":        float, degrees      (MPU6500)
    "accel_rms":       float, g            (MPU6500)
    "load_delta_kg":   float, kg           (HX711 + load cell)
    "distance_cm":     float, cm           (ultrasonic; send -1 for out-of-range,
                                             matches your existing firmware convention)
    "moisture":        float, 0.0-1.0      (normalized), OR send raw ADC and
    "soil_raw":        int, 0-4095            let the server normalize it:
    "rain_raw":        int, 0-4095            moisture = mean(soil_raw, rain_raw)/4095
    "strain_mm_per_m": float               (optional, derived/estimated)
    "curvature":       float               (optional, derived/estimated)
    "ir_detected":     bool                (crack/break-beam sensor)
    "timestamp_ms":    int                 (node's own clock, logged only)

----------------------------------------------------------------------
WHAT YOU GET BACK (HTTP response, JSON)
----------------------------------------------------------------------
{
  "device": "...",
  "risk": "normal|watch|warning|critical|SENSOR_FAULT|UNCERTAIN",  <- gated (trust this)
  "raw_prediction": "normal|watch|warning|critical",                <- before gating
  "confidence": 0.0-1.0,
  "is_anomaly": true/false,
  "latency_ms": float
}
"risk" is the one to act on (light an LED, sound a buzzer, etc.) --
it's already been through the plausibility + correlation gate.
"raw_prediction" is included for logging/debugging only.

----------------------------------------------------------------------
WHAT THE MODEL WAS ACTUALLY TRAINED ON (for your own reference)
----------------------------------------------------------------------
~100,000 rows of physics-simulated data (NIRM/Sheorey + Knothe subsidence
curves), with rolling-window features (6-sample mean/std, computed per
device) on top of the raw readings above. This server reconstructs those
exact engineered features live, per device, as readings arrive -- that's
what the NodeStream class below does. A brand-new device ID needs a
handful of readings before its rolling stats are fully meaningful; this
is handled gracefully (short window instead of crashing), just less
informative for the first few ticks.

----------------------------------------------------------------------
Before running, on the Pi:
    pip install flask numpy scikit-learn joblib
Run:
    python3 pi_server.py --port 5000
Then point your ESP8266 at:
    http://<this-pi's-LAN-IP>:5000/ingest
Check overall status any time from a browser or curl:
    http://<this-pi's-LAN-IP>:5000/status
"""

import argparse
import atexit
import json
import logging
import logging.handlers
import os
import queue
import shutil
import threading
import time
from collections import deque, Counter
from datetime import datetime, timezone

import numpy as np
import joblib
import requests
from flask import Flask, request, jsonify

WINDOW = 6
BASE_FEATURES = ["tilt_deg", "accel_rms", "load_delta_kg", "distance_cm",
                  "moisture", "strain_mm_per_m", "curvature"]
CORRELATED_GROUP = ["tilt_deg", "load_delta_kg", "distance_cm", "strain_mm_per_m"]
LABELS_ORDER = ["normal", "watch", "warning", "critical", "SENSOR_FAULT", "UNCERTAIN"]

MODEL_FILES = dict(
    clf="risk_classifier_v3.joblib",
    iso="anomaly_model_v3.joblib",
    scaler="feature_scaler_v3.joblib",
    feature_cols="feature_cols_v3.joblib",
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LOG_DIR = os.path.join(BASE_DIR, "log")
DASHBOARD_URL = os.getenv("DASHBOARD_URL", "").strip()
FORWARD_QUEUE_SIZE = 256
FORWARD_TIMEOUT_SECONDS = 1.0

DEFAULT_BOUNDS = {
    "tilt_deg": (-15.0, 15.0), "accel_rms": (0.0, 2.0), "load_delta_kg": (-150.0, 150.0),
    "distance_cm": (0.0, 400.0), "moisture": (0.0, 1.0),
    "strain_mm_per_m": (-20.0, 20.0), "curvature": (-0.5, 0.5),
}


# ============================================================
# Streaming feature engineering + robustness gate
# (identical logic to pi_live_test.py / stress_test_model.py, kept
# self-contained here so this one file is all you need on the Pi)
# ============================================================
class NodeStream:
    def __init__(self):
        self.history = {f: deque(maxlen=WINDOW) for f in BASE_FEATURES}
        self.baseline = {f: deque(maxlen=30) for f in BASE_FEATURES}
        self.prev = {"tilt_deg": 0.0, "load_delta_kg": 0.0}

    @staticmethod
    def _is_bad(val):
        if val is None:
            return True
        if isinstance(val, (int, float)) and not isinstance(val, bool):
            return bool(np.isnan(val))
        return False

    def corroboration_count(self, raw, violated, z_threshold=1.5):
        count = 0
        for f in CORRELATED_GROUP:
            if f in violated:
                continue
            base = self.baseline.get(f)
            v = raw.get(f)
            if not base or len(base) < 5 or self._is_bad(v):
                continue
            arr = np.array(base, dtype=float)
            mean, std = arr.mean(), arr.std() or 1e-6
            if abs((v - mean) / std) > z_threshold:
                count += 1
        return count

    def push(self, raw):
        feats = {}
        for f in BASE_FEATURES:
            val = raw.get(f, 0.0)
            if f == "distance_cm" and not self._is_bad(val) and val <= 0:
                val = None
            if self._is_bad(val):
                val = self.history[f][-1] if self.history[f] else (50.0 if f == "distance_cm" else 0.0)
            self.baseline[f].append(val)
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


def check_plausibility(raw, bounds=DEFAULT_BOUNDS):
    violations = []
    for f, (lo, hi) in bounds.items():
        v = raw.get(f)
        if v is None or (isinstance(v, float) and np.isnan(v)):
            continue
        if v < lo or v > hi:
            violations.append(f)
    return violations


def gated_decision(pred, proba_max, is_anomaly, violations, corroboration, min_corroboration=2):
    if violations:
        return pred if corroboration >= min_corroboration else "SENSOR_FAULT"
    if is_anomaly and (pred == "normal" or proba_max < 0.6):
        return "UNCERTAIN"
    return pred


def normalize_incoming(raw: dict) -> dict:
    """Adapt whatever the ESP8266 actually sends into the schema the model
    expects. Add more mappings here as your hardware evolves."""
    adapted = dict(raw)
    for field in BASE_FEATURES:
        if field in adapted and adapted[field] is not None:
            try:
                adapted[field] = float(adapted[field])
            except (TypeError, ValueError):
                adapted[field] = None
    if "ir_detected" in adapted:
        adapted["ir_detected"] = bool(adapted["ir_detected"])
    if "moisture" not in adapted:
        vals = [v for v in (adapted.get("soil_raw"), adapted.get("rain_raw")) if v is not None]
        if vals:
            adapted["moisture"] = float(np.clip(np.mean(vals) / 4095.0, 0, 1))
    return adapted


def render_bars(counts, width_hint=None):
    term_width = width_hint or shutil.get_terminal_size((80, 20)).columns
    max_bar_len = max(10, term_width - 25)
    total = sum(counts.values()) or 1
    maxcount = max(counts.values()) or 1
    lines = []
    for label in LABELS_ORDER:
        c = counts.get(label, 0)
        bar_len = int((c / maxcount) * max_bar_len)
        lines.append(f"{label:12s} [{'#'*bar_len}{' '*(max_bar_len-bar_len)}] {c:6d} ({100*c/total:4.1f}%)")
    return "\n".join(lines)


# ============================================================
def configure_logging():
    os.makedirs(LOG_DIR, exist_ok=True)
    logger = logging.getLogger("pi_server")
    logger.setLevel(logging.INFO)
    logger.propagate = False
    if logger.handlers:
        return logger

    formatter = logging.Formatter("%(asctime)s %(levelname)s %(message)s")
    console = logging.StreamHandler()
    console.setFormatter(formatter)
    file_handler = logging.handlers.RotatingFileHandler(
        os.path.join(LOG_DIR, "pi_server.log"), maxBytes=5 * 1024 * 1024, backupCount=3
    )
    file_handler.setFormatter(formatter)
    logger.addHandler(console)
    logger.addHandler(file_handler)
    return logger


logger = configure_logging()
telemetry_log = None


def configure_telemetry_log():
    global telemetry_log
    telemetry_log = logging.getLogger("pi_server.telemetry")
    telemetry_log.setLevel(logging.INFO)
    telemetry_log.propagate = False
    handler = logging.handlers.RotatingFileHandler(
        os.path.join(LOG_DIR, "telemetry.jsonl"), maxBytes=10 * 1024 * 1024, backupCount=5
    )
    handler.setFormatter(logging.Formatter("%(message)s"))
    telemetry_log.addHandler(handler)


configure_telemetry_log()

# Flask app
# ============================================================
app = Flask(__name__)
clf = iso = scaler = feature_cols = None
node_streams = {}
node_lock = threading.RLock()
model_lock = threading.Lock()
status_counts = Counter()
recent_log = deque(maxlen=15)
live_readings = deque(maxlen=100)
forward_queue = queue.Queue(maxsize=FORWARD_QUEUE_SIZE)
forward_stop = threading.Event()
forward_thread = None
dashboard_session = requests.Session()


def forward_worker():
    while not forward_stop.is_set():
        try:
            result = forward_queue.get(timeout=0.5)
        except queue.Empty:
            continue
        try:
            if DASHBOARD_URL:
                response = dashboard_session.post(
                    DASHBOARD_URL, json=result, timeout=FORWARD_TIMEOUT_SECONDS
                )
                if response.status_code >= 300:
                    logger.warning("Dashboard forward returned HTTP %s", response.status_code)
        except requests.RequestException as exc:
            logger.warning("Dashboard forward failed: %s", exc)
        finally:
            forward_queue.task_done()


def queue_dashboard_result(result):
    if not DASHBOARD_URL:
        return
    try:
        forward_queue.put_nowait(result)
    except queue.Full:
        logger.warning("Dashboard forward queue full; dropping oldest result")
        try:
            forward_queue.get_nowait()
            forward_queue.task_done()
            forward_queue.put_nowait(result)
        except queue.Empty:
            pass


def log_result(result):
    serializable = dict(result)
    for key, value in serializable.items():
        if isinstance(value, float) and not np.isfinite(value):
            serializable[key] = None
    telemetry_log.info(json.dumps(serializable, separators=(",", ":"), allow_nan=False))


@app.route("/ingest", methods=["POST"])
def ingest():
    payload = request.get_json(force=True, silent=True)
    if not payload or "device" not in payload:
        return jsonify({"error": "JSON body with a 'device' field is required"}), 400

    device = str(payload["device"])
    raw = normalize_incoming(payload)

    with node_lock:
        stream = node_streams.setdefault(device, NodeStream())
        violations = check_plausibility(raw)
        corroboration = stream.corroboration_count(raw, violations)
        feats = stream.push(raw)

    t0 = time.perf_counter()
    with model_lock:
        x = np.asarray([[feats.get(c, 0.0) for c in feature_cols]], dtype=np.float64)
        x_s = scaler.transform(x)
        proba = clf.predict_proba(x_s)[0]
        pred = clf.classes_[int(np.argmax(proba))]
        anomaly = bool(iso.predict(x_s)[0] == -1)
    gated = gated_decision(pred, proba.max(), anomaly, violations, corroboration)
    latency_ms = (time.perf_counter() - t0) * 1000

    with node_lock:
        status_counts[gated] += 1
        recent_log.append((device, gated, round(float(proba.max()), 2)))
        live_readings.append({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "device": device,
            "risk": gated,
            "raw_prediction": str(pred),
            "confidence": round(float(proba.max()), 3),
            "latency_ms": round(latency_ms, 2),
        })
        counts_snapshot = dict(status_counts)

    result = {
        "device": device,
        "risk": gated,
        "raw_prediction": str(pred),
        "confidence": round(float(proba.max()), 3),
        "is_anomaly": anomaly,
        "latency_ms": round(latency_ms, 2),
        **{key: value for key, value in raw.items() if key != "device"},
    }
    logger.info(
        "device=%s risk=%s raw_prediction=%s confidence=%.3f anomaly=%s latency_ms=%.1f",
        device, gated, pred, proba.max(), anomaly, latency_ms,
    )
    log_result(result)
    queue_dashboard_result(result)
    return jsonify(result)


@app.route("/status", methods=["GET"])
def status():
    with node_lock:
        return jsonify({
            "known_devices": list(node_streams.keys()),
            "status_counts": dict(status_counts),
            "recent": [{"device": d, "risk": r, "confidence": c} for d, r, c in recent_log],
        })


@app.route("/", methods=["GET"])
def index():
    return jsonify({"status": "running", "endpoints": ["/ingest (POST)", "/status (GET)"]})


@app.route("/api/live", methods=["GET"])
def live():
    with node_lock:
        return jsonify({
            "status_counts": {label: status_counts.get(label, 0) for label in LABELS_ORDER},
            "readings": list(live_readings),
            "known_devices": list(node_streams.keys()),
        })


def main():
    global clf, iso, scaler, feature_cols, forward_thread, DASHBOARD_URL
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=5000)
    parser.add_argument(
        "--dashboard-url",
        default=DASHBOARD_URL,
        help="Dashboard POST URL; can also be set with DASHBOARD_URL",
    )
    args = parser.parse_args()
    DASHBOARD_URL = args.dashboard_url.strip()

    logger.info("Loading model artifacts")
    clf = joblib.load(MODEL_FILES["clf"])
    iso = joblib.load(MODEL_FILES["iso"])
    scaler = joblib.load(MODEL_FILES["scaler"])
    feature_cols = joblib.load(MODEL_FILES["feature_cols"])
    logger.info("Loaded %s model features", len(feature_cols))
    if DASHBOARD_URL:
        forward_thread = threading.Thread(target=forward_worker, name="dashboard-forwarder", daemon=True)
        forward_thread.start()
        logger.info("Dashboard forwarding enabled: %s", DASHBOARD_URL)
    else:
        logger.info("Dashboard forwarding disabled; set DASHBOARD_URL to enable it")
    logger.info("Listening on 0.0.0.0:%s", args.port)
    atexit.register(forward_stop.set)
    app.run(host="0.0.0.0", port=args.port, threaded=True)


if __name__ == "__main__":
    main()
