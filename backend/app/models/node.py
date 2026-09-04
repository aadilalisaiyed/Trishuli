# ============================================================
# MineSafe AI — Node Model
# ============================================================

from datetime import datetime
from sqlalchemy import String, Double, Boolean, DateTime, ForeignKey, Index, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Node(Base):
    __tablename__ = "nodes"
    __table_args__ = (
        Index("idx_nodes_mine_id", "mine_id"),
    )

    id: Mapped[str] = mapped_column(String(16), primary_key=True)            # 'N01', 'N02', 'N03'
    mine_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("mines.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    latitude: Mapped[float] = mapped_column(Double, nullable=False)
    longitude: Mapped[float] = mapped_column(Double, nullable=False)

    # ── Location-specific thresholds ────────────────────────
    thr_tilt: Mapped[float] = mapped_column(Double, nullable=False, default=0.50)
    thr_displacement: Mapped[float] = mapped_column(Double, nullable=False, default=10.0)
    thr_vibration: Mapped[float] = mapped_column(Double, nullable=False, default=52.0)
    thr_crack: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    thr_relative_movement: Mapped[float] = mapped_column(Double, nullable=False, default=8.0)

    # ── Hardware health (updated on each heartbeat) ──────────
    battery: Mapped[float | None] = mapped_column(Double, nullable=True)
    wifi_signal: Mapped[float | None] = mapped_column(Double, nullable=True)
    packet_reception: Mapped[float | None] = mapped_column(Double, nullable=True)
    status: Mapped[str] = mapped_column(
        String(16), nullable=False, default="Online"
    )   # 'Online' | 'Offline' | 'Degraded'
    last_heartbeat: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    # ── Relationships ────────────────────────────────────────
    mine: Mapped["Mine"] = relationship("Mine", back_populates="nodes")  # noqa: F821
    readings: Mapped[list["SensorReading"]] = relationship(  # noqa: F821
        "SensorReading", back_populates="node", cascade="all, delete-orphan",
        order_by="SensorReading.timestamp.desc()",
    )
    alerts: Mapped[list["Alert"]] = relationship(  # noqa: F821
        "Alert", back_populates="node", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Node id={self.id!r} mine={self.mine_id!r} status={self.status!r}>"
