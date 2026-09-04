# ============================================================
# MineSafe AI — Sensor Node & Telemetry API Routes (/api/v1/nodes)
# ============================================================

import uuid
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.websocket import manager
from app.models.node import Node
from app.models.sensor_reading import SensorReading
from app.models.alert import Alert
from app.schemas.node import (
    NodeOut,
    NodeThresholdUpdate,
    SensorReadingCreate,
    SensorReadingOut,
    NodeHistoryResponse,
    TimeSeriesPoint,
    AIRiskAssessmentResponse,
)
from app.schemas.alert import AlertOut
from app.services.ai import calculate_risk_metrics, build_ai_risk_assessment, evaluate_thresholds

router = APIRouter(prefix="/nodes", tags=["Nodes & Telemetry"])


@router.get("/{node_id}", response_model=NodeOut, summary="Get Node Detail")
def get_node_detail(
    node_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Retrieve details for a specific sensor node, including its configuration,
    thresholds, hardware health, and latest reading.
    """
    node = db.query(Node).filter(Node.id == node_id).first()
    if not node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Node with ID '{node_id}' not found.",
        )

    latest = (
        db.query(SensorReading)
        .filter(SensorReading.node_id == node_id)
        .order_by(desc(SensorReading.timestamp))
        .first()
    )

    node_out = NodeOut.model_validate(node)
    if latest:
        node_out.latest_reading = SensorReadingOut.model_validate(latest)

    return node_out


@router.patch("/{node_id}/thresholds", response_model=NodeOut, summary="Update Node Thresholds")
def update_node_thresholds(
    node_id: str,
    payload: NodeThresholdUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Update location-specific risk thresholds for a sensor node.
    """
    node = db.query(Node).filter(Node.id == node_id).first()
    if not node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Node with ID '{node_id}' not found.",
        )

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(node, field, value)

    db.commit()
    db.refresh(node)

    latest = (
        db.query(SensorReading)
        .filter(SensorReading.node_id == node_id)
        .order_by(desc(SensorReading.timestamp))
        .first()
    )
    node_out = NodeOut.model_validate(node)
    if latest:
        node_out.latest_reading = SensorReadingOut.model_validate(latest)

    return node_out


