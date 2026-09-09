from datetime import datetime, timezone
from typing import Dict, List

from fastapi import APIRouter, Request
from pydantic import BaseModel, ConfigDict, Field


class ESP8266Assessment(BaseModel):
    """Assessment already produced by the Raspberry Pi's ML pipeline."""
    model_config = ConfigDict(extra="allow")

    device: str
    risk: str
    raw_prediction: str
    confidence: float = Field(..., ge=0, le=1)
    is_anomaly: bool
    latency_ms: float
    received_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


router = APIRouter(prefix="/esp8266", tags=["ESP8266 Telemetry"])
latest_readings: Dict[str, ESP8266Assessment] = {}


class NodeRegisterRequest(BaseModel):
    node_id: str

registered_nodes: set[str] = set()

@router.api_route("/latest", methods=["GET", "POST"])
def latest_readings_endpoint(request: Request, payload: ESP8266Assessment | None = None) -> List[ESP8266Assessment] | ESP8266Assessment:
    if request.method == "POST" and payload is not None:
        latest_readings[payload.device] = payload
        return payload
    return list(latest_readings.values())


@router.post("/nodes")
def register_node(payload: NodeRegisterRequest):
    registered_nodes.add(payload.node_id)
    return {"status": "success", "node_id": payload.node_id, "registered_nodes": list(registered_nodes)}