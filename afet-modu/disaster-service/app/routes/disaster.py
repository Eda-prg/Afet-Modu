"""
disaster-service — Afet tetikleme, etkilenen müşteri eşleme, Kafka yayını
EventBus arayüzü: Kafka çalışmazsa Redis Streams'e geçer
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import os
import json
import asyncio
import httpx
import uuid

from ..database import get_db
from ..models import DisasterEvent, AffectedCustomer

router = APIRouter()

CORE_SERVICE_URL = os.getenv("CORE_SERVICE_URL", "http://core-service:8002")
EVENT_BUS_BACKEND = os.getenv("EVENT_BUS_BACKEND", "kafka")
KAFKA_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092")
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379")

YASLI_SINIR = 65


# ── Pydantic ─────────────────────────────────────────────────────

class TriggerRequest(BaseModel):
    tur: str = "deprem"
    buyukluk: float
    iller: List[str]
    zaman: Optional[datetime] = None
    kaynak: str = "SIMULASYON"


# ── EventBus ─────────────────────────────────────────────────────

async def publish_event(topic: str, payload: dict):
    """EventBus arayüzü: Kafka veya Redis Streams"""
    if EVENT_BUS_BACKEND == "kafka":
        await _kafka_publish(topic, payload)
    else:
        await _redis_publish(topic, payload)


async def _kafka_publish(topic: str, payload: dict):
    try:
        from aiokafka import AIOKafkaProducer
        producer = AIOKafkaProducer(bootstrap_servers=KAFKA_SERVERS)
        await producer.start()
        await producer.send_and_wait(topic, json.dumps(payload).encode())
        await producer.stop()
    except Exception as e:
        print(f"⚠️  Kafka publish hatası ({topic}): {e}")
        # Otomatik Redis yedek
        await _redis_publish(topic, payload)


async def _redis_publish(topic: str, payload: dict):
    try:
        import redis.asyncio as aioredis
        r = aioredis.from_url(REDIS_URL)
        await r.xadd(topic, {"data": json.dumps(payload)})
        await r.aclose()
    except Exception as e:
        print(f"❌ Redis publish hatası ({topic}): {e}")


# ── Rotalar ──────────────────────────────────────────────────────

@router.post("/trigger", status_code=201)
async def trigger_disaster(req: TriggerRequest, db: AsyncSession = Depends(get_db)):
    """
    Afet simülasyonu başlat.
    Admin yetkisi bu örnekte basitleştirildi; production'da JWT RBAC kontrolü ekleyin.
    """
    if not req.iller:
        raise HTTPException(status_code=422, detail="En az bir il belirtilmelidir")

    zaman = req.zaman or datetime.now(timezone.utc)
    event_id = str(uuid.uuid4())

    # 1. Afet olayını kaydet
    event = DisasterEvent(
        id=event_id,
        tur=req.tur,
        buyukluk=req.buyukluk,
        iller=req.iller,
        zaman=zaman,
        kaynak=req.kaynak,
    )
    db.add(event)
    await db.flush()

    # 2. Etkilenen müşterileri core-service'den çek
    affected = []
    yuksek_oncelikli = 0

    async with httpx.AsyncClient(timeout=30) as client:
        for il in req.iller:
            page = 1
            while True:
                resp = await client.get(
                    f"{CORE_SERVICE_URL}/customers",
                    params={"il": il, "page": page, "size": 200},
                )
                if resp.status_code != 200:
                    break
                data = resp.json()
                items = data.get("items", [])
                if not items:
                    break

                for c in items:
                    oncelik = "yuksek" if (c["yas"] >= YASLI_SINIR or c.get("engelli")) else "normal"
                    ac = AffectedCustomer(
                        event_id=event_id,
                        customer_id=c["id"],
                        il=il,
                        oncelik=oncelik,
                    )
                    db.add(ac)
                    affected.append({"customer_id": c["id"], "il": il, "oncelik": oncelik})
                    if oncelik == "yuksek":
                        yuksek_oncelikli += 1

                if len(items) < 200:
                    break
                page += 1

    await db.commit()

    # 3. Kafka'ya disaster.declared yayınla
    await publish_event("disaster.declared", {
        "event_id": event_id,
        "tur": req.tur,
        "buyukluk": req.buyukluk,
        "iller": req.iller,
        "zaman": zaman.isoformat(),
        "kaynak": req.kaynak,
    })

    # 4. Her müşteri için customer.affected yayınla (arka planda)
    asyncio.create_task(_publish_affected(affected, event_id))

    return {
        "event_id": event_id,
        "etkilenen_musteri_sayisi": len(affected),
        "yuksek_oncelikli": yuksek_oncelikli,
        "kafka_yayinlandi": True,
        "backend": EVENT_BUS_BACKEND,
        "mesaj": "Afet bildirimi islendi, ajan sistemi baslatildi.",
    }


async def _publish_affected(affected: list, event_id: str):
    """Etkilenen müşterileri Kafka'ya paralel yayınla."""
    from datetime import timezone
    now = datetime.now(timezone.utc).isoformat()
    tasks = [
        publish_event("customer.affected", {
            "event_id": event_id,
            "customer_id": a["customer_id"],
            "il": a["il"],
            "oncelik": a["oncelik"],
            "eslesme_zamani": now,
        })
        for a in affected
    ]
    await asyncio.gather(*tasks, return_exceptions=True)


@router.get("/events")
async def list_events(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DisasterEvent).order_by(DisasterEvent.created_at.desc()))
    events = result.scalars().all()

    out = []
    for e in events:
        cnt = await db.execute(
            select(func.count()).where(AffectedCustomer.event_id == e.id)
        )
        out.append({
            "id": e.id, "tur": e.tur, "buyukluk": e.buyukluk,
            "iller": e.iller, "zaman": e.zaman, "kaynak": e.kaynak,
            "etkilenen_sayisi": cnt.scalar(),
        })
    return {"total": len(out), "items": out}


@router.get("/{event_id}/affected")
async def list_affected(event_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(AffectedCustomer)
        .where(AffectedCustomer.event_id == event_id)
        .order_by(AffectedCustomer.oncelik.desc(), AffectedCustomer.eslesme_zamani)
    )
    items = result.scalars().all()

    return {
        "event_id": event_id,
        "total": len(items),
        "items": [
            {
                "customer_id": a.customer_id,
                "il": a.il,
                "oncelik": a.oncelik,
                "eslesme_zamani": a.eslesme_zamani,
            }
            for a in items
        ],
    }
