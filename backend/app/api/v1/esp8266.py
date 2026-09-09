from collections import deque
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
import time
from typing import Dict, List

import joblib
import numpy as np
from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.esp8266_telemetry import ESP8266Telemetry
from app.models.node import Node


class ESP8266Assessment(BaseModel):
    """Assessment already produced by the Raspberry Pi's ML pipeline."""
    model_config = ConfigDict(extra="allow")

    device: str
    risk: str
    raw_prediction: str
    confidence: float = Field(..., ge=0, le=1)
    is_anomaly: bool
    latency_ms: float
    received_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    data_source: str = "LIVE HARDWARE"
    class_probabilities: Dict[str, float] = {}
    base_features: Dict[str, float] = {}
    rolling_features: Dict[str, float] = {}
    model_internals: Dict[str, object] = {}
    plausibility_violations: List[str] = []
    corroboration_count: int = 0
    gate_branch: str = ""
    gate_trace: str = ""


class ESP8266RawReading(BaseModel):
    """Raw sensor payload accepted from an ESP8266 or Raspberry Pi."""
    model_config = ConfigDict(extra="allow")

    device: str
    tilt_deg: float | None = None
    accel_rms: float | None = None
    load_delta_kg: float | None = None
    distance_cm: float | None = None
    moisture: float | None = Field(default=None, ge=0, le=1)
    soil_raw: int | None = Field(default=None, ge=0, le=4095)
    rain_raw: int | None = Field(default=None, ge=0, le=4095)
    strain_mm_per_m: float | None = None
    curvature: float | None = None
    ir_detected: bool | None = None
    timestamp_ms: int | None = None
    load_kg: float | None = None
    moisture_raw: int | None = Field(default=None, ge=0, le=4095)
    ir_state: int | None = None
    imu: dict[str, float] | None = None
    source: str | None = None


router = APIRouter(prefix="/esp8266", tags=["ESP8266 Telemetry"])
latest_readings: Dict[str, ESP8266Assessment] = {}
reading_history: Dict[str, deque] = {}
last_ingest_monotonic: Dict[str, float] = {}
ingest_counts: Dict[str, int] = {}
streams: Dict[str, Dict[str, deque]] = {}
model_lock = Lock()
model_bundle = None
previous_values: Dict[str, Dict[str, float]] = {}

WINDOW = 6
BASE_FEATURES = [
    "tilt_deg", "accel_rms", "load_delta_kg", "distance_cm",
    "moisture", "strain_mm_per_m", "curvature",
]
MODEL_DIR = Path(__file__).resolve().parents[4] / "ML"


def _load_models():
    global model_bundle
    if model_bundle is None:
        with model_lock:
            if model_bundle is None:
                model_bundle = (
                    joblib.load(MODEL_DIR / "risk_classifier_v3.joblib"),
                    joblib.load(MODEL_DIR / "anomaly_model_v3.joblib"),
                    joblib.load(MODEL_DIR / "feature_scaler_v3.joblib"),
                    joblib.load(MODEL_DIR / "feature_cols_v3.joblib"),
                )
    return model_bundle


def _number(value, default):
    if value is None or not np.isfinite(float(value)):
        return default
    return float(value)


def _normalize_hardware_payload(raw: dict) -> dict:
    """Map the current ESP firmware payload into model feature names."""
    imu = raw.get("imu") or {}
    ax = _number(imu.get("ax"), 0.0)
    ay = _number(imu.get("ay"), 0.0)
    az = _number(imu.get("az"), 0.0)

    if raw.get("tilt_deg") is None and (ax or ay or az):
        raw["tilt_deg"] = float(np.degrees(np.arctan2(np.hypot(ax, ay), abs(az))))
    if raw.get("accel_rms") is None and (ax or ay or az):
        raw["accel_rms"] = float(np.sqrt((ax * ax + ay * ay + az * az) / 3.0))
    if raw.get("load_delta_kg") is None and raw.get("load_kg") is not None:
        # The firmware uses -1 for an unavailable load-cell reading.
        if raw["load_kg"] >= 0:
            raw["load_delta_kg"] = raw["load_kg"]
    if raw.get("moisture") is None and raw.get("moisture_raw") is not None:
        raw["moisture"] = float(np.clip(raw["moisture_raw"] / 4095.0, 0, 1))
    if raw.get("ir_state") is not None and raw.get("ir_detected") is None:
        # The current active-low IR firmware reports 0 when the beam is broken.
        raw["ir_detected"] = raw["ir_state"] == 0
    return raw


