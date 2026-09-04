# ============================================================
# MineSafe AI — Mine & Safe Zone Schemas
# ============================================================

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class OrmBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class MineOut(OrmBase):
    id: str
    name: str
    location: str
    latitude: float
    longitude: float
    boundary: list
    created_at: datetime


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
    from_node_id: Optional[str] = None
    to_safe_zone_id: Optional[str] = None
    distance: float
    points: list
