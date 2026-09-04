# ============================================================
# MineSafe AI — API v1 Router Aggregator
# ============================================================

from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.mines import router as mines_router
from app.api.v1.nodes import router as nodes_router
from app.api.v1.alerts import router as alerts_router
from app.api.v1.notifications import router as notifications_router
from app.api.v1.analytics import router as analytics_router
from app.api.v1.reports import router as reports_router
from app.api.v1.system import router as system_router
from app.api.v1.websocket import router as websocket_router

api_v1_router = APIRouter()

# Include feature routers under /api/v1
api_v1_router.include_router(auth_router)
api_v1_router.include_router(mines_router)
api_v1_router.include_router(nodes_router)
api_v1_router.include_router(alerts_router)
api_v1_router.include_router(notifications_router)
api_v1_router.include_router(analytics_router)
api_v1_router.include_router(reports_router)
api_v1_router.include_router(system_router)
api_v1_router.include_router(websocket_router)
