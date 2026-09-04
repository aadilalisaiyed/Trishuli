# ============================================================
# MineSafe AI — FastAPI Main Application Entry Point
# ============================================================

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import create_all_tables
from app.api.v1.router import api_v1_router
from seed import seed_database


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan context manager.
    On startup: creates all tables and runs the database seed check.
    """
    print(f"Starting {settings.APP_NAME} Backend ({settings.APP_ENV})...")
    create_all_tables()
    try:
        seed_database()
    except Exception as e:
        print(f"Warning: Seed database check during startup failed: {e}")
    yield
    print(f"Shutting down {settings.APP_NAME} Backend...")


app = FastAPI(
    title=settings.APP_NAME,
    description="Real-Time Mine Subsidence Intelligence & Early Warning System API",
    version="1.0.0",
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    docs_url=f"{settings.API_V1_PREFIX}/docs",
    redoc_url=f"{settings.API_V1_PREFIX}/redoc",
    lifespan=lifespan,
)

# ── CORS Middleware Configuration ───────────────────────────
# Configured for frontend origin (e.g. http://localhost:5173)
origins = [
    settings.FRONTEND_ORIGIN,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── API v1 Router Inclusion ─────────────────────────────────
app.include_router(api_v1_router, prefix=settings.API_V1_PREFIX)


@app.get("/", tags=["Health"])
def root():
    return {
        "status": "online",
        "app": settings.APP_NAME,
        "version": "1.0.0",
        "docs": f"{settings.API_V1_PREFIX}/docs",
    }


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "healthy"}

