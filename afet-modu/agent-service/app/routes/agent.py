"""
agent-service rotaları — /agent/run, /agent/plans, approve, escalate, SSE stream
"""
import asyncio
import json
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

import redis.asyncio as aioredis
import os

from ..database import get_db, AsyncSessionLocal
from ..models import Plan, AgentRun, AgentStep, AuditLog
from ..agent.loop import run_agent_pipeline

router = APIRouter()

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379")
SSE_CHANNEL = "afet:sse"


# ── Kafka/Redis olay yayını ───────────────────────────────────────

async def publish_sse(event_type: str, payload: dict):
    """SSE için Redis Pub/Sub'a yayınla."""
    try:
        r = aioredis.from_url(REDIS_URL)
        await r.publish(SSE_CHANNEL, json.dumps({"type": event_type, **payload}))
        await r.aclose()
    except Exception as e:
        print(f"SSE publish hata: {e}")


async def publish_event(topic: str, payload: dict):
    """Kafka veya Redis Streams'e olay yayınla."""
    backend = os.getenv("EVENT_BUS_BACKEND", "kafka")
    if backend == "kafka":
        try:
            from aiokafka import AIOKafkaProducer
            servers = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092")
            producer = AIOKafkaProducer(bootstrap_servers=servers)
            await producer.start()
            await producer.send_and_wait(topic, json.dumps(payload).encode())
            await producer.stop()
            return
        except Exception:
            pass
    try:
        r = aioredis.from_url(REDIS_URL)
        await r.xadd(topic, {"data": json.dumps(payload)})
        await r.aclose()
    except Exception as e:
        print(f"Event publish hata: {e}")


# ── Pydantic ─────────────────────────────────────────────────────

class RunRequest(BaseModel):
    customer_id: str
    event_id: str


class EscalateRequest(BaseModel):
    neden: str = "musteri_talebi"  # musteri_talebi | ajan_hatasi | sure_asimi


# ── Rotalar ──────────────────────────────────────────────────────

@router.post("/run", status_code=201)
async def run_agent(req: RunRequest, db: AsyncSession = Depends(get_db)):
    """Manuel ajan çalıştırma (test ve yeniden deneme için)."""
    plan_id = str(uuid.uuid4())
    run_id = str(uuid.uuid4())

    # Adımları SSE aracılığıyla canlı yayınla
    async def step_callback(step: dict):
        await publish_sse("agent_step", {"plan_id": plan_id, "step": step})

    result = await run_agent_pipeline(req.customer_id, req.event_id, step_callback)

    # Hata → temsilciye devret
    if result.get("devir_gerekli"):
        plan = Plan(
            id=plan_id, event_id=req.event_id, customer_id=req.customer_id,
            oncelik="normal", erteleme_ay=0, belgeler=[],
            mesaj="", durum="devredildi", neden_devir="ajan_hatasi",
        )
        db.add(plan)
        await db.commit()
        await publish_sse("plan.escalated", {"plan_id": plan_id, "neden": "ajan_hatasi"})
        return {"plan_id": plan_id, "durum": "devredildi", "hata": result.get("hata")}

    # Planı kaydet
    plan = Plan(
        id=plan_id,
        event_id=req.event_id,
        customer_id=req.customer_id,
        oncelik=result["oncelik"],
        erteleme_ay=result["erteleme_ay"],
        belgeler=result["belgeler"],
        mesaj=result["mesaj"],
        durum="taslak",
    )
    db.add(plan)

    # AgentRun kaydet
    agent_run = AgentRun(
        id=run_id, plan_id=plan_id, customer_id=req.customer_id,
        ajan="planlayici+iletisimci",
        adim_sayisi=len(result["steps"]),
        sure_ms=result["sure_ms"],
    )
    db.add(agent_run)

    # AgentStep kaydet
    for step in result["steps"]:
        db.add(AgentStep(
            run_id=run_id,
            adim=step.get("adim", 0),
            ajan=step.get("ajan", "planlayici"),
            arac=step.get("arac"),
            girdi=step.get("girdi"),
            cikti=step.get("cikti"),
            sure_ms=step.get("sure_ms", 0),
        ))

    await db.commit()

    # SSE: plan hazır bildirimi
    await publish_sse("plan.drafted", {
        "plan_id": plan_id,
        "customer_id": req.customer_id,
        "oncelik": result["oncelik"],
        "erteleme_ay": result["erteleme_ay"],
        "durum": "taslak",
    })

    return {
        "run_id": run_id,
        "plan_id": plan_id,
        "customer_id": req.customer_id,
        "oncelik": result["oncelik"],
        "erteleme_ay": result["erteleme_ay"],
        "belgeler": result["belgeler"],
        "mesaj": result["mesaj"],
        "adim_sayisi": len(result["steps"]),
        "sure_ms": result["sure_ms"],
        "durum": "taslak",
        "mock": result.get("mock", False),
    }


