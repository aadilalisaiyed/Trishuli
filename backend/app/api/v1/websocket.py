# ============================================================
# MineSafe AI — Real-Time WebSocket Telemetry Endpoint
# ============================================================

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.core.websocket import manager

router = APIRouter(prefix="/ws", tags=["Real-Time Telemetry"])


@router.websocket("/mines/{mine_id}/live")
async def websocket_mine_live(websocket: WebSocket, mine_id: str):
    """
    WebSocket endpoint streaming live sensor node updates and alert events
    for a specific mine site.
    """
    await manager.connect(websocket, mine_id)
    try:
        while True:
            # Maintain active connection and listen for ping/pong or client messages
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, mine_id)
    except Exception:
        manager.disconnect(websocket, mine_id)
