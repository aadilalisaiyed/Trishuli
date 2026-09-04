# ============================================================
# MineSafe AI — Database Engine & Session Factory
# ============================================================
# Uses synchronous SQLAlchemy with psycopg2 for simplicity.
# Switch to asyncpg + async SQLAlchemy later for full async I/O.

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.core.config import settings


# ── Engine ──────────────────────────────────────────────────
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,       # test connections before use (handles stale connections)
    pool_size=10,
    max_overflow=20,
    echo=(settings.APP_ENV == "development"),  # SQL logging in dev
)

# ── Session Factory ─────────────────────────────────────────
SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
)


# ── Declarative Base ────────────────────────────────────────
class Base(DeclarativeBase):
    """All SQLAlchemy models inherit from this class."""
    pass


# ── Dependency ──────────────────────────────────────────────
def get_db():
    """
    FastAPI dependency that yields a database session per request,
    then closes it automatically after the response is sent.

    Usage:
        @router.get("/example")
        def example(db: Session = Depends(get_db)):
            ...
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_all_tables():
    """
    Create all tables defined in SQLAlchemy models.
    Called once on application startup.
    Import all model modules here so their metadata is registered.
    """
    from app.models import user, mine, node, sensor_reading, alert, safe_zone, evacuation_route, notification  # noqa: F401
    Base.metadata.create_all(bind=engine)
