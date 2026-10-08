"""
Ajan Döngüsü — Kendi tool-calling döngüsü
openai SDK → OpenRouter (model: ortam değişkeni)
Araç girdi/çıktıları Pydantic ile doğrulanır.
Her adım agent_steps tablosuna yazılır.

Ajan A (Planlayıcı): müşteri inceleme, öncelik, taslak
Ajan B (İletişimci): sakin, kısa, kişiselleştirilmiş Türkçe bildirim
"""
import json
import os
import time
import uuid
from datetime import datetime, timezone
from typing import Callable

from openai import AsyncOpenAI

from .tools import TOOLS, execute_tool

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
MODEL_PLANNER = os.getenv("MODEL_PLANNER", "openai/gpt-4o-mini")
MODEL_COMMUNICATOR = os.getenv("MODEL_COMMUNICATOR", "openai/gpt-4o-mini")
AGENT_MAX_STEPS = int(os.getenv("AGENT_MAX_STEPS", "8"))

# OpenAI SDK → OpenRouter
client = AsyncOpenAI(
    api_key=OPENROUTER_API_KEY,
    base_url="https://openrouter.ai/api/v1",
)

PLANNER_SYSTEM = """Sen Afet Modu'nun Planlayıcı ajanısın.
Görevin: afet bölgesindeki müşteriyi incele, önceliği belirle, erteleme taslağı hazırla ve belgeleri listele.

KURALLAR:
- Araçları kullan; kendin sayı uydurama, karar veremezsin.
- En fazla {max_steps} adım kullanabilirsin.
- Erteleme süresi üst sınırı araç tarafından otomatik uygulanır; sen aşamazsın.
- Sonunda şu JSON formatında özet döndür:
  {{"oncelik": "yuksek|normal", "erteleme_ay": <sayı>, "belgeler": [...], "loan_id": "<id>", "loan_type": "<tur>", "musteri_adi": "<ad>", "il": "<il>"}}
""".format(max_steps=AGENT_MAX_STEPS)

COMMUNICATOR_SYSTEM = """Sen Afet Modu'nun İletişimci ajanısın.
Görevin: Planlayıcı'nın verdiği plan özetine göre müşteriye kısa, sakin, kişiselleştirilmiş Türkçe bildirim yaz.

KURALLAR:
- Kesin söz verme: "ertelendi" yerine "değerlendirmeye alınmak üzere hazırlandı" de.
- Ticari dil yasak: kampanya, fırsat, çapraz satış kesinlikle yok.
- Yaşlı/hassas müşterilerde sade, yavaş dil; temsilci seçeneğini öne çıkar.
- Mesaj kısa olsun: 3-5 cümle yeter.
- Şu formatı kullan:
  Sayın [Ad] [Hanım/Bey], geçmiş olsun. [Kredi türü] krediniz için [X] aylık erteleme talebiniz, değerlendirmeye alınmak üzere hazırlandı. [Onay veya temsilci mesajı]
  Gerekli belgeler: [liste]
"""


