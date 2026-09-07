"""
SIH26025 — Model Training v3
================================
Improvements over v2:
  1. 50 nodes total, 10 held out for testing (20%, was 2/10 = 20% but from
     only 10 nodes -> now statistically stable since it's 10 diverse
     geometries instead of 2).
  2. Adds strain_mm_per_m and curvature as features (from v3 dataset) --
     physically these are what actually damages structures/supports,
     independent of raw subsidence magnitude.
  3. RandomizedSearchCV with 5-fold cross-validation over ~40 hyperparameter
     combinations for the Random Forest -- genuine search, not padding.
     This is what legitimately takes real compute time: it's training and
     validating roughly 40 x 5 = 200 model fits internally.

Run: python train_model_v3.py
Outputs: anomaly_model_v3.joblib, risk_classifier_v3.joblib,
         feature_scaler_v3.joblib, cv_results_v3.csv
"""

import json
import time
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import RandomizedSearchCV, StratifiedKFold
from sklearn.metrics import classification_report, confusion_matrix
import joblib

RANDOM_SEED = 42
DATA_PATH = "subsidence_dataset_v3.jsonl"
WINDOW = 6
TEST_FRACTION_NODES = 0.20


def load_dataset(path):
    rows = []
    with open(path) as f:
        for line in f:
            rows.append(json.loads(line))
    return pd.DataFrame(rows)


def clean(df):
    df = df.copy()
    df.loc[df["distance_cm"] <= 0, "distance_cm"] = np.nan
    df["accel_rms"] = pd.to_numeric(df["accel_rms"], errors="coerce")
    df = df.sort_values(["device", "timestamp_ms"])
    df[["distance_cm", "accel_rms"]] = (
        df.groupby("device")[["distance_cm", "accel_rms"]].ffill().bfill()
    )
    return df


def add_rolling_features(df):
    df = df.copy()
    base = ["tilt_deg", "accel_rms", "load_delta_kg", "distance_cm",
             "moisture", "strain_mm_per_m", "curvature"]
    grouped = df.groupby("device")
    for col in base:
        df[f"{col}_roll_mean"] = grouped[col].transform(
            lambda s: s.rolling(WINDOW, min_periods=1).mean())
        df[f"{col}_roll_std"] = grouped[col].transform(
            lambda s: s.rolling(WINDOW, min_periods=1).std().fillna(0))
    df["tilt_rate"] = grouped["tilt_deg"].transform(lambda s: s.diff().fillna(0))
    df["load_rate"] = grouped["load_delta_kg"].transform(lambda s: s.diff().fillna(0))
    df["ir_detected"] = df["ir_detected"].astype(int)
    return df


