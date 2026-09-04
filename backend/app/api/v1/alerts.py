# ============================================================
# MineSafe AI — Alerts API Routes (/api/v1/alerts)
# ============================================================

from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.alert import Alert
from app.models.user import User
from app.schemas.alert import AlertOut, AlertAcknowledgeRequest

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get("", response_model=List[AlertOut], summary="List & Filter Alerts")
def list_alerts(
    severity: Optional[str] = Query(None, description="Severity filter (L1|L2|L3|ALL)"),
    status_filter: Optional[str] = Query(None, alias="status", description="Status filter (ACTIVE|ACKNOWLEDGED|RESOLVED|ALL)"),
    node_id: Optional[str] = Query(None, description="Node ID filter (e.g. N01)"),
    from_date: Optional[datetime] = Query(None, alias="from"),
    to_date: Optional[datetime] = Query(None, alias="to"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve safety alerts with optional filtering by severity, status, node ID, and date range.
    Supports pagination via `limit` and `offset`.
    """
    query = db.query(Alert)

    if severity and severity.upper() != "ALL":
        query = query.filter(Alert.severity == severity.upper())

    if status_filter and status_filter.upper() != "ALL":
        query = query.filter(Alert.status == status_filter.upper())

    if node_id:
        query = query.filter(Alert.node_id == node_id)

    if from_date:
        query = query.filter(Alert.timestamp >= from_date)

    if to_date:
        query = query.filter(Alert.timestamp <= to_date)

    alerts = query.order_by(desc(Alert.timestamp)).offset(offset).limit(limit).all()
    return alerts


@router.get("/{alert_id}", response_model=AlertOut, summary="Get Single Alert")
def get_alert(
    alert_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve details for a specific safety alert by ID."""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert with ID '{alert_id}' not found.",
        )
    return alert


@router.patch("/{alert_id}/acknowledge", response_model=AlertOut, summary="Acknowledge Alert")
def acknowledge_alert(
    alert_id: str,
    payload: Optional[AlertAcknowledgeRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Mark an active alert as ACKNOWLEDGED.
    Records the username of the acknowledger and timestamp.
    """
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert with ID '{alert_id}' not found.",
        )

    acknowledged_by = (
        payload.acknowledged_by if payload and payload.acknowledged_by else current_user.name
    )

    alert.status = "ACKNOWLEDGED"
    alert.acknowledged_at = datetime.now(timezone.utc)
    alert.acknowledged_by = acknowledged_by

    db.commit()
    db.refresh(alert)
    return alert


@router.patch("/{alert_id}/resolve", response_model=AlertOut, summary="Resolve Alert")
def resolve_alert(
    alert_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Mark an alert as RESOLVED once safety conditions normalize.
    """
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert with ID '{alert_id}' not found.",
        )

    now = datetime.now(timezone.utc)
    alert.status = "RESOLVED"
    alert.resolved_at = now

    # Calculate active duration in seconds
    if alert.timestamp:
        alert.duration = int((now - alert.timestamp).total_seconds())

    db.commit()
    db.refresh(alert)
    return alert
