# ============================================================
# MineSafe AI — Mine Model
# ============================================================

from datetime import datetime
from sqlalchemy import String, Double, DateTime, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Mine(Base):
    __tablename__ = "mines"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)           # e.g. 'PROTO-01'
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    location: Mapped[str] = mapped_column(String(256), nullable=False)
    latitude: Mapped[float] = mapped_column(Double, nullable=False)
    longitude: Mapped[float] = mapped_column(Double, nullable=False)
    boundary: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)  # [[lat, lng], ...]
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    # Relationships
    nodes: Mapped[list["Node"]] = relationship(  # noqa: F821
        "Node", back_populates="mine", cascade="all, delete-orphan"
    )
    safe_zones: Mapped[list["SafeZone"]] = relationship(  # noqa: F821
        "SafeZone", back_populates="mine", cascade="all, delete-orphan"
    )
    evacuation_routes: Mapped[list["EvacuationRoute"]] = relationship(  # noqa: F821
        "EvacuationRoute", back_populates="mine", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Mine id={self.id!r} name={self.name!r}>"