def main():
    t_start = time.time()
    print("Loading dataset...")
    df = load_dataset(DATA_PATH)
    all_nodes = sorted(df["device"].unique())
    print(f"Loaded {len(df)} rows across {len(all_nodes)} nodes.\n")

    df = clean(df)
    df = add_rolling_features(df)

    feature_cols = [
        "tilt_deg", "accel_rms", "load_delta_kg", "distance_cm", "moisture",
        "strain_mm_per_m", "curvature", "ir_detected",
        "tilt_deg_roll_mean", "tilt_deg_roll_std",
        "accel_rms_roll_mean", "accel_rms_roll_std",
        "load_delta_kg_roll_mean", "load_delta_kg_roll_std",
        "distance_cm_roll_mean", "distance_cm_roll_std",
        "moisture_roll_mean", "moisture_roll_std",
        "strain_mm_per_m_roll_mean", "strain_mm_per_m_roll_std",
        "curvature_roll_mean", "curvature_roll_std",
        "tilt_rate", "load_rate",
    ]

    rng = np.random.default_rng(RANDOM_SEED)
    n_test = max(1, int(len(all_nodes) * TEST_FRACTION_NODES))
    test_nodes = set(rng.choice(all_nodes, size=n_test, replace=False))
    train_df = df[~df["device"].isin(test_nodes)]
    test_df = df[df["device"].isin(test_nodes)]
    print(f"Train nodes: {len(all_nodes) - n_test}  |  Test nodes (held out): {n_test}")
    print(f"Train rows: {len(train_df)}  |  Test rows: {len(test_df)}\n")

    X_train = train_df[feature_cols].values
    y_train = train_df["risk_label"].values
    X_test = test_df[feature_cols].values
    y_test = test_df["risk_label"].values

    scaler = StandardScaler().fit(X_train)
    X_train_s = scaler.transform(X_train)
    X_test_s = scaler.transform(X_test)

    # --- Stage 1: Isolation Forest ---
    normal_mask = (y_train == "normal")
    iso = IsolationForest(n_estimators=200, contamination=0.05, random_state=RANDOM_SEED)
    iso.fit(X_train_s[normal_mask])
    anomaly_pred = iso.predict(X_test_s)
    is_actually_normal = (y_test == "normal")
    flagged = (anomaly_pred == -1)
    print("=== Stage 1: Isolation Forest ===")
    print(f"  Recall on true non-normal: {(flagged[~is_actually_normal]).mean():.3f}")
    print(f"  False positive rate: {(flagged[is_actually_normal]).mean():.3f}\n")

    # --- Stage 2: Random Forest with real cross-validated hyperparameter search ---
    print("=== Stage 2: RandomizedSearchCV (5-fold CV, this is the part that takes real time) ===")
    param_dist = {
        "n_estimators": [100, 150, 200, 300, 400],
        "max_depth": [6, 8, 10, 12, 16, None],
        "min_samples_split": [2, 4, 6, 10],
        "min_samples_leaf": [1, 2, 4, 6],
        "max_features": ["sqrt", "log2", 0.5, 0.7],
        "class_weight": ["balanced", "balanced_subsample"],
    }
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_SEED)
    search = RandomizedSearchCV(
        RandomForestClassifier(random_state=RANDOM_SEED),
        param_distributions=param_dist,
        n_iter=40,          # 40 combinations x 5 folds = 200 model fits
        cv=cv,
        scoring="f1_macro",  # macro F1 -- forces the search to value rare classes too
        n_jobs=-1,
        random_state=RANDOM_SEED,
        verbose=1,
    )
    search.fit(X_train_s, y_train)
    clf = search.best_estimator_
    print(f"\nBest params: {search.best_params_}")
    print(f"Best CV macro-F1: {search.best_score_:.3f}\n")

    pd.DataFrame(search.cv_results_).sort_values("rank_test_score").to_csv(
        "cv_results_v3.csv", index=False
    )

    y_pred = clf.predict(X_test_s)
    print("=== Held-out test performance (10 unseen mine geometries) ===")
    print(classification_report(y_test, y_pred, digits=3))
    labels_order = ["normal", "watch", "warning", "critical"]
    cm = confusion_matrix(y_test, y_pred, labels=labels_order)
    print("Confusion matrix (rows=actual, cols=predicted):")
    print(pd.DataFrame(cm, index=labels_order, columns=labels_order))

    importances = sorted(zip(feature_cols, clf.feature_importances_), key=lambda x: -x[1])
    print("\nTop features:")
    for name, val in importances[:10]:
        print(f"  {name}: {val:.3f}")

    joblib.dump(iso, "anomaly_model_v3.joblib")
    joblib.dump(clf, "risk_classifier_v3.joblib")
    joblib.dump(scaler, "feature_scaler_v3.joblib")
    joblib.dump(feature_cols, "feature_cols_v3.joblib")

    print(f"\nTotal wall time: {time.time() - t_start:.1f}s")
    print("Saved: anomaly_model_v3.joblib, risk_classifier_v3.joblib, "
          "feature_scaler_v3.joblib, feature_cols_v3.joblib, cv_results_v3.csv")


if __name__ == "__main__":
    main()
