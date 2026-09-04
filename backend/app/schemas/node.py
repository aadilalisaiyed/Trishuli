# ============================================================
# MineSafe AI — Node & Telemetry Schemas
# ============================================================

from datetime import datetime
from typing import Optional, List, Literal
from pydantic import BaseModel, Field, ConfigDict

from app.schemas.mine import MineOut, SafeZoneOut, EvacuationRouteOut


class OrmBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ── Ingestion Request Body ────────────────────────────────────
class SensorReadingCreate(BaseModel):
    """POST /nodes/{node_id}/readings request body sent by hardware or simulation."""
    tilt: float = Field(..., ge=0, description="Tilt angle in degrees")
    displacement: float = Field(..., ge=0, description="Surface displacement in mm")
    vibration: float = Field(..., ge=0, le=100, description="Vibration intensity percentage")
    crack_detected: bool = Field(default=False)
    relative_movement: float = Field(..., ge=0, description="Relative movement in mm")

    # Hardware metadata (optional)
    battery: Optional[float] = Field(default=None, ge=0, le=100)
    wifi_signal: Optional[float] = Field(default=None, description="Signal strength dBm")
    packet_reception: Optional[float] = Field(default=None, ge=0, le=100)
    timestamp: Optional[datetime] = None


# ── Sensor Reading Out ────────────────────────────────────────
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
    predicted_deformation: Optional[float] = None
    prediction_horizon: Optional[int] = 6
    trend: Optional[str] = None


# ── Threshold Update Body ─────────────────────────────────────
class NodeThresholdUpdate(BaseModel):
    """PATCH /nodes/{node_id}/thresholds request body."""
    thr_tilt: Optional[float] = None
    thr_displacement: Optional[float] = None
    thr_vibration: Optional[float] = None
    thr_crack: Optional[bool] = None
    thr_relative_movement: Optional[float] = None


# ── Node Output ───────────────────────────────────────────────
class NodeOut(OrmBase):
    """Full Node output with threshold settings & hardware health."""
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
    battery: Optional[float] = None
    wifi_signal: Optional[float] = None
    packet_reception: Optional[float] = None
    status: str
    last_heartbeat: Optional[datetime] = None

    # Latest reading (None if node has no readings)
    latest_reading: Optional[SensorReadingOut] = None


# ── Mine Detail Output ────────────────────────────────────────
class MineDetailOut(MineOut):
    nodes: List[NodeOut] = []
    safe_zones: List[SafeZoneOut] = []
    evacuation_routes: List[EvacuationRouteOut] = []


# ── Time Series Telemetry ─────────────────────────────────────
class TimeSeriesPoint(BaseModel):
    timestamp: datetime
    value: float


class NodeHistoryResponse(BaseModel):
    """GET /nodes/{node_id}/history response shape."""
    node_id: str
    tilt: List[TimeSeriesPoint] = []
    displacement: List[TimeSeriesPoint] = []
    vibration: List[TimeSeriesPoint] = []
    crack_events: List[TimeSeriesPoint] = []
    relative_movement: List[TimeSeriesPoint] = []
    risk_score: List[TimeSeriesPoint] = []
    predicted_deformation: List[TimeSeriesPoint] = []
    actual_deformation: List[TimeSeriesPoint] = []


# ── AI Risk Assessment ────────────────────────────────────────
class ContributingFactorSchema(BaseModel):
    indicator: str
    status: Literal["normal", "abnormal"]
    description: str
    value: str
    threshold: str


class AIRiskAssessmentResponse(BaseModel):
    """GET /nodes/{node_id}/ai-assessment response shape."""
    node_id: str
    risk_score: int
    confidence: int
    predicted_deformation: float
    prediction_horizon: int
    trend: str
    contributing_factors: List[ContributingFactorSchema]
    recommended_actions: List[str]
    explanation: str
