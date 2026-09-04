# ============================================================
# MineSafe AI — SensorReading Model
# ============================================================
# Core time-series table. One row per sensor poll (~every 3s).
# Indexed on (node_id, timestamp DESC) for fast "latest reading"
# and range queries used by the analytics and history endpoints.

from datetime import datetime
from sqlalchemy import (
    BigInteger, String, Double, Boolean, SmallInteger,
    DateTime, ForeignKey, Index, func
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class SensorReading(Base):
    __tablename__ = "sensor_readings"
    __table_args__ = (
        # Composite index for all time-range queries per node (most critical query)
        Index("idx_sensor_readings_node_time", "node_id", "timestamp"),
        # Standalone timestamp index for cross-node aggregation queries
        Index("idx_sensor_readings_timestamp", "timestamp"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    node_id: Mapped[str] = mapped_column(
        String(16), ForeignKey("nodes.id", ondelete="CASCADE"), nullable=False
    )
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), index=False
    )

    # ── Raw sensor readings ──────────────────────────────────
    tilt: Mapped[float] = mapped_column(Double, nullable=False)               # degrees
    displacement: Mapped[float] = mapped_column(Double, nullable=False)       # mm
    vibration: Mapped[float] = mapped_column(Double, nullable=False)          # %
    crack_detected: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    relative_movement: Mapped[float] = mapped_column(Double, nullable=False)  # mm

    # ── AI-derived fields (computed by services/ai.py on ingestion) ─
    risk_level: Mapped[str] = mapped_column(
        String(4), nullable=False, default="L0"
    )   # 'L0' | 'L1' | 'L2' | 'L3'
    risk_score: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=0)        # 0-100
    ai_confidence: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=95)   # 0-100
    predicted_deformation: Mapped[float | None] = mapped_column(Double, nullable=True)     # mm
    prediction_horizon: Mapped[int | None] = mapped_column(SmallInteger, nullable=True, default=6)  # hours
    trend: Mapped[str | None] = mapped_column(String(32), nullable=True)

    # ── Relationship ─────────────────────────────────────────
    node: Mapped["Node"] = relationship("Node", back_populates="readings")  # noqa: F821

    def __repr__(self) -> str:
        return (
            f"<SensorReading id={self.id} node={self.node_id!r} "
            f"ts={self.timestamp} risk={self.risk_level}>"
        )
