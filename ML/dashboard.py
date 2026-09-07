"""
SIH26025 — Interactive Model Monitoring Dashboard
======================================================
Live dashboard for stress-testing the trained subsidence model, with
editable robustness thresholds so you can see, in real time, the tradeoff
between "catches sensor faults" and "suppresses real critical alerts".

Run:
    pip install streamlit
    streamlit run dashboard.py

Then open the local URL it prints (usually http://localhost:8501).
"""

import time
import numpy as np
import pandas as pd
import joblib
import streamlit as st

from stress_test_model import (
    NodeStream, scenario_in_distribution, scenario_out_of_distribution,
    scenario_pure_random_noise, scenario_sensor_failure, MODEL_FILES,
    check_plausibility, gated_decision,
)

st.set_page_config(page_title="Mine Subsidence Model Monitor", layout="wide")
st.title("Mine Subsidence Model — Live Stress Test Dashboard")

# ============================================================
# Sidebar — controls (the "check and edit" part)
# ============================================================
st.sidebar.header("Test configuration")
scenario_label = st.sidebar.selectbox(
    "Scenario",
    ["in_distribution", "out_of_distribution_geometry", "pure_random_noise", "sensor_failure_extreme"],
)
n_ticks = st.sidebar.slider("Number of ticks", 100, 5000, 1000, step=100)
delay_ms = st.sidebar.slider("Delay per tick (ms) — 0 = as fast as possible", 0, 100, 10)
update_every = st.sidebar.slider("Redraw charts every N ticks", 1, 50, 10)

st.sidebar.header("Robustness gate — editable plausibility bounds")
st.sidebar.caption("If a raw reading falls outside these bounds, the system "
                    "reports SENSOR_FAULT instead of trusting the ML output. "
                    "Tighten to catch more faults; loosen if real severe "
                    "events are getting wrongly suppressed (watch the chart).")
tilt_bound = st.sidebar.slider("Max |tilt_deg|", 5.0, 60.0, 15.0)
accel_bound = st.sidebar.slider("Max accel_rms (g)", 0.5, 10.0, 2.0)
load_bound = st.sidebar.slider("Max |load_delta_kg|", 50.0, 1000.0, 150.0)
distance_bound = st.sidebar.slider("Max distance_cm", 50.0, 500.0, 400.0)
strain_bound = st.sidebar.slider("Max |strain_mm_per_m|", 5.0, 100.0, 20.0)
uncertain_conf_threshold = st.sidebar.slider(
    "Min confidence to trust an anomaly-flagged prediction", 0.3, 0.95, 0.6)
min_corroboration = st.sidebar.slider(
    "Correlated sensors needed to trust an extreme reading as real (not a glitch)",
    1, 4, 2,
    help="If a reading breaks a bound above but this many OTHER correlated "
         "sensors (tilt/load/distance/strain) are ALSO moving significantly, "
         "treat it as a real extreme event instead of a sensor fault.")

bounds = {
    "tilt_deg": (-tilt_bound, tilt_bound),
    "accel_rms": (0.0, accel_bound),
    "load_delta_kg": (-load_bound, load_bound),
    "distance_cm": (0.0, distance_bound),
    "moisture": (0.0, 1.0),
    "strain_mm_per_m": (-strain_bound, strain_bound),
    "curvature": (-0.5, 0.5),
}

run_button = st.sidebar.button("▶ Start / Restart stress test", type="primary")

SCENARIOS = {
    "in_distribution": scenario_in_distribution,
    "out_of_distribution_geometry": scenario_out_of_distribution,
    "pure_random_noise": scenario_pure_random_noise,
    "sensor_failure_extreme": scenario_sensor_failure,
}


@st.cache_resource
def load_models():
    clf = joblib.load(MODEL_FILES["clf"])
    iso = joblib.load(MODEL_FILES["iso"])
    scaler = joblib.load(MODEL_FILES["scaler"])
    feature_cols = joblib.load(MODEL_FILES["feature_cols"])
    return clf, iso, scaler, feature_cols


# ============================================================
# Layout placeholders
# ============================================================
col1, col2 = st.columns(2)
with col1:
    st.subheader("Rolling accuracy & confidence")
    acc_chart_ph = st.empty()
with col2:
    st.subheader("Gated status distribution (live)")
    status_bar_ph = st.empty()

col3, col4 = st.columns(2)
with col3:
    st.subheader("Inference latency per tick (ms)")
    latency_chart_ph = st.empty()