@router.get("/plans")
async def list_plans(
    event_id: Optional[str] = Query(None),
    customer_id: Optional[str] = Query(None),
    durum: Optional[str] = Query(None),
    oncelik: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    query = select(Plan)
    if event_id:
        query = query.where(Plan.event_id == event_id)
    if customer_id:
        query = query.where(Plan.customer_id == customer_id)
    if durum:
        query = query.where(Plan.durum == durum)
    if oncelik:
        query = query.where(Plan.oncelik == oncelik)

    # Öncelik sırasına göre: yüksek önce
    query = query.order_by(
        Plan.oncelik.desc(), Plan.created_at
    )

    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar()
    result = await db.execute(query.offset((page - 1) * size).limit(size))
    plans = result.scalars().all()

    return {
        "total": total,
        "page": page,
        "items": [_plan_dict(p) for p in plans],
    }


@router.get("/plans/{plan_id}")
async def get_plan(plan_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Plan).where(Plan.id == plan_id))
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan bulunamadı")

    # Ajan adımları
    steps_result = await db.execute(
        select(AgentStep)
        .join(AgentRun, AgentStep.run_id == AgentRun.id)
        .where(AgentRun.plan_id == plan_id)
        .order_by(AgentStep.adim)
    )
    steps = steps_result.scalars().all()

    d = _plan_dict(plan)
    d["adimlar"] = [
        {"adim": s.adim, "ajan": s.ajan, "arac": s.arac,
         "girdi": s.girdi, "cikti": s.cikti, "sure_ms": s.sure_ms}
        for s in steps
    ]
    return d


@router.post("/plans/{plan_id}/approve")
async def approve_plan(plan_id: str, db: AsyncSession = Depends(get_db)):
    """
    Müşteri planı onaylar.
    HİÇBİR ERTELEME OTOMATİK ONAYLANMAZ — banka çalışanı kontrol kuyruğuna gider.
    """
    plan = await _get_plan_or_404(plan_id, db)

    if plan.durum != "taslak":
        raise HTTPException(status_code=409, detail=f"Plan zaten '{plan.durum}' durumunda")

    plan.durum = "onaylandi"
    plan.onay_zamani = datetime.now(timezone.utc)

    # Denetim izi
    db.add(AuditLog(
        kim="musteri", ne="plan_approved",
        kayit_id=plan_id,
        detay={"customer_id": plan.customer_id, "onay_zamani": plan.onay_zamani.isoformat()},
    ))
    await db.commit()

    # Kafka: plan.approved
    await publish_event("plan.approved", {
        "plan_id": plan_id, "customer_id": plan.customer_id,
        "onay_zamani": plan.onay_zamani.isoformat(),
    })
    await publish_sse("plan.approved", {
        "plan_id": plan_id, "customer_id": plan.customer_id,
    })

    return {
        "plan_id": plan_id,
        "durum": "onaylandi",
        "onay_zamani": plan.onay_zamani,
        "mesaj": "Talebiniz degerlendirme icin banka calisanina iletildi. "
                 "Hicbir erteleme otomatik gerceklesmez.",
    }


@router.post("/plans/{plan_id}/escalate")
async def escalate_plan(plan_id: str, req: EscalateRequest, db: AsyncSession = Depends(get_db)):
    """Temsilciye devret. Müşteri asla sahipsiz kalmaz."""
    plan = await _get_plan_or_404(plan_id, db)

    if plan.durum not in ("taslak",):
        raise HTTPException(status_code=409, detail=f"Plan '{plan.durum}' durumunda, devir yapılamaz")

    plan.durum = "devredildi"
    plan.neden_devir = req.neden

    db.add(AuditLog(
        kim="sistem", ne="plan_escalated",
        kayit_id=plan_id,
        detay={"neden": req.neden, "customer_id": plan.customer_id},
    ))
    await db.commit()

    await publish_event("plan.escalated", {
        "plan_id": plan_id, "customer_id": plan.customer_id, "neden": req.neden,
    })
    await publish_sse("plan.escalated", {
        "plan_id": plan_id, "neden": req.neden,
    })

    return {
        "plan_id": plan_id,
        "durum": "devredildi",
        "neden": req.neden,
        "mesaj": "Temsilcimiz en kisa surede sizi arayacaktir.",
    }


@router.get("/stream")
async def sse_stream(event_id: Optional[str] = Query(None)):
    """
    Server-Sent Events — Redis Pub/Sub üzerinden canlı bildirimler.
    Next.js ön yüzü bu akışı dinler.
    """
    async def generator():
        try:
            r = aioredis.from_url(REDIS_URL)
            pubsub = r.pubsub()
            await pubsub.subscribe(SSE_CHANNEL)
            yield f"data: {json.dumps({'type': 'connected', 'message': 'Afet Modu SSE bağlantısı kuruldu'})}\n\n"

            async for message in pubsub.listen():
                if message["type"] == "message":
                    data = message["data"]
                    if isinstance(data, bytes):
                        data = data.decode()
                    # event_id filtresi
                    try:
                        payload = json.loads(data)
                        if event_id and payload.get("event_id") and payload.get("event_id") != event_id:
                            continue
                    except Exception:
                        pass
                    yield f"data: {data}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# ── Yardımcı ─────────────────────────────────────────────────────

def _plan_dict(p: Plan) -> dict:
    return {
        "plan_id": p.id,
        "event_id": p.event_id,
        "customer_id": p.customer_id,
        "oncelik": p.oncelik,
        "erteleme_ay": p.erteleme_ay,
        "belgeler": p.belgeler,
        "mesaj": p.mesaj,
        "durum": p.durum,
        "neden_devir": p.neden_devir,
        "onay_zamani": p.onay_zamani,
        "created_at": p.created_at,
    }


async def _get_plan_or_404(plan_id: str, db: AsyncSession) -> Plan:
    result = await db.execute(select(Plan).where(Plan.id == plan_id))
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan bulunamadı")
    return plan
