"""
auth-service — Ana Uygulama
JWT + bcrypt + RBAC
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .database import engine, Base, AsyncSessionLocal
from .routes.auth import router as auth_router, hash_password
from .models import User
from sqlalchemy import select, text


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Tablolar yoksa oluştur
    async with engine.begin() as conn:
        await conn.execute(text("CREATE SCHEMA IF NOT EXISTS auth"))
        await conn.run_sync(Base.metadata.create_all)

    # Demo kullanıcıları tohumla
    async with AsyncSessionLocal() as db:
        demo_users = [
            {"email": "hatice@demo.com", "password": "demo1234", "role": "customer", "customer_id": "cust_hatice_001"},
            {"email": "emre@demo.com", "password": "demo1234", "role": "customer", "customer_id": "cust_emre_002"},
            {"email": "calisan@demo.com", "password": "demo1234", "role": "staff", "customer_id": None},
            {"email": "admin@demo.com", "password": "demo1234", "role": "admin", "customer_id": None},
        ]
        for du in demo_users:
            res = await db.execute(select(User).where(User.email == du["email"]))
            if not res.scalar_one_or_none():
                user = User(
                    email=du["email"],
                    password_hash=hash_password(du["password"]),
                    role=du["role"],
                    customer_id=du["customer_id"],
                )
                db.add(user)
        await db.commit()
    yield


app = FastAPI(
    title="Afet Modu — auth-service",
    description="Kayıt/giriş, JWT üretimi, RBAC (customer · staff · admin)",
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

app.include_router(auth_router, prefix="/auth", tags=["auth"])


@app.get("/health")
async def health():
    return {"status": "ok", "service": "auth-service"}