with col4:
    st.subheader("Live metrics")
    metrics_ph = st.empty()

st.subheader("Final confusion matrix (actual vs. raw classifier prediction)")
confusion_ph = st.empty()

st.subheader("Recent ticks (last 15)")
table_ph = st.empty()


# ============================================================
# Run
# ============================================================
if run_button:
    try:
        clf, iso, scaler, feature_cols = load_models()
    except FileNotFoundError as e:
        st.error(f"Could not load model artifacts: {e}\n\n"
                 f"Make sure risk_classifier_v3.joblib, anomaly_model_v3.joblib, "
                 f"feature_scaler_v3.joblib, feature_cols_v3.joblib are in this folder.")
        st.stop()

    stream = NodeStream()
    gen = SCENARIOS[scenario_label](n_ticks)

    rows = []  # per-tick log for the recent-ticks table
    acc_history = []  # (tick, rolling_accuracy, mean_confidence)
    correct_count, labeled_count = 0, 0
    status_counts = {"normal": 0, "watch": 0, "warning": 0, "critical": 0,
                       "SENSOR_FAULT": 0, "UNCERTAIN": 0}
    confusion = {}
    fault_count = 0

    for i, (raw, true_label) in enumerate(gen):
        violations = check_plausibility(raw, bounds)
        corroboration = stream.corroboration_count(raw, violations)
        feats = stream.push(raw)
        x = np.array([[feats.get(c, 0.0) for c in feature_cols]])
        t0 = time.perf_counter()
        x_s = scaler.transform(x)
        proba = clf.predict_proba(x_s)[0]
        pred = clf.classes_[np.argmax(proba)]
        anomaly = iso.predict(x_s)[0] == -1
        gated = gated_decision(pred, proba.max(), anomaly, violations, corroboration, min_corroboration)
        latency_ms = (time.perf_counter() - t0) * 1000

        status_counts[gated] = status_counts.get(gated, 0) + 1
        if gated in ("SENSOR_FAULT", "UNCERTAIN"):
            fault_count += 1
        if true_label is not None:
            labeled_count += 1
            if pred == true_label:
                correct_count += 1
            confusion.setdefault(true_label, {}).setdefault(pred, 0)
            confusion[true_label][pred] += 1

        rows.append({
            "tick": i, "pred": pred, "gated": gated, "confidence": round(proba.max(), 2),
            "anomaly": anomaly, "true_label": true_label or "-", "latency_ms": round(latency_ms, 2),
        })
        acc_history.append({
            "tick": i,
            "rolling_accuracy": (correct_count / labeled_count) if labeled_count else np.nan,
            "confidence": proba.max(),
            "latency_ms": latency_ms,
        })

        if i % update_every == 0 or i == n_ticks - 1:
            hist_df = pd.DataFrame(acc_history)
            acc_chart_ph.line_chart(hist_df.set_index("tick")[["rolling_accuracy", "confidence"]])
            latency_chart_ph.line_chart(hist_df.set_index("tick")[["latency_ms"]])
            status_bar_ph.bar_chart(pd.Series(status_counts))
            with metrics_ph.container():
                m1, m2, m3 = st.columns(3)
                m1.metric("Tick", f"{i}/{n_ticks}")
                m2.metric("Fault/Uncertain rate", f"{100*fault_count/(i+1):.1f}%")
                if labeled_count:
                    m3.metric("Rolling accuracy", f"{100*correct_count/labeled_count:.1f}%")
                else:
                    m3.metric("Rolling accuracy", "n/a (no ground truth)")
            table_ph.dataframe(pd.DataFrame(rows[-15:]), use_container_width=True)

        if delay_ms:
            time.sleep(delay_ms / 1000)

    if confusion:
        labels_order = ["normal", "watch", "warning", "critical"]
        cm = pd.DataFrame(0, index=labels_order, columns=labels_order)
        for actual, preds in confusion.items():
            for predicted, cnt in preds.items():
                cm.loc[actual, predicted] = cnt
        confusion_ph.dataframe(cm.style.background_gradient(cmap="Blues", axis=1),
                                 use_container_width=True)
    else:
        confusion_ph.info("No ground truth available for this scenario "
                            "(pure_random_noise has none by design).")

    st.success(f"Run complete: {n_ticks} ticks, "
               f"{100*fault_count/n_ticks:.1f}% flagged SENSOR_FAULT/UNCERTAIN by the robustness gate.")
else:
    st.info("Configure a scenario and thresholds in the sidebar, then click "
            "**Start / Restart stress test**.")
