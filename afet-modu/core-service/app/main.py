"""
core-service — Ana Uygulama
Bankanın mock çekirdeği: müşteri, kredi, DASK bilgisi
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from sqlalchemy import select, text

from .database import engine, Base, AsyncSessionLocal
from .models import Customer, Loan
from .seed import generate_customers, generate_loans
from .routes.customers import router as customers_router
from .routes.loans import router as loans_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.execute(text("CREATE SCHEMA IF NOT EXISTS core"))
        await conn.run_sync(Base.metadata.create_all)

    # Sentetik veri yoksa tohumla
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Customer).limit(1))
        if not result.scalar_one_or_none():
            customers_data = generate_customers(400)
            loans_data = generate_loans(customers_data)

            for c in customers_data:
                db.add(Customer(**c))
            await db.flush()

            for l in loans_data:
                db.add(Loan(**l))

            await db.commit()
            print(f"✅ {len(customers_data)} sentetik müşteri ve {len(loans_data)} kredi oluşturuldu")
        else:
            print("ℹ️  Sentetik veri zaten mevcut, atlandı")

    yield


app = FastAPI(
    title="Afet Modu — core-service",
    description="Bankanın mock çekirdeği: müşteri, kredi, DASK bilgisi (sentetik veri)",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(customers_router, prefix="/customers", tags=["customers"])
app.include_router(loans_router, prefix="/loans", tags=["loans"])


@app.get("/health")
async def health():
    return {"status": "ok", "service": "core-service"}