def _plausibility_violations(values: dict) -> list[str]:
    bounds = {
        "tilt_deg": (-15.0, 15.0), "accel_rms": (0.0, 2.0),
        "load_delta_kg": (-150.0, 150.0), "distance_cm": (0.0, 400.0),
        "moisture": (0.0, 1.0), "strain_mm_per_m": (-20.0, 20.0),
        "curvature": (-0.5, 0.5),
    }
    return [
        feature for feature, (low, high) in bounds.items()
        if values.get(feature) is not None and not low <= values[feature] <= high
    ]


def _score_reading(payload: ESP8266RawReading) -> dict:
    clf, anomaly_model, scaler, feature_cols = _load_models()
    raw = _normalize_hardware_payload(payload.model_dump())
    if raw.get("moisture") is None:
        adc_values = [raw.get("soil_raw"), raw.get("rain_raw")]
        adc_values = [value for value in adc_values if value is not None]
        if adc_values:
            raw["moisture"] = float(np.clip(np.mean(adc_values) / 4095.0, 0, 1))

    device_stream = streams.setdefault(
        payload.device,
        {feature: deque(maxlen=WINDOW) for feature in BASE_FEATURES},
    )
    values = {}
    for feature in BASE_FEATURES:
        default = 50.0 if feature == "distance_cm" else 0.0
        value = _number(raw.get(feature), default)
        if feature == "distance_cm" and value <= 0:
            value = device_stream[feature][-1] if device_stream[feature] else default
        device_stream[feature].append(value)
        history = np.asarray(device_stream[feature], dtype=float)
        values[feature] = value
        values[f"{feature}_roll_mean"] = float(history.mean())
        values[f"{feature}_roll_std"] = float(history.std()) if len(history) > 1 else 0.0

    violations = _plausibility_violations(values)
    corroboration_count = sum(
        1 for feature in ("tilt_deg", "load_delta_kg", "distance_cm", "strain_mm_per_m")
        if feature not in violations and len(device_stream[feature]) >= 5
        and abs((values[feature] - float(np.mean(device_stream[feature]))) / (float(np.std(device_stream[feature])) or 1e-6)) > 1.5
    )

    previous = previous_values.get(payload.device, {"tilt_deg": 0.0, "load_delta_kg": 0.0})
    values["ir_detected"] = int(bool(raw.get("ir_detected", False)))
    values["tilt_rate"] = values["tilt_deg"] - previous["tilt_deg"]
    values["load_rate"] = values["load_delta_kg"] - previous["load_delta_kg"]
    previous_values.setdefault(payload.device, {}).update(
        tilt_deg=values["tilt_deg"], load_delta_kg=values["load_delta_kg"]
    )

    features = np.asarray([[values.get(column, 0.0) for column in feature_cols]], dtype=float)
    started = time.perf_counter()
    scaled = scaler.transform(features)
    probabilities = clf.predict_proba(scaled)[0]
    prediction = str(clf.classes_[int(np.argmax(probabilities))])
    confidence = float(np.max(probabilities))
    is_anomaly = bool(anomaly_model.predict(scaled)[0] == -1)
    if violations:
        risk = prediction if corroboration_count >= 2 else "SENSOR_FAULT"
        gate_branch = "violations + corroboration >= 2" if corroboration_count >= 2 else "violations + corroboration < 2 -> SENSOR_FAULT"
    elif is_anomaly and (prediction == "normal" or confidence < 0.6):
        risk = "UNCERTAIN"
        gate_branch = "anomalous-but-called-normal or low-confidence -> UNCERTAIN"
    else:
        risk = prediction
        gate_branch = "no violations and no uncertainty trigger -> raw prediction"
    reasons = []
    if is_anomaly:
        reasons.append("Isolation Forest marked this feature vector as anomalous")
    if confidence < 0.6:
        reasons.append(f"Classifier confidence is low ({confidence:.1%})")
    if values["tilt_deg"] > 5:
        reasons.append(f"Tilt is elevated ({values['tilt_deg']:.2f} deg)")
    if values["distance_cm"] < 10:
        reasons.append(f"Ultrasonic distance is low ({values['distance_cm']:.1f} cm)")
    if values["ir_detected"]:
        reasons.append("IR crack or beam-break sensor is triggered")
    if not reasons:
        reasons.append("No anomaly gate trigger detected")
    latency_ms = (time.perf_counter() - started) * 1000
    return {
        "device": payload.device,
        "risk": risk,
        "raw_prediction": prediction,
        "confidence": round(confidence, 3),
        "is_anomaly": is_anomaly,
        "latency_ms": round(latency_ms, 2),
        "data_source": raw.get("source") or (
            "LIVE HARDWARE" if any(key in raw for key in ("imu", "node_id", "uptime_ms"))
            else "SIMULATED TEST DATA"
        ),
        "class_probabilities": {str(label): round(float(probability), 6) for label, probability in zip(clf.classes_, probabilities)},
        "base_features": {feature: values[feature] for feature in BASE_FEATURES},
        "rolling_features": {key: value for key, value in values.items() if "_roll_" in key},
        "model_internals": {
            "classifier": type(clf).__name__,
            "n_estimators": getattr(clf, "n_estimators", None),
            "max_depth": getattr(clf, "max_depth", None) or "unlimited",
            "feature_count": len(feature_cols),
            "anomaly_model": type(anomaly_model).__name__,
            "anomaly_estimators": getattr(anomaly_model, "n_estimators", None),
        },
        "plausibility_violations": violations,
        "corroboration_count": corroboration_count,
        "gate_branch": gate_branch,
        "gate_trace": f"violations={violations}, corroboration_count={corroboration_count}, is_anomaly={is_anomaly}, raw_pred={prediction} -> {risk}",
        "model": "risk_classifier_v3 + anomaly_model_v3",
        "anomaly_reasons": reasons,
        **{key: value for key, value in raw.items() if key != "device" and value is not None},
    }