@router.post("/{node_id}/readings", response_model=SensorReadingOut, status_code=status.HTTP_201_CREATED, summary="Ingest Sensor Reading")
async def ingest_sensor_reading(
    node_id: str,
    payload: SensorReadingCreate,
    db: Session = Depends(get_db),
):
    """
    Ingest a new telemetry payload from an ESP32 device or simulation engine.
    Runs the AI risk inference engine, updates node health/heartbeat,
    persists the sensor reading, auto-creates alerts if risk escalates,
    and broadcasts updates to live WebSocket clients.
    """
    node = db.query(Node).filter(Node.id == node_id).first()
    if not node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Node with ID '{node_id}' not found.",
        )

    # Extract reading and threshold dictionaries
    reading_dict = {
        "tilt": payload.tilt,
        "displacement": payload.displacement,
        "vibration": payload.vibration,
        "crack_detected": payload.crack_detected,
        "relative_movement": payload.relative_movement,
    }

    threshold_dict = {
        "thr_tilt": node.thr_tilt,
        "thr_displacement": node.thr_displacement,
        "thr_vibration": node.thr_vibration,
        "thr_crack": node.thr_crack,
        "thr_relative_movement": node.thr_relative_movement,
    }

    # Fetch previous reading to check for risk level escalation
    prev_reading = (
        db.query(SensorReading)
        .filter(SensorReading.node_id == node_id)
        .order_by(desc(SensorReading.timestamp))
        .first()
    )
    prev_risk_level = prev_reading.risk_level if prev_reading else "L0"

    # Run AI inference engine
    ai_metrics = calculate_risk_metrics(reading_dict, threshold_dict)

    now = payload.timestamp or datetime.now(timezone.utc)

    # Build new SensorReading ORM object
    reading = SensorReading(
        node_id=node_id,
        timestamp=now,
        tilt=payload.tilt,
        displacement=payload.displacement,
        vibration=payload.vibration,
        crack_detected=payload.crack_detected,
        relative_movement=payload.relative_movement,
        risk_level=ai_metrics["risk_level"],
        risk_score=ai_metrics["risk_score"],
        ai_confidence=ai_metrics["ai_confidence"],
        predicted_deformation=ai_metrics["predicted_deformation"],
        prediction_horizon=ai_metrics["prediction_horizon"],
        trend=ai_metrics["trend"],
    )
    db.add(reading)

    # Update node hardware health and heartbeat
    if payload.battery is not None:
        node.battery = payload.battery
    if payload.wifi_signal is not None:
        node.wifi_signal = payload.wifi_signal
    if payload.packet_reception is not None:
        node.packet_reception = payload.packet_reception

    node.last_heartbeat = now
    node.status = "Online"

    # Check for risk escalation and auto-create Alert
    new_risk_level = ai_metrics["risk_level"]
    risk_rank = {"L0": 0, "L1": 1, "L2": 2, "L3": 3}
    created_alert: Optional[Alert] = None

    if new_risk_level in ["L1", "L2", "L3"] and risk_rank[new_risk_level] > risk_rank.get(prev_risk_level, 0):
        # Build trigger string
        abnormal_flags = evaluate_thresholds(reading_dict, threshold_dict)
        triggers = []
        if abnormal_flags["tilt"]:
            triggers.append(f"Tilt ({payload.tilt:.2f}° > {node.thr_tilt:.2f}°)")
        if abnormal_flags["displacement"]:
            triggers.append(f"Displacement ({payload.displacement:.1f}mm > {node.thr_displacement:.1f}mm)")
        if abnormal_flags["vibration"]:
            triggers.append(f"Vibration ({payload.vibration:.0f}% > {node.thr_vibration:.0f}%)")
        if abnormal_flags["crack"]:
            triggers.append("Crack Fracture Detected")
        if abnormal_flags["relative_movement"]:
            triggers.append(f"Relative Movement ({payload.relative_movement:.1f}mm > {node.thr_relative_movement:.1f}mm)")

        trigger_text = f"Risk escalated to {new_risk_level}: " + ", ".join(triggers) if triggers else f"Risk escalated to {new_risk_level}"

        alert_id = f"ALT-{int(now.timestamp()) % 1000000:06d}"
        created_alert = Alert(
            id=alert_id,
            severity=new_risk_level,
            node_id=node_id,
            timestamp=now,
            duration=0,
            trigger=trigger_text,
            ai_risk_score=ai_metrics["risk_score"],
            predicted_deformation=ai_metrics["predicted_deformation"],
            status="ACTIVE",
        )
        db.add(created_alert)

    db.commit()
    db.refresh(reading)

    # ── Real-Time WebSocket Telemetry Broadcast ───────────────
    try:
        # Fetch updated nodes for the mine to construct NODE_TICK
        all_nodes = db.query(Node).filter(Node.mine_id == node.mine_id).all()
        node_outs = []
        for n in all_nodes:
            latest_r = (
                db.query(SensorReading)
                .filter(SensorReading.node_id == n.id)
                .order_by(desc(SensorReading.timestamp))
                .first()
            )
            n_out = NodeOut.model_validate(n)
            if latest_r:
                n_out.latest_reading = SensorReadingOut.model_validate(latest_r)
            node_outs.append(n_out.model_dump(mode="json"))

        tick_payload = {
            "type": "NODE_TICK",
            "payload": {"nodes": node_outs},
        }
        await manager.broadcast_to_mine(node.mine_id, tick_payload)

        # If a new alert was generated, broadcast NEW_ALERT
        if created_alert:
            db.refresh(created_alert)
            alert_out = AlertOut.model_validate(created_alert).model_dump(mode="json")
            alert_payload = {
                "type": "NEW_ALERT",
                "payload": {"alert": alert_out},
            }
            await manager.broadcast_to_mine(node.mine_id, alert_payload)

    except Exception as ws_err:
        print(f"[WebSocket Broadcast Warning] Failed to broadcast telemetry update: {ws_err}")

    return reading


