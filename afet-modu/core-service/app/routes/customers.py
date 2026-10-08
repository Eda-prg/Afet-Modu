from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional

from ..database import get_db
from ..models import Customer

router = APIRouter()


@router.get("")
async def list_customers(
    il: Optional[str] = Query(None, description="İl filtresi"),
    hassas: Optional[bool] = Query(None, description="Yaşlı/engelli filtresi"),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    query = select(Customer)
    if il:
        query = query.where(Customer.il == il)
    if hassas is not None:
        query = query.where(Customer.hassas_durum == hassas)

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar()

    query = query.offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    items = result.scalars().all()

    return {
        "total": total,
        "page": page,
        "size": size,
        "items": [
            {
                "id": c.id,
                "ad": c.ad,
                "soyad": c.soyad[0] + ".",  # soyad maskesi
                "il": c.il,
                "ilce": c.ilce,
                "yas": c.yas,
                "hassas_durum": c.hassas_durum,
                "engelli": c.engelli,
                "lat": c.lat,
                "lon": c.lon,
            }
            for c in items
        ],
    }


@router.get("/{customer_id}")
async def get_customer(customer_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Customer).where(Customer.id == customer_id))
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Müşteri bulunamadı")

    return {
        "id": c.id,
        "ad": c.ad,
        "soyad": c.soyad[0] + ".",
        "il": c.il,
        "ilce": c.ilce,
        "yas": c.yas,
        "hassas_durum": c.hassas_durum,
        "engelli": c.engelli,
        "telefon": c.telefon_maskeli,  # zaten maskelenmiş
        "lat": c.lat,
        "lon": c.lon,
    }
