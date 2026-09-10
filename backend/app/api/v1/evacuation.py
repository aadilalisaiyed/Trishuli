# ============================================================
# MineSafe AI — Evacuation Routing API Route (/api/v1/evacuation)
# ============================================================

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.evacuation import calculate_optimal_evacuation_target, dispatch_n8n_evacuation_alert

router = APIRouter(prefix="/evacuation", tags=["Evacuation & Safe Routing"])


class EvacuationCalculateRequest(BaseModel):
    affected_node_id: str = Field(..., description="ID of the node undergoing alert/failure")
    w1: Optional[float] = Field(default=0.5, ge=0.0, le=1.0, description="Risk weight coefficient")
    w2: Optional[float] = Field(default=0.5, ge=0.0, le=1.0, description="Distance weight coefficient")


class AffectedNodeSchema(BaseModel):
    id: str
    latitude: float
    longitude: float
    alert_type: str


class SafeZoneNodeSchema(BaseModel):
    id: str
    latitude: float
    longitude: float
    health_status: str
    distance_meters: float


class EvacuationCalculateResponse(BaseModel):
    affected_node: AffectedNodeSchema
    safe_zone_node: SafeZoneNodeSchema
    evacuation_instruction: str


@router.post(
    "/calculate",
    response_model=EvacuationCalculateResponse,
    status_code=status.HTTP_200_OK,
    summary="Calculate Evacuation Route and Safe Target",
)
def calculate_evacuation_route(
    payload: EvacuationCalculateRequest,
    db: Session = Depends(get_db),
):
    """
    Calculate the optimal evacuation safe target for an affected node using multi-criteria
    safety-distance cost optimization. Automatically triggers n8n alert workflow on POST request.
    """
    result = calculate_optimal_evacuation_target(
        affected_node_id=payload.affected_node_id,
        db=db,
        w1=payload.w1 if payload.w1 is not None else 0.5,
        w2=payload.w2 if payload.w2 is not None else 0.5,
    )
    
    # Automatically dispatch real-time alert trigger to n8n when POST request is executed
    dispatch_n8n_evacuation_alert(result)

    return result
