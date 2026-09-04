# ============================================================
# MineSafe AI — SafeZone Model
# ============================================================

from sqlalchemy import String, Integer, Double, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class SafeZone(Base):
    __tablename__ = "safe_zones"

    id: Mapped[str] = mapped_column(String(16), primary_key=True)    # 'R-01', 'R-02'
    mine_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("mines.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    type: Mapped[str] = mapped_column(String(16), nullable=False)     # 'refuge'|'exit'|'assembly'
    latitude: Mapped[float] = mapped_column(Double, nullable=False)
    longitude: Mapped[float] = mapped_column(Double, nullable=False)
    capacity: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # ── Relationships ─────────────────────────────────────────
    mine: Mapped["Mine"] = relationship("Mine", back_populates="safe_zones")  # noqa: F821
    evacuation_routes: Mapped[list["EvacuationRoute"]] = relationship(  # noqa: F821
        "EvacuationRoute", back_populates="to_safe_zone", passive_deletes=True
    )

    def __repr__(self) -> str:
        return f"<SafeZone id={self.id!r} type={self.type!r} capacity={self.capacity}>"
