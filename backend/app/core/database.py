# ============================================================
# MineSafe AI — Database Engine & Session Factory
# ============================================================
# Uses synchronous SQLAlchemy with psycopg2 for simplicity.
# Switch to asyncpg + async SQLAlchemy later for full async I/O.

import uuid

from sqlalchemy import create_engine
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID
from sqlalchemy.types import CHAR, JSON, TypeDecorator
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.core.config import settings


class GUID(TypeDecorator):
    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(PostgreSQLUUID(as_uuid=True))
        return dialect.type_descriptor(CHAR(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if dialect.name == "postgresql":
            return value if isinstance(value, uuid.UUID) else uuid.UUID(str(value))
        return str(value)

    def process_result_value(self, value, dialect):
        if value is None or isinstance(value, uuid.UUID):
            return value
        return uuid.UUID(value)


class JSONCompatible(TypeDecorator):
    impl = JSON
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            from sqlalchemy.dialects.postgresql import JSONB
            return dialect.type_descriptor(JSONB())
        return dialect.type_descriptor(JSON())


# ── Engine ──────────────────────────────────────────────────
is_sqlite = settings.DATABASE_URL.startswith("sqlite")
engine_options = {
    "pool_pre_ping": True,
    "echo": settings.APP_ENV == "development",
}
if is_sqlite:
    engine_options["connect_args"] = {"check_same_thread": False}
else:
    engine_options.update({"pool_size": 10, "max_overflow": 20})

engine = create_engine(settings.DATABASE_URL, **engine_options)

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
