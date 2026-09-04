# ============================================================
# MineSafe AI — Notification Schemas
# ============================================================

import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class OrmBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class NotificationOut(OrmBase):
    id: uuid.UUID
    user_id: uuid.UUID
    type: str
    title: str
    message: str
    timestamp: datetime
    read: bool
    node_id: Optional[str] = None
    alert_id: Optional[str] = None
