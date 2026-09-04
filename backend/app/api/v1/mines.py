# ============================================================
# MineSafe AI — Mine API Routes (/api/v1/mines)
# ============================================================

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.mine import Mine
from app.models.node import Node
from app.models.sensor_reading import SensorReading
from app.schemas.mine import MineOut
from app.schemas.node import MineDetailOut, NodeOut, SensorReadingOut

router = APIRouter(prefix="/mines", tags=["Mines"])


@router.get("", response_model=List[MineOut], summary="List All Mines")
def list_mines(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Retrieve all registered mine sites."""
    return db.query(Mine).all()


@router.get("/{mine_id}", response_model=MineDetailOut, summary="Get Mine Details")
def get_mine_details(
    mine_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Retrieve details for a specific mine, including its boundary,
    nodes, safe zones, and evacuation routes.
    """
    mine = db.query(Mine).filter(Mine.id == mine_id).first()
    if not mine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Mine with ID '{mine_id}' not found.",
        )

    # Attach latest sensor reading to each node
    for node in mine.nodes:
        latest = (
            db.query(SensorReading)
            .filter(SensorReading.node_id == node.id)
            .order_by(SensorReading.timestamp.desc())
            .first()
        )
        node.latest_reading = SensorReadingOut.model_validate(latest) if latest else None

    return mine


@router.get("/{mine_id}/nodes", response_model=List[NodeOut], summary="Get Mine Nodes")
def get_mine_nodes(
    mine_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Retrieve all sensor nodes for a specific mine, each joined with its
    most recent sensor reading.
    """
    mine = db.query(Mine).filter(Mine.id == mine_id).first()
    if not mine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Mine with ID '{mine_id}' not found.",
        )

    nodes = db.query(Node).filter(Node.mine_id == mine_id).all()
    node_outs = []
    for node in nodes:
        latest = (
            db.query(SensorReading)
            .filter(SensorReading.node_id == node.id)
            .order_by(SensorReading.timestamp.desc())
            .first()
        )
        node_dict = NodeOut.model_validate(node)
        if latest:
            node_dict.latest_reading = SensorReadingOut.model_validate(latest)
        node_outs.append(node_dict)

    return node_outs
