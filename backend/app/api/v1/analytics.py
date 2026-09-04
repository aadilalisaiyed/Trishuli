# ============================================================
# MineSafe AI — Analytics Aggregates API Routes
# ============================================================

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.mine import Mine
from app.models.node import Node
from app.models.sensor_reading import SensorReading
from app.schemas.analytics import AnalyticsSummaryOut, RiskDistributionOut, RiskDistributionItem

router = APIRouter(prefix="/mines", tags=["Analytics"])


@router.get("/{mine_id}/analytics/summary", response_model=AnalyticsSummaryOut, summary="Get Analytics Summary KPI")
def get_analytics_summary(
    mine_id: str,
    from_date: Optional[datetime] = Query(None, alias="from"),
    to_date: Optional[datetime] = Query(None, alias="to"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Calculate summary KPI aggregate statistics (avg tilt, max displacement, peak vibration,
    crack events, avg risk score, AI accuracy) across sensor readings for a mine site.
    """
    mine = db.query(Mine).filter(Mine.id == mine_id).first()
    if not mine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Mine with ID '{mine_id}' not found.",
        )

    # Subquery for node IDs belonging to this mine
    node_ids = [n.id for n in mine.nodes]
    if not node_ids:
        return AnalyticsSummaryOut(
            avg_tilt=0.0,
            max_displacement=0.0,
            peak_vibration=0.0,
            crack_events_total=0,
            avg_risk_score=0.0,
            ai_prediction_accuracy=95.0,
        )

    query = db.query(SensorReading).filter(SensorReading.node_id.in_(node_ids))

    if from_date:
        query = query.filter(SensorReading.timestamp >= from_date)
    if to_date:
        query = query.filter(SensorReading.timestamp <= to_date)

    readings = query.all()
    if not readings:
        return AnalyticsSummaryOut(
            avg_tilt=0.0,
            max_displacement=0.0,
            peak_vibration=0.0,
            crack_events_total=0,
            avg_risk_score=0.0,
            ai_prediction_accuracy=95.0,
        )

    avg_tilt = round(sum(r.tilt for r in readings) / len(readings), 2)
    max_displacement = round(max(r.displacement for r in readings), 1)
    peak_vibration = round(max(r.vibration for r in readings), 1)
    crack_events_total = sum(1 for r in readings if r.crack_detected)
    avg_risk_score = round(sum(r.risk_score for r in readings) / len(readings), 1)
    ai_prediction_accuracy = round(sum(r.ai_confidence for r in readings) / len(readings), 1)

    return AnalyticsSummaryOut(
        avg_tilt=avg_tilt,
        max_displacement=max_displacement,
        peak_vibration=peak_vibration,
        crack_events_total=crack_events_total,
        avg_risk_score=avg_risk_score,
        ai_prediction_accuracy=ai_prediction_accuracy,
    )


@router.get("/{mine_id}/analytics/risk-distribution", response_model=RiskDistributionOut, summary="Get Risk Level Distribution")
def get_risk_distribution(
    mine_id: str,
    from_date: Optional[datetime] = Query(None, alias="from"),
    to_date: Optional[datetime] = Query(None, alias="to"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Calculate the risk level breakdown (L0 Normal, L1 Watch, L2 Warning, L3 Critical)
    as percentages for a mine site.
    """
    mine = db.query(Mine).filter(Mine.id == mine_id).first()
    if not mine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Mine with ID '{mine_id}' not found.",
        )

    node_ids = [n.id for n in mine.nodes]
    if not node_ids:
        return RiskDistributionOut(distribution=[
            RiskDistributionItem(level="L0", percentage=100.0, color="#10B981"),
            RiskDistributionItem(level="L1", percentage=0.0, color="#3B82F6"),
            RiskDistributionItem(level="L2", percentage=0.0, color="#F59E0B"),
            RiskDistributionItem(level="L3", percentage=0.0, color="#EF4444"),
        ])

    query = db.query(SensorReading).filter(SensorReading.node_id.in_(node_ids))
    if from_date:
        query = query.filter(SensorReading.timestamp >= from_date)
    if to_date:
        query = query.filter(SensorReading.timestamp <= to_date)

    readings = query.all()
    total = len(readings)
    if total == 0:
        return RiskDistributionOut(distribution=[
            RiskDistributionItem(level="L0", percentage=100.0, color="#10B981"),
            RiskDistributionItem(level="L1", percentage=0.0, color="#3B82F6"),
            RiskDistributionItem(level="L2", percentage=0.0, color="#F59E0B"),
            RiskDistributionItem(level="L3", percentage=0.0, color="#EF4444"),
        ])

    l0_count = sum(1 for r in readings if r.risk_level == "L0")
    l1_count = sum(1 for r in readings if r.risk_level == "L1")
    l2_count = sum(1 for r in readings if r.risk_level == "L2")
    l3_count = sum(1 for r in readings if r.risk_level == "L3")

    return RiskDistributionOut(distribution=[
        RiskDistributionItem(level="L0", percentage=round((l0_count / total) * 100.0, 1), color="#10B981"),
        RiskDistributionItem(level="L1", percentage=round((l1_count / total) * 100.0, 1), color="#3B82F6"),
        RiskDistributionItem(level="L2", percentage=round((l2_count / total) * 100.0, 1), color="#F59E0B"),
        RiskDistributionItem(level="L3", percentage=round((l3_count / total) * 100.0, 1), color="#EF4444"),
    ])
