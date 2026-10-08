from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from sqlalchemy import text

from .database import engine, Base
from .routes.disaster import router as disaster_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.execute(text("CREATE SCHEMA IF NOT EXISTS disaster"))
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title="Afet Modu — disaster-service",
    description="Afet olayı alma, etkilenen müşteri eşleme, Kafka/Redis olay yayını",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])

app.include_router(disaster_router, prefix="/disaster", tags=["disaster"])


@app.get("/health")
async def health():
    return {"status": "ok", "service": "disaster-service"}
