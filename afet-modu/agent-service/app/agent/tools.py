"""
Ajan Araçları (Tool Kit) — 4 araç
Kritik kurallar (süre, belge) KODDA durur; LLM sadece yorumlama ve dil için.
Ajan, üst sınırı aşan bir süre öneremez.
"""
import httpx
import os
from typing import Optional

CORE_SERVICE_URL = os.getenv("CORE_SERVICE_URL", "http://core-service:8002")

# Erteleme kuralları — tek kaynak (case dokümantasyonundan)
ERTELEME_KURALLARI = {
    "konut":   {"temel": 3, "hassas_ek": 1, "ust_sinir": 6},
    "ihtiyac": {"temel": 3, "hassas_ek": 1, "ust_sinir": 6},
    "kart":    {"temel": 2, "hassas_ek": 1, "ust_sinir": 6},
}
YASLI_SINIR = 65


# ── Araç Tanımları (OpenAI tool_calls formatı) ───────────────────

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "musteri_bilgisi_getir",
            "description": "Müşterinin kredi, yaş, hassasiyet, DASK durumu ve önerilen erteleme süresi bilgisini getirir.",
            "parameters": {
                "type": "object",
                "properties": {
                    "customer_id": {"type": "string", "description": "Müşteri kimlik numarası"}
                },
                "required": ["customer_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "belge_listesi_getir",
            "description": "Müşteriye özel gerekli belge listesini döndürür.",
            "parameters": {
                "type": "object",
                "properties": {
                    "customer_id": {"type": "string"},
                    "loan_type": {"type": "string", "enum": ["konut", "ihtiyac", "kart"]},
                    "dask_var": {"type": ["boolean", "null"]},
                },
                "required": ["customer_id", "loan_type"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "erteleme_taslagi_olustur",
            "description": "Erteleme taslağı açar. Yalnızca TASLAK; hiçbir erteleme onaylanmaz. Süre üst sınırı kodla zorlanır.",
            "parameters": {
                "type": "object",
                "properties": {
                    "customer_id": {"type": "string"},
                    "loan_id": {"type": "string"},
                    "onerilen_sure": {"type": "integer", "description": "Ay cinsinden önerilen erteleme süresi"},
                    "loan_type": {"type": "string", "enum": ["konut", "ihtiyac", "kart"]},
                    "hassas": {"type": "boolean"},
                },
                "required": ["customer_id", "loan_id", "onerilen_sure", "loan_type", "hassas"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "oncelik_belirle",
            "description": "Müşteri önceliğini belirler: yüksek (yaşlı 65+ veya engelli) veya normal.",
            "parameters": {
                "type": "object",
                "properties": {
                    "yas": {"type": "integer"},
                    "engelli": {"type": "boolean"},
                },
                "required": ["yas", "engelli"],
            },
        },
    },
]


# ── Araç Uygulama Fonksiyonları ───────────────────────────────────

async def musteri_bilgisi_getir(customer_id: str) -> dict:
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(f"{CORE_SERVICE_URL}/loans/customer/{customer_id}/summary")
        if resp.status_code != 200:
            return {"hata": f"Müşteri bulunamadı: {customer_id}"}
        data = resp.json()

    c = data["customer"]
    loans = data["loans"]
    hassas = c["hassas_durum"] or c.get("engelli", False)

    # Her kredi için önerilen erteleme süresini hesapla
    kredi_bilgileri = []
    for loan in loans:
        lt = loan["tur"]
        kural = ERTELEME_KURALLARI.get(lt, {"temel": 2, "hassas_ek": 1, "ust_sinir": 6})
        sure = kural["temel"]
        if hassas:
            sure += kural["hassas_ek"]
        sure = min(sure, kural["ust_sinir"])

        kredi_bilgileri.append({
            "loan_id": loan["id"],
            "tur": lt,
            "aylik_taksit": loan["aylik_taksit"],
            "kalan_borc": loan["kalan_borc"],
            "dask_var": loan["dask_var"],
            "onerilen_erteleme_ay": sure,
            "ertelenmesi_onerilen_taksit": loan["aylik_taksit"] * sure,
        })

    return {
        "customer_id": customer_id,
        "ad": c["ad"],
        "soyad": c["soyad"],
        "il": c["il"],
        "ilce": c["ilce"],
        "yas": c["yas"],
        "hassas": hassas,
        "krediler": kredi_bilgileri,
    }


async def belge_listesi_getir(customer_id: str, loan_type: str, dask_var: Optional[bool]) -> dict:
    belgeler = ["kimlik", "hasar_tespit_ikametgah"]
    if loan_type == "konut":
        belgeler.append("tapu")
        if dask_var is True:
            belgeler.append("dask_police_no")
        else:
            belgeler.append("dask_durum_temsilci_bilgi_verecek")
    return {"belgeler": belgeler}


async def erteleme_taslagi_olustur(
    customer_id: str, loan_id: str, onerilen_sure: int,
    loan_type: str, hassas: bool
) -> dict:
    """Süre üst sınırı KODLA zorlanır — ajan aşamaz."""
    kural = ERTELEME_KURALLARI.get(loan_type, {"temel": 2, "hassas_ek": 1, "ust_sinir": 6})
    temel = kural["temel"]
    if hassas:
        temel += kural["hassas_ek"]
    max_sure = kural["ust_sinir"]
    
    # Üst sınır kontrolü
    onaylanan_sure = min(onerilen_sure, temel, max_sure)

    return {
        "taslak_id": f"draft_{customer_id[:8]}_{loan_id[:8]}",
        "customer_id": customer_id,
        "loan_id": loan_id,
        "onaylanan_erteleme_ay": onaylanan_sure,
        "ust_sinir": max_sure,
        "not": "TASLAK — İnsan onayı bekliyor. Hiçbir erteleme otomatik onaylanmaz.",
    }


async def oncelik_belirle(yas: int, engelli: bool) -> dict:
    oncelik = "yuksek" if (yas >= YASLI_SINIR or engelli) else "normal"
    return {
        "oncelik": oncelik,
        "neden": (
            f"Yaşlı müşteri ({yas} yaş)" if yas >= YASLI_SINIR
            else "Engelli müşteri" if engelli
            else "Standart müşteri"
        ),
    }


# ── Araç Yürütücü ────────────────────────────────────────────────

async def execute_tool(name: str, args: dict) -> dict:
    if name == "musteri_bilgisi_getir":
        return await musteri_bilgisi_getir(args["customer_id"])
    elif name == "belge_listesi_getir":
        return await belge_listesi_getir(
            args["customer_id"], args["loan_type"], args.get("dask_var")
        )
    elif name == "erteleme_taslagi_olustur":
        return await erteleme_taslagi_olustur(
            args["customer_id"], args["loan_id"],
            args["onerilen_sure"], args["loan_type"], args["hassas"]
        )
    elif name == "oncelik_belirle":
        return await oncelik_belirle(args["yas"], args["engelli"])
    else:
        return {"hata": f"Bilinmeyen araç: {name}"}