async def run_planner(
    customer_id: str,
    step_callback: Callable | None = None,
) -> dict:
    """
    Ajan A (Planlayıcı) döngüsü.
    step_callback: her adımda çağrılır (SSE için).
    """
    messages = [
        {"role": "system", "content": PLANNER_SYSTEM},
        {"role": "user", "content": f"Müşteri ID: {customer_id} — Bu müşteri için erteleme planı hazırla."},
    ]

    steps = []
    step_num = 0

    for _ in range(AGENT_MAX_STEPS):
        step_num += 1
        t0 = time.monotonic()

        response = await client.chat.completions.create(
            model=MODEL_PLANNER,
            messages=messages,
            tools=TOOLS,
            tool_choice="auto",
            temperature=0.1,
        )

        msg = response.choices[0].message
        messages.append(msg)

        # Araç çağrısı yoksa bitti
        if not msg.tool_calls:
            sure_ms = int((time.monotonic() - t0) * 1000)
            steps.append({"adim": step_num, "ajan": "planlayici", "arac": None,
                         "cikti": msg.content, "sure_ms": sure_ms})
            if step_callback:
                await step_callback(steps[-1])
            break

        # Araçları yürüt
        for tc in msg.tool_calls:
            arac_adi = tc.function.name
            args = json.loads(tc.function.arguments)
            t1 = time.monotonic()

            try:
                sonuc = await execute_tool(arac_adi, args)
            except Exception as e:
                sonuc = {"hata": str(e)}

            sure_ms = int((time.monotonic() - t1) * 1000)
            step_info = {"adim": step_num, "ajan": "planlayici",
                        "arac": arac_adi, "girdi": args, "cikti": sonuc, "sure_ms": sure_ms}
            steps.append(step_info)
            if step_callback:
                await step_callback(step_info)

            messages.append({
                "role": "tool",
                "tool_call_id": tc.id,
                "content": json.dumps(sonuc, ensure_ascii=False),
            })

    # Son mesajı parse et
    last_content = messages[-1].get("content", "") if isinstance(messages[-1], dict) else (messages[-1].content or "")
    try:
        # JSON özeti çıkarmaya çalış
        plan_summary = json.loads(last_content)
    except Exception:
        # JSON değilse ham metni döndür
        plan_summary = {"raw": last_content}

    return {"steps": steps, "plan_summary": plan_summary}


async def run_communicator(
    plan_summary: dict,
    musteri_adi: str,
    oncelik: str,
) -> str:
    """
    Ajan B (İletişimci) — Kısa, sakin, kişiselleştirilmiş Türkçe bildirim.
    """
    user_msg = f"""Plan özeti:
- Müşteri: {musteri_adi}
- Öncelik: {oncelik}
- Erteleme: {plan_summary.get('erteleme_ay', '?')} ay
- Belgeler: {', '.join(plan_summary.get('belgeler', []))}
- İl: {plan_summary.get('il', '?')}
- Kredi türü: {plan_summary.get('loan_type', '?')}

Bu müşteri için bildirim metnini yaz."""

    response = await client.chat.completions.create(
        model=MODEL_COMMUNICATOR,
        messages=[
            {"role": "system", "content": COMMUNICATOR_SYSTEM},
            {"role": "user", "content": user_msg},
        ],
        temperature=0.3,
        max_tokens=400,
    )

    return response.choices[0].message.content or ""


async def run_agent_pipeline(
    customer_id: str,
    event_id: str,
    step_callback: Callable | None = None,
) -> dict:
    """
    Tam ajan pipeline'ı: Planlayıcı → İletişimci
    Döndürür: {oncelik, erteleme_ay, belgeler, mesaj, steps, sure_ms}
    """
    t0 = time.monotonic()

    # MOCK modu: API anahtarı yoksa
    if not OPENROUTER_API_KEY or OPENROUTER_API_KEY == "your_openrouter_api_key_here":
        return await _mock_pipeline(customer_id, step_callback)

    try:
        # Ajan A
        planner_result = await run_planner(customer_id, step_callback)
        plan_summary = planner_result["plan_summary"]
        steps = planner_result["steps"]

        musteri_adi = plan_summary.get("musteri_adi", "Sayın Müşteri")
        oncelik = plan_summary.get("oncelik", "normal")
        erteleme_ay = plan_summary.get("erteleme_ay", 3)
        belgeler = plan_summary.get("belgeler", ["kimlik", "hasar_tespit_ikametgah"])

        # Ajan B
        mesaj = await run_communicator(plan_summary, musteri_adi, oncelik)

    except Exception as e:
        # Güvenli hata: temsilciye devret
        return {
            "oncelik": "normal",
            "erteleme_ay": 0,
            "belgeler": [],
            "mesaj": "",
            "hata": str(e),
            "devir_gerekli": True,
            "steps": [],
            "sure_ms": int((time.monotonic() - t0) * 1000),
        }

    return {
        "oncelik": oncelik,
        "erteleme_ay": erteleme_ay,
        "belgeler": belgeler,
        "mesaj": mesaj,
        "steps": steps,
        "sure_ms": int((time.monotonic() - t0) * 1000),
    }


