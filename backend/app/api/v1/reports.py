# ============================================================
# MineSafe AI — Reports & CSV Export API Routes (/api/v1/reports)
# ============================================================

import io
import csv
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.mine import Mine
from app.models.node import Node
from app.models.sensor_reading import SensorReading
from app.models.alert import Alert
from app.schemas.report import (
    ReportConfig,
    ReportDataOut,
    RiskOverview,
    NodeStatistic,
    AIPredictionStat,
)
from app.schemas.alert import AlertOut

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.post("/generate", response_model=ReportDataOut, summary="Generate Report Preview")
def generate_report(
    config: ReportConfig,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Generate structured report JSON preview based on configurable scope,
    date range, and node selections.
    """
    start_dt = config.date_range.start
    end_dt = config.date_range.end

    # Query nodes in scope
    node_query = db.query(Node)
    if "ALL" not in config.node_scope and len(config.node_scope) > 0:
        node_query = node_query.filter(Node.id.in_(config.node_scope))
    nodes = node_query.all()
    node_ids = [n.id for n in nodes]

    if not node_ids:
        node_ids = ["N01", "N02", "N03"]

    # Query sensor readings within scope
    readings = (
        db.query(SensorReading)
        .filter(
            SensorReading.node_id.in_(node_ids),
            SensorReading.timestamp >= start_dt,
            SensorReading.timestamp <= end_dt,
        )
        .all()
    )

    # Query alerts within scope
    alerts = (
        db.query(Alert)
        .filter(
            Alert.node_id.in_(node_ids),
            Alert.timestamp >= start_dt,
            Alert.timestamp <= end_dt,
        )
        .order_by(desc(Alert.timestamp))
        .all()
    )

    # Calculate Risk Overview
    total_r = len(readings)
    if total_r > 0:
        l0_pct = round((sum(1 for r in readings if r.risk_level == "L0") / total_r) * 100, 1)
        l1_pct = round((sum(1 for r in readings if r.risk_level == "L1") / total_r) * 100, 1)
        l2_pct = round((sum(1 for r in readings if r.risk_level == "L2") / total_r) * 100, 1)
        l3_pct = round((sum(1 for r in readings if r.risk_level == "L3") / total_r) * 100, 1)
    else:
        l0_pct, l1_pct, l2_pct, l3_pct = 100.0, 0.0, 0.0, 0.0

    overall_risk = "LOW"
    if l3_pct > 0 or any(a.severity == "L3" for a in alerts):
        overall_risk = "CRITICAL"
    elif l2_pct > 0 or any(a.severity == "L2" for a in alerts):
        overall_risk = "HIGH"
    elif l1_pct > 0:
        overall_risk = "MODERATE"

    risk_overview = RiskOverview(
        overall_risk=overall_risk,
        l0_percentage=l0_pct,
        l1_percentage=l1_pct,
        l2_percentage=l2_pct,
        l3_percentage=l3_pct,
    )

    # Per-node statistics & AI prediction stats
    node_stats: List[NodeStatistic] = []
    ai_preds: List[AIPredictionStat] = []

    for nid in node_ids:
        n_readings = [r for r in readings if r.node_id == nid]
        if n_readings:
            avg_tilt = round(sum(r.tilt for r in n_readings) / len(n_readings), 2)
            max_disp = round(max(r.displacement for r in n_readings), 1)
            peak_vib = round(max(r.vibration for r in n_readings), 1)
            cracks = sum(1 for r in n_readings if r.crack_detected)
            avg_score = round(sum(r.risk_score for r in n_readings) / len(n_readings), 1)
            avg_acc = round(sum(r.ai_confidence for r in n_readings) / len(n_readings), 1)
            latest_pred = n_readings[-1].predicted_deformation or 0.0
        else:
            avg_tilt, max_disp, peak_vib, cracks, avg_score, avg_acc, latest_pred = (
                0.0, 0.0, 0.0, 0, 0.0, 95.0, 0.0
            )

        node_stats.append(NodeStatistic(
            node_id=nid,
            avg_tilt=avg_tilt,
            max_displacement=max_disp,
            peak_vibration=peak_vib,
            crack_events=cracks,
            avg_risk_score=avg_score,
        ))

        ai_preds.append(AIPredictionStat(
            node_id=nid,
            avg_prediction_accuracy=avg_acc,
            avg_confidence=avg_acc,
            predicted_deformation=latest_pred,
        ))

    summary_text = (
        f"Geotechnical safety report generated for {config.mine}. "
        f"Analyzed {total_r} sensor reading points across {len(node_ids)} nodes "
        f"with {len(alerts)} safety alerts recorded."
    )

    return ReportDataOut(
        config=config,
        generated_at=datetime.now(timezone.utc),
        summary=summary_text,
        risk_overview=risk_overview,
        node_statistics=node_stats,
        alerts=[AlertOut.model_validate(a) for a in alerts],
        ai_predictions=ai_preds,
    )


@router.post("/export/csv", summary="Export Telemetry CSV")
def export_csv(
    config: ReportConfig,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Stream a downloadable CSV file containing telemetry data and alert logs
    for the selected date range and node scope.
    """
    start_dt = config.date_range.start
    end_dt = config.date_range.end

    node_query = db.query(Node)
    if "ALL" not in config.node_scope and len(config.node_scope) > 0:
        node_query = node_query.filter(Node.id.in_(config.node_scope))
    node_ids = [n.id for n in node_query.all()]
    if not node_ids:
        node_ids = ["N01", "N02", "N03"]

    readings = (
        db.query(SensorReading)
        .filter(
            SensorReading.node_id.in_(node_ids),
            SensorReading.timestamp >= start_dt,
            SensorReading.timestamp <= end_dt,
        )
        .order_by(SensorReading.timestamp.asc())
        .all()
    )

    output = io.StringIO()
    writer = csv.writer(output)

    # Write CSV Header
    writer.writerow([
        "Timestamp",
        "Node ID",
        "Tilt (°)",
        "Displacement (mm)",
        "Vibration (%)",
        "Crack Detected",
        "Relative Movement (mm)",
        "Risk Level",
        "Risk Score",
        "AI Confidence (%)",
        "Predicted Deformation (mm)",
        "Trend",
    ])

    # Write CSV Rows
    for r in readings:
        writer.writerow([
            r.timestamp.isoformat() if r.timestamp else "",
            r.node_id,
            r.tilt,
            r.displacement,
            r.vibration,
            "YES" if r.crack_detected else "NO",
            r.relative_movement,
            r.risk_level,
            r.risk_score,
            r.ai_confidence,
            r.predicted_deformation or 0.0,
            r.trend or "Stable",
        ])

    output.seek(0)
    filename = f"minesafe_report_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"
    headers = {"Content-Disposition": f"attachment; filename={filename}"}

    return StreamingResponse(
        io.StringIO(output.getvalue()),
        media_type="text/csv",
        headers=headers,
    )
