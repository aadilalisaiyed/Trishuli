# ============================================================
# MineSafe AI — ESP8266 WebSocket Telemetry Archive
# ============================================================

from datetime import datetime
from sqlalchemy import BigInteger, Integer, String, Double, Boolean, DateTime, Index, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base, JSONCompatible


class ESP8266Telemetry(Base):
    __tablename__ = "esp8266_telemetry"
    __table_args__ = (
        Index("idx_esp8266_telemetry_device_time", "device", "received_at"),
    )

    id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        primary_key=True,
        autoincrement=True,
    )
    device: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    source: Mapped[str] = mapped_column(String(32), nullable=False, default="LIVE HARDWARE")
    risk: Mapped[str] = mapped_column(String(32), nullable=False)
    raw_prediction: Mapped[str] = mapped_column(String(32), nullable=False)
    confidence: Mapped[float] = mapped_column(Double, nullable=False)
    is_anomaly: Mapped[bool] = mapped_column(Boolean, nullable=False)
    latency_ms: Mapped[float] = mapped_column(Double, nullable=False)
    normalized_features: Mapped[dict] = mapped_column(JSONCompatible(), nullable=False, default=dict)
    rolling_features: Mapped[dict] = mapped_column(JSONCompatible(), nullable=False, default=dict)
    class_probabilities: Mapped[dict] = mapped_column(JSONCompatible(), nullable=False, default=dict)
    gate_trace: Mapped[str] = mapped_column(String(1024), nullable=False, default="")
    raw_payload: Mapped[dict] = mapped_column(JSONCompatible(), nullable=False, default=dict)

    def __repr__(self) -> str:
        return f"<ESP8266Telemetry id={self.id} device={self.device!r} risk={self.risk!r}>"