async def _mock_pipeline(customer_id: str, step_callback) -> dict:
    """
    Demo/test için API anahtarı olmadan mock çıktı.
    Araçları gerçekten çağırır, sadece LLM yerine sabit yanıtlar verir.
    """
    steps = []

    async def fake_step(info):
        steps.append(info)
        if step_callback:
            await step_callback(info)

    # Gerçek araç çağrıları
    await fake_step({"adim": 1, "ajan": "planlayici", "arac": "musteri_bilgisi_getir", "girdi": {"customer_id": customer_id}, "sure_ms": 50})
    from .tools import musteri_bilgisi_getir
    musteri_bilgi = await musteri_bilgisi_getir(customer_id)

    if "hata" in musteri_bilgi:
        return {"oncelik": "normal", "erteleme_ay": 3, "belgeler": ["kimlik"], "mesaj": "Müşteri bilgisi alınamadı.", "steps": steps, "sure_ms": 100}

    krediler = musteri_bilgi.get("krediler", [])
    ilk_kredi = krediler[0] if krediler else {}
    lt = ilk_kredi.get("tur", "ihtiyac")
    dask_var = ilk_kredi.get("dask_var")
    hassas = musteri_bilgi["hassas"]
    yas = musteri_bilgi["yas"]
    loan_id = ilk_kredi.get("loan_id", "")

    from .tools import oncelik_belirle, belge_listesi_getir, erteleme_taslagi_olustur

    onc = await oncelik_belirle(yas, musteri_bilgi.get("engelli", False))
    await fake_step({"adim": 2, "ajan": "planlayici", "arac": "oncelik_belirle", "cikti": onc, "sure_ms": 10})

    belgeler_sonuc = await belge_listesi_getir(customer_id, lt, dask_var)
    await fake_step({"adim": 3, "ajan": "planlayici", "arac": "belge_listesi_getir", "cikti": belgeler_sonuc, "sure_ms": 10})

    onerilen = ilk_kredi.get("onerilen_erteleme_ay", 3)
    taslak = await erteleme_taslagi_olustur(customer_id, loan_id, onerilen, lt, hassas)
    await fake_step({"adim": 4, "ajan": "planlayici", "arac": "erteleme_taslagi_olustur", "cikti": taslak, "sure_ms": 10})

    oncelik_val = onc["oncelik"]
    erteleme_ay = taslak["onaylanan_erteleme_ay"]
    belgeler = belgeler_sonuc["belgeler"]
    ad = musteri_bilgi["ad"]
    soyad = musteri_bilgi["soyad"]
    cinsiyet_eki = "Hanım" if ad[-1] in "aeiouAEIOUÇĞIİÖÜçğıöü" and ad[-1] not in "oöuü" else "Hanım"

    # Mock İletişimci mesajı
    belge_str = ", ".join(belgeler)
    if oncelik_val == "yuksek":
        mesaj = (f"Sayın {ad} {soyad[0]}. {cinsiyet_eki}, geçmiş olsun. "
                f"{lt.capitalize()} krediniz için {erteleme_ay} aylık erteleme talebiniz, "
                f"değerlendirmeye alınmak üzere hazırlandı. "
                f"Siz uygun görürseniz onayınızla ilerleyebiliriz; "
                f"dilerseniz temsilcimiz sizi arasın. "
                f"Gerekli belgeler: {belge_str}.")
    else:
        mesaj = (f"Sayın {ad} {soyad[0]}. {cinsiyet_eki}, geçmiş olsun. "
                f"{lt.capitalize()} krediniz için {erteleme_ay} aylık erteleme talebiniz, "
                f"değerlendirmeye alınmak üzere hazırlandı. "
                f"Onayınızı bekliyoruz. "
                f"Gerekli belgeler: {belge_str}.")

    await fake_step({"adim": 5, "ajan": "iletisimci", "arac": None, "cikti": {"mesaj": mesaj[:80] + "..."}, "sure_ms": 20})

    return {
        "oncelik": oncelik_val,
        "erteleme_ay": erteleme_ay,
        "belgeler": belgeler,
        "mesaj": mesaj,
        "steps": steps,
        "sure_ms": 100,
        "mock": True,
    }
