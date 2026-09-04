# ============================================================
# MineSafe AI — Notification Model
# ============================================================

import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Text, Index, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Notification(Base):
    __tablename__ = "notifications"
    __table_args__ = (
        # Composite index to quickly fetch unread notifications for a user in reverse-chron order
        Index("idx_notifications_user", "user_id", "read", "timestamp"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    type: Mapped[str] = mapped_column(String(16), nullable=False)    # 'critical'|'warning'|'watch'|'system'
    title: Mapped[str] = mapped_column(String(256), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    node_id: Mapped[str | None] = mapped_column(
        String(16), ForeignKey("nodes.id", ondelete="SET NULL"), nullable=True
    )
    alert_id: Mapped[str | None] = mapped_column(
        String(16), ForeignKey("alerts.id", ondelete="SET NULL"), nullable=True
    )

    # ── Relationships ─────────────────────────────────────────
    user: Mapped["User"] = relationship("User", back_populates="notifications")  # noqa: F821
    alert: Mapped["Alert | None"] = relationship("Alert", back_populates="notifications")  # noqa: F821

    def __repr__(self) -> str:
        return f"<Notification id={self.id} user={self.user_id} type={self.type!r} read={self.read}>"
