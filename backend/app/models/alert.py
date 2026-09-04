# ============================================================
# MineSafe AI — Alert Model
# ============================================================

from datetime import datetime
from sqlalchemy import String, Integer, SmallInteger, Double, DateTime, ForeignKey, Index, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Alert(Base):
    __tablename__ = "alerts"
    __table_args__ = (
        Index("idx_alerts_node_id", "node_id"),
        Index("idx_alerts_status", "status"),
        Index("idx_alerts_timestamp", "timestamp"),
    )

    id: Mapped[str] = mapped_column(String(16), primary_key=True)   # 'ALT-001'
    severity: Mapped[str] = mapped_column(String(4), nullable=False)         # 'L1'|'L2'|'L3'
    node_id: Mapped[str] = mapped_column(
        String(16), ForeignKey("nodes.id", ondelete="CASCADE"), nullable=False
    )
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    duration: Mapped[int] = mapped_column(Integer, nullable=False, default=0)   # seconds
    trigger: Mapped[str] = mapped_column(Text, nullable=False)
    ai_risk_score: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    predicted_deformation: Mapped[float] = mapped_column(Double, nullable=False)
    status: Mapped[str] = mapped_column(
        String(16), nullable=False, default="ACTIVE"
    )   # 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED'
    acknowledged_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    acknowledged_by: Mapped[str | None] = mapped_column(String(128), nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # ── Relationships ─────────────────────────────────────────
    node: Mapped["Node"] = relationship("Node", back_populates="alerts")  # noqa: F821
    notifications: Mapped[list["Notification"]] = relationship(  # noqa: F821
        "Notification", back_populates="alert", passive_deletes=True
    )

    def __repr__(self) -> str:
        return f"<Alert id={self.id!r} severity={self.severity} node={self.node_id!r} status={self.status!r}>"
