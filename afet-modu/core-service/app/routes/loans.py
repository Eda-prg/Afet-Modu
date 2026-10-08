from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional

from ..database import get_db
from ..models import Loan, Customer

router = APIRouter()


@router.get("")
async def list_loans(
    customer_id: Optional[str] = Query(None),
    tur: Optional[str] = Query(None),
    dask_var: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    query = select(Loan)
    if customer_id:
        query = query.where(Loan.customer_id == customer_id)
    if tur:
        query = query.where(Loan.tur == tur)
    if dask_var is not None:
        query = query.where(Loan.dask_var == dask_var)

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar()

    query = query.offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    items = result.scalars().all()

    return {
        "total": total,
        "page": page,
        "items": [_loan_dict(l) for l in items],
    }


@router.get("/{loan_id}")
async def get_loan(loan_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Loan).where(Loan.id == loan_id))
    l = result.scalar_one_or_none()
    if not l:
        raise HTTPException(status_code=404, detail="Kredi bulunamadı")
    return _loan_dict(l)


def _loan_dict(l: Loan) -> dict:
    return {
        "id": l.id,
        "customer_id": l.customer_id,
        "tur": l.tur,
        "kalan_borc": l.kalan_borc,
        "aylik_taksit": l.aylik_taksit,
        "sonraki_taksit_tarihi": l.sonraki_taksit_tarihi,
        "dask_var": l.dask_var,
        "dask_police_no": l.dask_police_no,
    }


@router.get("/customer/{customer_id}/summary")
async def customer_loan_summary(customer_id: str, db: AsyncSession = Depends(get_db)):
    """Ajan'ın kullandığı özet endpoint."""
    cust_result = await db.execute(select(Customer).where(Customer.id == customer_id))
    c = cust_result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Müşteri bulunamadı")

    loan_result = await db.execute(select(Loan).where(Loan.customer_id == customer_id))
    loans = loan_result.scalars().all()

    return {
        "customer": {
            "id": c.id, "ad": c.ad, "soyad": c.soyad[0] + ".",
            "il": c.il, "ilce": c.ilce, "yas": c.yas,
            "hassas_durum": c.hassas_durum, "engelli": c.engelli,
            "telefon": c.telefon_maskeli,
        },
        "loans": [_loan_dict(l) for l in loans],
    }
