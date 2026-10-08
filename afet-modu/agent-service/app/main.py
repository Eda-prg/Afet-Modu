"""
agent-service — Ana Uygulama
Kafka consumer arka planda çalışır: customer.affected → ajan pipeline
"""
import asyncio
import json
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from .database import engine, Base
from .routes.agent import router as agent_router


async def start_kafka_consumer():
    """
    Kafka consumer — customer.affected olaylarını dinle → ajan pipeline tetikle
    EventBus arayüzü: Kafka yoksa Redis Streams kullan
    """
    backend = os.getenv("EVENT_BUS_BACKEND", "kafka")
    if backend == "kafka":
        await _kafka_consumer()
    else:
        await _redis_consumer()


async def _kafka_consumer():
    servers = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092")
    from aiokafka import AIOKafkaConsumer
    from .database import AsyncSessionLocal
    from .agent.loop import run_agent_pipeline

    consumer = AIOKafkaConsumer(
        "customer.affected",
        bootstrap_servers=servers,
        group_id="agent-service",
        auto_offset_reset="latest",
    )

    try:
        await consumer.start()
        print("✅ Kafka consumer başladı: customer.affected")
        async for msg in consumer:
            try:
                payload = json.loads(msg.value.decode())
                customer_id = payload.get("customer_id")
                event_id = payload.get("event_id")
                if customer_id and event_id:
                    asyncio.create_task(
                        _process_customer(customer_id, event_id)
                    )
            except Exception as e:
                print(f"Consumer hata: {e}")
    except Exception as e:
        print(f"Kafka bağlantı hatası: {e}")
    finally:
        await consumer.stop()


async def _redis_consumer():
    """Redis Streams yedek consumer."""
    import redis.asyncio as aioredis
    from .agent.loop import run_agent_pipeline

    r = aioredis.from_url(os.getenv("REDIS_URL", "redis://redis:6379"))
    last_id = "$"
    print("✅ Redis Streams consumer başladı: customer.affected")

    while True:
        try:
            messages = await r.xread({"customer.affected": last_id}, block=1000, count=10)
            for stream, msgs in messages:
                for msg_id, fields in msgs:
                    last_id = msg_id
                    try:
                        data = fields.get(b"data", b"{}")
                        payload = json.loads(data.decode())
                        customer_id = payload.get("customer_id")
                        event_id = payload.get("event_id")
                        if customer_id and event_id:
                            asyncio.create_task(_process_customer(customer_id, event_id))
                    except Exception as e:
                        print(f"Redis consumer hata: {e}")
        except Exception as e:
            print(f"Redis xread hata: {e}")
            await asyncio.sleep(2)


async def _process_customer(customer_id: str, event_id: str):
    """Tek müşteri için ajan pipeline çalıştır ve planı kaydet."""
    from .database import AsyncSessionLocal
    from .models import Plan, AgentRun, AgentStep
    from .agent.loop import run_agent_pipeline
    from .routes.agent import publish_sse
    import uuid

    plan_id = str(uuid.uuid4())
    run_id = str(uuid.uuid4())

    async def step_cb(step):
        await publish_sse("agent_step", {"plan_id": plan_id, "step": step})

    result = await run_agent_pipeline(customer_id, event_id, step_cb)

    async with AsyncSessionLocal() as db:
        if result.get("devir_gerekli"):
            plan = Plan(id=plan_id, event_id=event_id, customer_id=customer_id,
                       oncelik="normal", erteleme_ay=0, belgeler=[],
                       mesaj="", durum="devredildi", neden_devir="ajan_hatasi")
            db.add(plan)
            await db.commit()
            await publish_sse("plan.escalated", {"plan_id": plan_id, "neden": "ajan_hatasi"})
            return

        plan = Plan(
            id=plan_id, event_id=event_id, customer_id=customer_id,
            oncelik=result["oncelik"], erteleme_ay=result["erteleme_ay"],
            belgeler=result["belgeler"], mesaj=result["mesaj"], durum="taslak",
        )
        db.add(plan)

        run = AgentRun(id=run_id, plan_id=plan_id, customer_id=customer_id,
                      ajan="planlayici+iletisimci",
                      adim_sayisi=len(result["steps"]), sure_ms=result["sure_ms"])
        db.add(run)

        for step in result["steps"]:
            db.add(AgentStep(run_id=run_id, adim=step.get("adim", 0),
                            ajan=step.get("ajan", "planlayici"),
                            arac=step.get("arac"), girdi=step.get("girdi"),
                            cikti=step.get("cikti"), sure_ms=step.get("sure_ms", 0)))
        await db.commit()

    await publish_sse("plan.drafted", {
        "plan_id": plan_id, "customer_id": customer_id,
        "oncelik": result["oncelik"], "erteleme_ay": result["erteleme_ay"], "durum": "taslak",
    })


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.execute(text("CREATE SCHEMA IF NOT EXISTS agent"))
        await conn.execute(text("CREATE SCHEMA IF NOT EXISTS audit"))
        await conn.run_sync(Base.metadata.create_all)

    # Kafka/Redis consumer arka planda
    task = asyncio.create_task(start_kafka_consumer())

    yield

    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title="Afet Modu — agent-service",
    description="Ajan A (Planlayıcı) + Ajan B (İletişimci) · SSE canlı bildirim · Kafka consumer",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])

app.include_router(agent_router, prefix="/agent", tags=["agent"])


@app.get("/health")
async def health():
    return {"status": "ok", "service": "agent-service"}
