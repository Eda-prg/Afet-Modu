from sqlalchemy import String, Float, DateTime, func, JSON
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID, ARRAY
import uuid
from .database import Base


class DisasterEvent(Base):
    __tablename__ = "disaster_events"
    __table_args__ = {"schema": "disaster"}

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    tur: Mapped[str] = mapped_column(String(30), nullable=False)
    buyukluk: Mapped[float] = mapped_column(Float, nullable=False)
    iller: Mapped[list] = mapped_column(JSON, nullable=False)
    zaman: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False)
    kaynak: Mapped[str] = mapped_column(String(50), default="SIMULASYON")
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class AffectedCustomer(Base):
    __tablename__ = "affected_customers"
    __table_args__ = {"schema": "disaster"}

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    event_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    customer_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    il: Mapped[str] = mapped_column(String(50), nullable=False)
    oncelik: Mapped[str] = mapped_column(String(20), default="normal")  # yuksek | normal
    eslesme_zamani: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
