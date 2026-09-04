# ============================================================
# MineSafe AI — Report Schemas
# ============================================================

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field

from app.schemas.alert import AlertOut


class DateRange(BaseModel):
    start: datetime
    end: datetime


class ReportSection(BaseModel):
    id: str
    label: str
    enabled: bool


class ReportConfig(BaseModel):
    mine: str = "Prototype Mine"
    date_range: DateRange
    node_scope: List[str] = Field(default=["ALL"])
    region: str = ""
    sections: List[ReportSection] = []


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
    node_statistics: List[NodeStatistic]
    alerts: List[AlertOut]
    ai_predictions: List[AIPredictionStat]
