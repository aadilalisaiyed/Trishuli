# ============================================================
# MineSafe AI — System Health Schemas
# ============================================================

from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel


class ServiceHealthOut(BaseModel):
    name: str
    status: str
    latency_ms: Optional[float] = None
    uptime_pct: Optional[float] = None
    last_check: datetime


class SystemStatusOut(BaseModel):
    status: Literal["OPERATIONAL", "WARNING", "CRITICAL"]
