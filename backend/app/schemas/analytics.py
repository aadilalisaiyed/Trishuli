# ============================================================
# MineSafe AI — Analytics Schemas
# ============================================================

from typing import List
from pydantic import BaseModel


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
    distribution: List[RiskDistributionItem]