@router.get("/{node_id}/history", response_model=NodeHistoryResponse, summary="Get Historical Telemetry")
def get_node_history(
    node_id: str,
    metric: str = Query("all", description="Metric to query (tilt|displacement|vibration|crack|relative_movement|risk_score|predicted_deformation|all)"),
    from_date: Optional[datetime] = Query(None, alias="from"),
    to_date: Optional[datetime] = Query(None, alias="to"),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Retrieve historical time-series telemetry data for a specific sensor node.
    Supports filtering by metric, date range, and result count limit.
    """
    node = db.query(Node).filter(Node.id == node_id).first()
    if not node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Node with ID '{node_id}' not found.",
        )

    query = db.query(SensorReading).filter(SensorReading.node_id == node_id)

    if from_date:
        query = query.filter(SensorReading.timestamp >= from_date)
    if to_date:
        query = query.filter(SensorReading.timestamp <= to_date)

    readings = query.order_by(SensorReading.timestamp.asc()).limit(limit).all()

    tilt_list = []
    disp_list = []
    vib_list = []
    crack_list = []
    rel_list = []
    risk_list = []
    pred_list = []

    for r in readings:
        ts = r.timestamp
        if metric in ["all", "tilt"]:
            tilt_list.append(TimeSeriesPoint(timestamp=ts, value=r.tilt))
        if metric in ["all", "displacement"]:
            disp_list.append(TimeSeriesPoint(timestamp=ts, value=r.displacement))
        if metric in ["all", "vibration"]:
            vib_list.append(TimeSeriesPoint(timestamp=ts, value=r.vibration))
        if metric in ["all", "crack"]:
            crack_list.append(TimeSeriesPoint(timestamp=ts, value=1.0 if r.crack_detected else 0.0))
        if metric in ["all", "relative_movement"]:
            rel_list.append(TimeSeriesPoint(timestamp=ts, value=r.relative_movement))
        if metric in ["all", "risk_score"]:
            risk_list.append(TimeSeriesPoint(timestamp=ts, value=float(r.risk_score)))
        if metric in ["all", "predicted_deformation"]:
            pred_list.append(TimeSeriesPoint(timestamp=ts, value=r.predicted_deformation or 0.0))

    return NodeHistoryResponse(
        node_id=node_id,
        tilt=tilt_list,
        displacement=disp_list,
        vibration=vib_list,
        crack_events=crack_list,
        relative_movement=rel_list,
        risk_score=risk_list,
        predicted_deformation=pred_list,
        actual_deformation=disp_list,  # actual deformation is alias for displacement
    )


@router.get("/{node_id}/ai-assessment", response_model=AIRiskAssessmentResponse, summary="Get AI Risk Assessment")
def get_node_ai_assessment(
    node_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Generate a detailed AI risk assessment for a node based on its latest sensor reading.
    Returns contributing factors, anomaly explanation, and recommended actions.
    """
    node = db.query(Node).filter(Node.id == node_id).first()
    if not node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Node with ID '{node_id}' not found.",
        )

    latest = (
        db.query(SensorReading)
        .filter(SensorReading.node_id == node_id)
        .order_by(desc(SensorReading.timestamp))
        .first()
    )

    if not latest:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No sensor readings recorded for node '{node_id}'.",
        )

    reading_dict = {
        "tilt": latest.tilt,
        "displacement": latest.displacement,
        "vibration": latest.vibration,
        "crack_detected": latest.crack_detected,
        "relative_movement": latest.relative_movement,
    }

    threshold_dict = {
        "thr_tilt": node.thr_tilt,
        "thr_displacement": node.thr_displacement,
        "thr_vibration": node.thr_vibration,
        "thr_crack": node.thr_crack,
        "thr_relative_movement": node.thr_relative_movement,
    }

    assessment = build_ai_risk_assessment(node_id, reading_dict, threshold_dict)
    return AIRiskAssessmentResponse(**assessment)
