"""
Kafka Olay Sözleşmeleri — EventBus Arayüzü
Kafka çalışmazsa Redis Streams'e geçiş için soyut arayüz.
"""
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import json


# ── Olay Şemaları ────────────────────────────────────────────────

class DisasterDeclaredEvent(BaseModel):
    event_id: str
    tur: str
    buyukluk: float
    iller: List[str]
    zaman: datetime
    kaynak: str = "SIMULASYON"

    topic: str = "disaster.declared"


class CustomerAffectedEvent(BaseModel):
    event_id: str
    customer_id: str
    il: str
    eslesme_zamani: datetime

    topic: str = "customer.affected"


class PlanDraftedEvent(BaseModel):
    plan_id: str
    customer_id: str
    oncelik: str
    erteleme_ay: int
    durum: str = "taslak"

    topic: str = "plan.drafted"


class PlanApprovedEvent(BaseModel):
    plan_id: str
    customer_id: str
    onay_zamani: datetime

    topic: str = "plan.approved"


class PlanEscalatedEvent(BaseModel):
    plan_id: str
    customer_id: str
    neden: str  # musteri_talebi | ajan_hatasi | sure_asimi

    topic: str = "plan.escalated"


# ── EventBus Arayüzü ─────────────────────────────────────────────

class EventBus:
    """
    Soyut EventBus arayüzü.
    Kafka çalışırsa KafkaEventBus, yoksa RedisEventBus kullanılır.
    Servis koduna dokunulmadan geçiş yapılır.
    """
    async def publish(self, event: BaseModel) -> None:
        raise NotImplementedError

    async def subscribe(self, topic: str):
        raise NotImplementedError
