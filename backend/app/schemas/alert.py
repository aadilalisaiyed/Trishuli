# ============================================================
# MineSafe AI — Alert Schemas
# ============================================================

from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, ConfigDict


class OrmBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)


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
    acknowledged_at: Optional[datetime] = None
    acknowledged_by: Optional[str] = None
    resolved_at: Optional[datetime] = None


class AlertCreate(BaseModel):
    severity: Literal["L1", "L2", "L3"]
    node_id: str
    trigger: str
    ai_risk_score: int
    predicted_deformation: float


class AlertAcknowledgeRequest(BaseModel):
    acknowledged_by: Optional[str] = None
