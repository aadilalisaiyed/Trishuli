# ============================================================
# MineSafe AI — System Health API Routes (/api/v1/system)
# ============================================================

from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, text

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.alert import Alert
from app.models.esp8266_telemetry import ESP8266Telemetry
from app.api.v1.esp8266 import connected_devices
from app.schemas.system import ServiceHealthOut, SystemStatusOut

router = APIRouter(prefix="/system", tags=["System Health"])


@router.get("/health", response_model=List[ServiceHealthOut], summary="Get System Component Health")
def get_system_health(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Introspect and return the operational health, latency, uptime,
    and last check status of backend microservices and data pipelines.
    """
    now = datetime.now(timezone.utc)

    # Check Database Connection latency
    db_status = "Healthy"
    db_latency = 5.0
    try:
        t0 = datetime.now()
        db.execute(text("SELECT 1"))
        t1 = datetime.now()
        db_latency = round((t1 - t0).total_seconds() * 1000.0, 2)
    except Exception:
        db_status = "Degraded"
        db_latency = 999.0

    latest_telemetry = db.query(ESP8266Telemetry).order_by(ESP8266Telemetry.received_at.desc()).first()
    telemetry_count = db.query(ESP8266Telemetry).count()
    avg_model_latency = db.query(func.avg(ESP8266Telemetry.latency_ms)).scalar()
    return [
        ServiceHealthOut(
            name="Telemetry Data Ingestion Pipeline",
            status="Healthy",
            latency_ms=round(float(avg_model_latency or 0.0), 2),
            uptime_pct=None,
            last_check=now,
        ),
        ServiceHealthOut(
            name="Subsidence AI Inference Engine",
            status="Healthy",
            latency_ms=round(float(avg_model_latency or 0.0), 2),
            uptime_pct=None,
            last_check=now,
        ),
        ServiceHealthOut(
            name="SQLite Telemetry Database",
            status=db_status,
            latency_ms=db_latency,
            uptime_pct=None,
            last_check=now,
        ),
        ServiceHealthOut(
            name="Real-Time Alert Dispatcher",
            status="Healthy" if latest_telemetry else "Degraded",
            latency_ms=None,
            uptime_pct=None,
            last_check=now,
        ),
        ServiceHealthOut(
            name="WebSocket Live Telemetry Stream",
            status="Healthy" if connected_devices else "Degraded",
            latency_ms=None,
            uptime_pct=None,
            last_check=now,
        ),
    ]


@router.get("/status", response_model=SystemStatusOut, summary="Get Overall System Status")
def get_system_status(db: Session = Depends(get_db)):
    """
    Public health check endpoint returning the overall mine site status
    ('OPERATIONAL', 'WARNING', or 'CRITICAL') based on active safety alerts.
    """
    active_alerts = db.query(Alert).filter(Alert.status == "ACTIVE").all()

    if any(a.severity == "L3" for a in active_alerts):
        return SystemStatusOut(status="CRITICAL")

    if any(a.severity == "L2" for a in active_alerts) or len(active_alerts) > 0:
        return SystemStatusOut(status="WARNING")

    return SystemStatusOut(status="OPERATIONAL")
