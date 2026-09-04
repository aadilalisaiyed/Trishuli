# ============================================================
# MineSafe AI — Pydantic Schemas (Request / Response models)
# ============================================================
# Mirrors the TypeScript types in src/types/index.ts exactly.

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional, Literal

from pydantic import BaseModel, Field, ConfigDict


# ── Shared config ────────────────────────────────────────────
class OrmBase(BaseModel):
    """Base with ORM mode enabled — all response schemas inherit this."""
    model_config = ConfigDict(from_attributes=True)


# ============================================================
# AUTH
# ============================================================

class LoginRequest(BaseModel):
    username: str
    password: str


class UserOut(OrmBase):
    id: uuid.UUID
    username: str
    name: str
    role: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ============================================================
# MINE
# ============================================================

class MineOut(OrmBase):
    id: str
    name: str
    location: str
    latitude: float
    longitude: float
    boundary: list
    created_at: datetime


# ============================================================
# NODE / SENSOR
# ============================================================

class NodeThresholdsOut(OrmBase):
    thr_tilt: float
    thr_displacement: float
    thr_vibration: float
    thr_crack: bool
    thr_relative_movement: float


class NodeThresholdsUpdate(BaseModel):
    """PATCH /nodes/{node_id}/thresholds request body."""
    thr_tilt: Optional[float] = None
    thr_displacement: Optional[float] = None
    thr_vibration: Optional[float] = None
    thr_crack: Optional[bool] = None
    thr_relative_movement: Optional[float] = None


class LatestReadingOut(OrmBase):
    """Flat latest sensor reading embedded in NodeOut."""
    tilt: float
    displacement: float
    vibration: float
    crack_detected: bool
    relative_movement: float
    risk_level: str
    risk_score: int
    ai_confidence: int
    predicted_deformation: Optional[float]
    prediction_horizon: Optional[int]
    trend: Optional[str]
    timestamp: datetime


class NodeOut(OrmBase):
    """
    Full node response — node metadata + latest reading fields flattened.
    Mirrors the TypeScript `NodeData` interface.
    """
    id: str
    mine_id: str
    name: str
    latitude: float
    longitude: float

    # Thresholds
    thr_tilt: float
    thr_displacement: float
    thr_vibration: float
    thr_crack: bool
    thr_relative_movement: float

    # Hardware health
    battery: Optional[float]
    wifi_signal: Optional[float]
    packet_reception: Optional[float]
    status: str
    last_heartbeat: Optional[datetime]

    # Latest reading (None if no readings yet)
    latest_reading: Optional[LatestReadingOut] = None


# ── Ingest reading from ESP32 device ─────────────────────────
class SensorReadingCreate(BaseModel):
    """POST /nodes/{node_id}/readings request body — sent by ESP32 or IoT gateway."""
    tilt: float = Field(..., ge=0, description="Tilt angle in degrees")
    displacement: float = Field(..., ge=0, description="Surface displacement in mm")
    vibration: float = Field(..., ge=0, le=100, description="Vibration intensity 0-100%")
    crack_detected: bool = Field(default=False)
    relative_movement: float = Field(..., ge=0, description="Relative movement in mm")
    battery: Optional[float] = Field(default=None, ge=0, le=100)
    wifi_signal: Optional[float] = Field(default=None, description="Signal strength in dBm (negative)")
    packet_reception: Optional[float] = Field(default=None, ge=0, le=100)
    timestamp: Optional[datetime] = None   # If None, server uses NOW()


class SensorReadingOut(OrmBase):
    id: int
    node_id: str
    timestamp: datetime
    tilt: float
    displacement: float
    vibration: float
    crack_detected: bool
    relative_movement: float
    risk_level: str
    risk_score: int
    ai_confidence: int
    predicted_deformation: Optional[float]
    prediction_horizon: Optional[int]
    trend: Optional[str]


# ── Time-series history ───────────────────────────────────────
class TimeSeriesPoint(BaseModel):
    timestamp: datetime
    value: float


class NodeHistoryOut(BaseModel):
    node_id: str
    tilt: list[TimeSeriesPoint] = []
    displacement: list[TimeSeriesPoint] = []
    vibration: list[TimeSeriesPoint] = []
    crack_events: list[TimeSeriesPoint] = []
    relative_movement: list[TimeSeriesPoint] = []
    risk_score: list[TimeSeriesPoint] = []
    predicted_deformation: list[TimeSeriesPoint] = []
    actual_deformation: list[TimeSeriesPoint] = []   # alias for displacement


