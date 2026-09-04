# ============================================================
# MineSafe AI — EvacuationRoute Model
# ============================================================

from sqlalchemy import String, Double, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class EvacuationRoute(Base):
    __tablename__ = "evacuation_routes"

    id: Mapped[str] = mapped_column(String(16), primary_key=True)     # 'EVR-01'
    mine_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("mines.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    from_node_id: Mapped[str | None] = mapped_column(
        String(16), ForeignKey("nodes.id", ondelete="SET NULL"), nullable=True
    )
    to_safe_zone_id: Mapped[str | None] = mapped_column(
        String(16), ForeignKey("safe_zones.id", ondelete="SET NULL"), nullable=True
    )
    distance: Mapped[float] = mapped_column(Double, nullable=False)           # meters
    points: Mapped[list] = mapped_column(JSONB, nullable=False, default=list) # [[lat, lng], ...]

    # ── Relationships ─────────────────────────────────────────
    mine: Mapped["Mine"] = relationship("Mine", back_populates="evacuation_routes")  # noqa: F821
    from_node: Mapped["Node | None"] = relationship(  # noqa: F821
        "Node", foreign_keys=[from_node_id]
    )
    to_safe_zone: Mapped["SafeZone | None"] = relationship(  # noqa: F821
        "SafeZone", back_populates="evacuation_routes"
    )

    def __repr__(self) -> str:
        return f"<EvacuationRoute id={self.id!r} from={self.from_node_id!r} to={self.to_safe_zone_id!r}>"
