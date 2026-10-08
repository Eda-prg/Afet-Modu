from sqlalchemy import String, Boolean, Float, Integer, DateTime, func, Date
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
import uuid
from .database import Base


class Customer(Base):
    __tablename__ = "customers"
    __table_args__ = {"schema": "core"}

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    ad: Mapped[str] = mapped_column(String(100), nullable=False)
    soyad: Mapped[str] = mapped_column(String(100), nullable=False)
    il: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    ilce: Mapped[str] = mapped_column(String(100), nullable=False)
    yas: Mapped[int] = mapped_column(Integer, nullable=False)
    hassas_durum: Mapped[bool] = mapped_column(Boolean, default=False)  # yaşlı veya engelli
    engelli: Mapped[bool] = mapped_column(Boolean, default=False)
    telefon_maskeli: Mapped[str] = mapped_column(String(20), nullable=True)
    lat: Mapped[float] = mapped_column(Float, nullable=True)
    lon: Mapped[float] = mapped_column(Float, nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Loan(Base):
    __tablename__ = "loans"
    __table_args__ = {"schema": "core"}

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    customer_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    tur: Mapped[str] = mapped_column(String(20), nullable=False)  # konut, ihtiyac, kart
    kalan_borc: Mapped[float] = mapped_column(Float, nullable=False)
    aylik_taksit: Mapped[float] = mapped_column(Float, nullable=False)
    sonraki_taksit_tarihi: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=True)
    dask_var: Mapped[bool | None] = mapped_column(Boolean, nullable=True)  # None = bilinmiyor
    dask_police_no: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