class NodeRegisterRequest(BaseModel):
    node_id: str

registered_nodes: set[str] = set()
connected_devices: set[str] = set()


def _record_assessment(payload: ESP8266RawReading, result: ESP8266Assessment, db: Session) -> None:
    raw_payload = payload.model_dump(mode="json", exclude_none=True)
    telemetry = ESP8266Telemetry(
        device=result.device,
        received_at=result.received_at,
        source=result.data_source,
        risk=result.risk,
        raw_prediction=result.raw_prediction,
        confidence=result.confidence,
        is_anomaly=result.is_anomaly,
        latency_ms=result.latency_ms,
        normalized_features=result.base_features,
        rolling_features=result.rolling_features,
        class_probabilities=result.class_probabilities,
        gate_trace=result.gate_trace,
        raw_payload=raw_payload,
    )
    db.add(telemetry)

    node = db.query(Node).filter(Node.id == payload.device).first()
    if node:
        node.last_heartbeat = result.received_at
        node.status = "Online"
    db.commit()


def _store_result(payload: ESP8266RawReading, db: Session) -> ESP8266Assessment:
    result = ESP8266Assessment(**_score_reading(payload))
    now = time.monotonic()
    previous = last_ingest_monotonic.get(payload.device)
    result.received_interval_ms = round((now - previous) * 1000, 1) if previous is not None else None
    result.samples_received = ingest_counts.get(payload.device, 0) + 1
    last_ingest_monotonic[payload.device] = now
    ingest_counts[payload.device] = result.samples_received
    latest_readings[payload.device] = result
    reading_history.setdefault(payload.device, deque(maxlen=60)).append(result)
    _record_assessment(payload, result, db)
    return result