# ============================================================
# ALERTS
# ============================================================

class AlertOut(OrmBase):
    id: str
    severity: str
    node_id: str
    timestamp: datetime
    duration: int
    trigger: str
    ai_risk_score: int
    predicted_deformation: float
    status: str
    acknowledged_at: Optional[datetime]
    acknowledged_by: Optional[str]
    resolved_at: Optional[datetime]


class AlertCreate(BaseModel):
    """POST /alerts internal body."""
    severity: Literal["L1", "L2", "L3"]
    node_id: str
    trigger: str
    ai_risk_score: int
    predicted_deformation: float


class AlertAcknowledgeRequest(BaseModel):
    acknowledged_by: Optional[str] = None


# ============================================================
# NOTIFICATIONS
# ============================================================

class NotificationOut(OrmBase):
    id: uuid.UUID
    user_id: uuid.UUID
    type: str
    title: str
    message: str
    timestamp: datetime
    read: bool
    node_id: Optional[str]
    alert_id: Optional[str]


# ============================================================
# AI ASSESSMENT
# ============================================================

class ContributingFactor(BaseModel):
    indicator: str
    status: Literal["normal", "abnormal"]
    description: str
    value: str
    threshold: str


class AIRiskAssessmentOut(BaseModel):
    node_id: str
    risk_score: int
    confidence: int
    predicted_deformation: float
    prediction_horizon: int
    trend: str
    contributing_factors: list[ContributingFactor]
    recommended_actions: list[str]
    explanation: str


# ============================================================
# ANALYTICS
# ============================================================

class AnalyticsSummaryOut(BaseModel):
    avg_tilt: float
    max_displacement: float
    peak_vibration: float
    crack_events_total: int
    avg_risk_score: float
    ai_prediction_accuracy: float


class RiskDistributionItem(BaseModel):
    level: str
    percentage: float
    color: str


class RiskDistributionOut(BaseModel):
    distribution: list[RiskDistributionItem]


# ============================================================
# REPORTS
# ============================================================

class DateRange(BaseModel):
    start: datetime
    end: datetime


class ReportSection(BaseModel):
    id: str
    label: str
    enabled: bool


class ReportConfig(BaseModel):
    mine: str
    date_range: DateRange
    node_scope: list[str] = Field(default=["ALL"])
    region: str = ""
    sections: list[ReportSection] = []


class NodeStatistic(BaseModel):
    node_id: str
    avg_tilt: float
    max_displacement: float
    peak_vibration: float
    crack_events: int
    avg_risk_score: float


class AIPredictionStat(BaseModel):
    node_id: str
    avg_prediction_accuracy: float
    avg_confidence: float
    predicted_deformation: float


class RiskOverview(BaseModel):
    overall_risk: str
    l0_percentage: float
    l1_percentage: float
    l2_percentage: float
    l3_percentage: float


class ReportDataOut(BaseModel):
    config: ReportConfig
    generated_at: datetime
    summary: str
    risk_overview: RiskOverview
    node_statistics: list[NodeStatistic]
    alerts: list[AlertOut]
    ai_predictions: list[AIPredictionStat]


# ============================================================
# SYSTEM HEALTH
# ============================================================

class ServiceHealthOut(BaseModel):
    name: str
    status: str
    latency_ms: Optional[float]
    uptime_pct: Optional[float]
    last_check: datetime


class SystemStatusOut(BaseModel):
    status: Literal["OPERATIONAL", "WARNING", "CRITICAL"]


# ============================================================
# SAFE ZONES & EVACUATION ROUTES
# ============================================================

class SafeZoneOut(OrmBase):
    id: str
    mine_id: str
    name: str
    type: str
    latitude: float
    longitude: float
    capacity: int


class EvacuationRouteOut(OrmBase):
    id: str
    mine_id: str
    name: str
    from_node_id: Optional[str]
    to_safe_zone_id: Optional[str]
    distance: float
    points: list


class MineDetailOut(OrmBase):
    id: str
    name: str
    location: str
    latitude: float
    longitude: float
    boundary: list
    created_at: datetime
    nodes: list[NodeOut] = []
    safe_zones: list[SafeZoneOut] = []
    evacuation_routes: list[EvacuationRouteOut] = []
