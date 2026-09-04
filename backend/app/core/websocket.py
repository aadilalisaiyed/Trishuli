# ============================================================
# MineSafe AI — Real-Time WebSocket Connection Manager
# ============================================================

import asyncio
from typing import Dict, List
from fastapi import WebSocket


class ConnectionManager:
    """
    Manages active WebSocket connections per mine_id.
    Handles connection lifecycle and JSON broadcasting for live telemetry.
    """

    def __init__(self):
        # Map mine_id -> List of active WebSocket connections
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, mine_id: str):
        """Accept an incoming WebSocket connection and register it under mine_id."""
        await websocket.accept()
        if mine_id not in self.active_connections:
            self.active_connections[mine_id] = []
        self.active_connections[mine_id].append(websocket)
        print(f"[WebSocket] Client connected to mine '{mine_id}'. Active: {len(self.active_connections[mine_id])}")

    def disconnect(self, websocket: WebSocket, mine_id: str):
        """Unregister a disconnected WebSocket connection."""
        if mine_id in self.active_connections:
            if websocket in self.active_connections[mine_id]:
                self.active_connections[mine_id].remove(websocket)
            if not self.active_connections[mine_id]:
                del self.active_connections[mine_id]
        print(f"[WebSocket] Client disconnected from mine '{mine_id}'.")

    async def broadcast_to_mine(self, mine_id: str, message: dict):
        """
        Broadcast a JSON payload (e.g. NODE_TICK, NEW_ALERT) to all clients
        connected to a specific mine_id.
        """
        if mine_id not in self.active_connections:
            return

        disconnected: List[WebSocket] = []
        connections = list(self.active_connections[mine_id])

        for connection in connections:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.append(connection)

        # Cleanup failed connections
        for conn in disconnected:
            self.disconnect(conn, mine_id)


# Global singleton instance
manager = ConnectionManager()