def _assessment_from_row(row: ESP8266Telemetry) -> ESP8266Assessment:
    clf, anomaly_model, _, feature_cols = _load_models()
    raw_payload = row.raw_payload or {}
    normalized_features = row.normalized_features or {}
    ir_detected = raw_payload.get("ir_detected")
    if ir_detected is None and raw_payload.get("ir_state") is not None:
        ir_detected = raw_payload["ir_state"] == 0
    flattened_fields = {
        key: value for key, value in {**raw_payload, **normalized_features, "ir_detected": ir_detected}.items()
        if key != "device" and value is not None
    }
    return ESP8266Assessment(
        device=row.device,
        risk=row.risk,
        raw_prediction=row.raw_prediction,
        confidence=row.confidence,
        is_anomaly=row.is_anomaly,
        latency_ms=row.latency_ms,
        received_at=row.received_at,
        data_source=row.source,
        class_probabilities=row.class_probabilities or {},
        base_features=row.normalized_features or {},
        rolling_features=row.rolling_features or {},
        model_internals={
            "classifier": type(clf).__name__,
            "n_estimators": getattr(clf, "n_estimators", None),
            "max_depth": getattr(clf, "max_depth", None) or "unlimited",
            "feature_count": len(feature_cols),
            "anomaly_model": type(anomaly_model).__name__,
            "anomaly_estimators": getattr(anomaly_model, "n_estimators", None),
        },
        gate_trace=row.gate_trace,
        raw_payload=raw_payload,
        **flattened_fields,
    )

@router.get("/latest", response_model=List[ESP8266Assessment])
def get_latest_readings(db: Session = Depends(get_db)) -> List[ESP8266Assessment]:
    rows = (
        db.query(ESP8266Telemetry)
        .order_by(ESP8266Telemetry.received_at.desc())
        .all()
    )
    latest_by_device = {}
    for row in rows:
        latest_by_device.setdefault(row.device, row)
    return [_assessment_from_row(row) for row in latest_by_device.values()]


@router.post("/latest", response_model=ESP8266Assessment)
def ingest_reading(payload: ESP8266RawReading, db: Session = Depends(get_db)) -> ESP8266Assessment:
    result = _store_result(payload, db)
    return result


@router.websocket("/ws/{device_id}")
async def esp8266_websocket(websocket: WebSocket, device_id: str, db: Session = Depends(get_db)):
    """Persistent ESP ingest socket. Every JSON message is scored and archived."""
    await websocket.accept()
    connected_devices.add(device_id)
    try:
        while True:
            try:
                message = await websocket.receive_json()
                message.setdefault("device", device_id)
                payload = ESP8266RawReading.model_validate(message)
                result = _store_result(payload, db)
                await websocket.send_json({"type": "telemetry_ack", "payload": result.model_dump(mode="json")})
            except WebSocketDisconnect:
                raise
            except Exception as exc:
                db.rollback()
                await websocket.send_json({"type": "telemetry_error", "error": str(exc)})
    except WebSocketDisconnect:
        pass
    except Exception as exc:
        try:
            await websocket.send_json({"type": "telemetry_error", "error": str(exc)})
        except Exception:
            pass
    finally:
        connected_devices.discard(device_id)


@router.get("/status")
def esp8266_status() -> dict:
    return {
        "connected_devices": sorted(connected_devices),
        "connected_count": len(connected_devices),
        "latest_devices": sorted(latest_readings),
    }


@router.get("/history/{device}", response_model=List[ESP8266Assessment])
def get_reading_history(
    device: str,
    limit: int = Query(60, ge=1, le=5000),
    db: Session = Depends(get_db),
) -> List[ESP8266Assessment]:
    """Return persisted assessments for a device, newest samples last."""
    rows = (
        db.query(ESP8266Telemetry)
        .filter(ESP8266Telemetry.device == device)
        .order_by(ESP8266Telemetry.received_at.desc())
        .limit(limit)
        .all()
    )
    return [_assessment_from_row(row) for row in reversed(rows)]


@router.get("/devices")
def get_telemetry_devices(db: Session = Depends(get_db)) -> List[dict]:
    """List every device that has persisted telemetry, including offline devices."""
    rows = db.query(ESP8266Telemetry).order_by(ESP8266Telemetry.received_at.desc()).all()
    devices = {}
    for row in rows:
        item = devices.setdefault(row.device, {
            "device": row.device,
            "source": row.source,
            "samples": 0,
            "first_received_at": row.received_at,
            "last_received_at": row.received_at,
        })
        item["samples"] += 1
        item["first_received_at"] = min(item["first_received_at"], row.received_at)
        item["last_received_at"] = max(item["last_received_at"], row.received_at)
    return list(devices.values())


@router.post("/nodes")
def register_node(payload: NodeRegisterRequest):
    registered_nodes.add(payload.node_id)
    return {"status": "success", "node_id": payload.node_id, "registered_nodes": list(registered_nodes)}