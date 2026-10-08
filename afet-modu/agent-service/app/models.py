from sqlalchemy import String, Integer, Float, DateTime, func, JSON, Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
import uuid
from .database import Base


class Plan(Base):
    __tablename__ = "plans"
    __table_args__ = {"schema": "agent"}

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    event_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    customer_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    oncelik: Mapped[str] = mapped_column(String(20), default="normal")  # yuksek | normal
    erteleme_ay: Mapped[int] = mapped_column(Integer, nullable=False)
    belgeler: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    mesaj: Mapped[str] = mapped_column(Text, nullable=True)  # İletişimci ajanın mesajı
    durum: Mapped[str] = mapped_column(String(30), default="taslak")  # taslak|onaylandi|devredildi|iptal
    neden_devir: Mapped[str | None] = mapped_column(String(100), nullable=True)
    onay_zamani: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class AgentRun(Base):
    __tablename__ = "agent_runs"
    __table_args__ = {"schema": "agent"}

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    plan_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    customer_id: Mapped[str] = mapped_column(String(255), nullable=False)
    ajan: Mapped[str] = mapped_column(String(50), nullable=False)  # planlayici | iletisimci
    adim_sayisi: Mapped[int] = mapped_column(Integer, default=0)
    sure_ms: Mapped[int] = mapped_column(Integer, default=0)
    hata: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class AgentStep(Base):
    __tablename__ = "agent_steps"
    __table_args__ = {"schema": "agent"}

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    run_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    adim: Mapped[int] = mapped_column(Integer, nullable=False)
    ajan: Mapped[str] = mapped_column(String(50), nullable=False)
    arac: Mapped[str | None] = mapped_column(String(100), nullable=True)
    girdi: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    cikti: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    sure_ms: Mapped[int] = mapped_column(Integer, default=0)
    hata: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class AuditLog(Base):
    __tablename__ = "audit_log"
    __table_args__ = {"schema": "audit"}

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    kim: Mapped[str] = mapped_column(String(255), nullable=False)  # user_id veya "agent"
    ne: Mapped[str] = mapped_column(String(100), nullable=False)  # "plan_approved", "plan_escalated"
    kayit_id: Mapped[str] = mapped_column(String(255), nullable=False)  # plan_id
    detay: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
