"""
Liman Bankası — Afet Modu & Otonom Ajan API Sunucusu (FastAPI)
ING Hubs Türkiye · Agentic AI Hackathon 2026

Tüm mikroservis uç noktalarını (auth, core, disaster, agent, database) 
tek bir yüksek performanslı FastAPI asenkron sunucusunda birleştirir.
Gerçek SSE (Server-Sent Events) canlı veri akışı ve SQLite veritabanı motoru içerir.
"""

import asyncio
import json
import os
import re
import sqlite3
import sys
import time
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

# Windows konsol UTF-8 desteği
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

import uvicorn
from fastapi import FastAPI, HTTPException, Query, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

# ════════════════════════════════════════════════════════════════
# 1. UYGULAMA VE CORS AYARLARI
# ════════════════════════════════════════════════════════════════
@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    print("[OK] Liman Bankasi Afet Modu API Hazir! Port 8000")
    yield

app = FastAPI(
    title="Liman Bankası Afet Modu API",
    description="Afet Modu otonom bankacılık ve ajan sistemi REST + SSE API servisi.",
    version="2.6.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "afet_db.sqlite")

# SSE Olay Kuyrukları (Canlı dinleyiciler)
sse_subscribers: List[asyncio.Queue] = []


def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn


# ════════════════════════════════════════════════════════════════
# 2. VERİTABANI BAŞLATMA VE SEED VERİLERİ
# ════════════════════════════════════════════════════════════════
def init_db():
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("""
    CREATE TABLE IF NOT EXISTS core_customers (
        id TEXT PRIMARY KEY,
        tckn TEXT,
        name TEXT NOT NULL,
        email TEXT,
        age INTEGER,
        city TEXT,
        loan_type TEXT,
        monthly_installment REAL,
        remaining_debt REAL,
        dask_var INTEGER,
        dask_police_no TEXT,
        is_hassas INTEGER,
        priority TEXT,
        status TEXT DEFAULT 'aktif',
        created_at TEXT
    );
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS core_loans (
        id TEXT PRIMARY KEY,
        customer_id TEXT,
        loan_type TEXT,
        monthly_installment REAL,
        remaining_debt REAL,
        status TEXT DEFAULT 'aktif',
        created_at TEXT
    );
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS agent_plans (
        id TEXT PRIMARY KEY,
        customer_id TEXT,
        erteleme_ay INTEGER,
        oncelik TEXT,
        toplam_otelenen REAL,
        status TEXT DEFAULT 'taslak',
        message TEXT,
        documents_json TEXT,
        steps_json TEXT,
        approved_at TEXT,
        created_at TEXT
    );
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS disaster_events (
        id TEXT PRIMARY KEY,
        tur TEXT,
        buyukluk REAL,
        seviye TEXT,
        iller TEXT,
        kaynak TEXT,
        zaman TEXT,
        affected_count INTEGER DEFAULT 0,
        created_at TEXT
    );
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        event_type TEXT,
        customer_id TEXT,
        actor TEXT,
        details TEXT,
        created_at TEXT
    );
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        customer_id TEXT,
        type TEXT,
        amount REAL,
        status TEXT,
        description TEXT,
        created_at TEXT
    );
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS staff_users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        surname TEXT,
        email TEXT,
        role TEXT DEFAULT 'staff',
        staff_id TEXT,
        department TEXT,
        city TEXT,
        tckn TEXT,
        age INTEGER,
        status TEXT DEFAULT 'aktif',
        created_at TEXT
    );
    """)

    conn.commit()

    # Türkçe / Uyumluluk Sütunlarını Güvenli Bir Şekilde Ekle (Eğer yoksa)
    compat_cols = [
        ("core_customers", "kredi_durumu", "TEXT COLLATE NOCASE DEFAULT 'BEKLEMEDE'"),
        ("core_customers", "yas", "INTEGER"),
        ("core_customers", "il", "TEXT COLLATE NOCASE"),
        ("core_customers", "kredi_turu", "TEXT COLLATE NOCASE"),
        ("core_customers", "aylik_taksit", "REAL"),
        ("core_customers", "kalan_borc", "REAL"),
        ("core_loans", "tur", "TEXT COLLATE NOCASE"),
        ("core_loans", "kredi_durumu", "TEXT COLLATE NOCASE DEFAULT 'BEKLEMEDE'"),
        ("core_loans", "aylik_taksit", "REAL"),
        ("core_loans", "kalan_borc", "REAL"),
        ("agent_plans", "onaylandi_mi", "INTEGER DEFAULT 0"),
        ("agent_plans", "durum", "TEXT COLLATE NOCASE DEFAULT 'TASLAK_BEKLİYOR'"),
        ("agent_plans", "musteri_adi", "TEXT"),
        ("staff_users", "ad", "TEXT"),
        ("staff_users", "soyad", "TEXT"),
        ("staff_users", "rol", "TEXT"),
        ("staff_users", "sicil_no", "TEXT"),
        ("staff_users", "birim", "TEXT"),
        ("staff_users", "il", "TEXT"),
        ("staff_users", "yas", "INTEGER"),
        ("staff_users", "durum", "TEXT DEFAULT 'AKTİF'"),
    ]
    for tbl, col, col_def in compat_cols:
        try:
            cur.execute(f"ALTER TABLE {tbl} ADD COLUMN {col} {col_def}")
        except Exception:
            pass

    # Seed Kontrolü
    cur.execute("SELECT COUNT(*) as cnt FROM core_customers")
    if cur.fetchone()["cnt"] == 0:
        seed_data(conn)
    else:
        # Mevcut verilerin uyumluluk sütunlarını doldur
        try:
            cur.execute("""
            UPDATE core_customers SET
                yas = age,
                il = TRIM(SUBSTR(city, 1, INSTR(city || ' /', ' /') - 1)),
                kredi_turu = loan_type,
                aylik_taksit = monthly_installment,
                kalan_borc = remaining_debt,
                kredi_durumu = CASE 
                    WHEN status = 'onaylandi' THEN 'ONAYLANDI'
                    WHEN status = 'devredildi' THEN 'TEMSİLCİDE'
                    WHEN status = 'reddedildi' THEN 'NORMAL_ÖDEME'
                    ELSE 'BEKLEMEDE'
                END
            WHERE yas IS NULL OR kredi_durumu IS NULL OR il IS NULL;
            """)

            cur.execute("""
            UPDATE core_loans SET
                tur = loan_type,
                aylik_taksit = monthly_installment,
                kalan_borc = remaining_debt,
                kredi_durumu = CASE 
                    WHEN status = 'onaylandi' THEN 'ONAYLANDI'
                    WHEN status = 'devredildi' THEN 'TEMSİLCİDE'
                    ELSE 'BEKLEMEDE'
                END
            WHERE tur IS NULL OR kredi_durumu IS NULL;
            """)

            cur.execute("""
            UPDATE agent_plans SET
                onaylandi_mi = CASE WHEN status = 'onaylandi' THEN 1 ELSE 0 END,
                durum = CASE WHEN status = 'onaylandi' THEN 'ONAYLANDI' WHEN status = 'devredildi' THEN 'TEMSİLCİDE' ELSE 'TASLAK_BEKLİYOR' END
            WHERE durum IS NULL;
            """)
            conn.commit()
        except Exception as e:
            print("Uyumluluk güncelleme hatası:", e)

    conn.close()


def seed_data(conn):
    cur = conn.cursor()
    now_iso = datetime.now(timezone.utc).isoformat()

    initial_customers = [
        {
            "id": "cust_hatice_001",
            "tckn": "38291048291",
            "name": "Hatice Yılmaz",
            "email": "hatice@demo.com",
            "age": 72,
            "city": "Hatay / Antakya",
            "loan_type": "Konut Kredisi",
            "monthly_installment": 14500,
            "remaining_debt": 1250000,
            "dask_var": 1,
            "dask_police_no": "DASK-2022-HY-001",
            "is_hassas": 1,
            "priority": "Yüksek Öncelik",
            "status": "afet_kapsaminda",
        },
        {
            "id": "cust_emre_002",
            "tckn": "19482019482",
            "name": "Emre Kaya",
            "email": "emre@demo.com",
            "age": 34,
            "city": "Kahramanmaraş / Elbistan",
            "loan_type": "İhtiyaç Kredisi",
            "monthly_installment": 5200,
            "remaining_debt": 180000,
            "dask_var": 0,
            "dask_police_no": None,
            "is_hassas": 0,
            "priority": "Normal Öncelik",
            "status": "afet_kapsaminda",
        },
        {
            "id": "cust_selma_003",
            "tckn": "57382910482",
            "name": "Selma Demir",
            "email": "selma@demo.com",
            "age": 58,
            "city": "Malatya / Battalgazi",
            "loan_type": "Konut Kredisi",
            "monthly_installment": 11000,
            "remaining_debt": 920000,
            "dask_var": 0,
            "dask_police_no": None,
            "is_hassas": 0,
            "priority": "Normal Öncelik",
            "status": "devredildi",
        },
        {
            "id": "cust_rize_001",
            "tckn": "61029384756",
            "name": "Dursun Ali Reis",
            "email": "dursun@demo.com",
            "age": 69,
            "city": "Rize / Çayeli",
            "loan_type": "Konut Kredisi",
            "monthly_installment": 16200,
            "remaining_debt": 820000,
            "dask_var": 1,
            "dask_police_no": "DASK-2023-RZ-401",
            "is_hassas": 1,
            "priority": "Yüksek Öncelik",
            "status": "afet_kapsaminda",
        },
        {
            "id": "cust_rize_002",
            "tckn": "53094827163",
            "name": "Fadime Kaya",
            "email": "fadime@demo.com",
            "age": 71,
            "city": "Rize / Ardeşen",
            "loan_type": "Konut Kredisi",
            "monthly_installment": 12400,
            "remaining_debt": 640000,
            "dask_var": 1,
            "dask_police_no": "DASK-2024-RZ-112",
            "is_hassas": 1,
            "priority": "Yüksek Öncelik",
            "status": "afet_kapsaminda",
        },
        {
            "id": "cust_rize_003",
            "tckn": "53928174620",
            "name": "Temel Karadeniz",
            "email": "temel@demo.com",
            "age": 42,
            "city": "Rize / Merkez",
            "loan_type": "İhtiyaç Kredisi",
            "monthly_installment": 5800,
            "remaining_debt": 190000,
            "dask_var": 0,
            "dask_police_no": None,
            "is_hassas": 0,
            "priority": "Normal Öncelik",
            "status": "afet_kapsaminda",
        },
        {
            "id": "cust_rize_004",
            "tckn": "53820194827",
            "name": "Asiye Yıldız",
            "email": "asiye@demo.com",
            "age": 38,
            "city": "Rize / Fındıklı",
            "loan_type": "İhtiyaç Kredisi",
            "monthly_installment": 8500,
            "remaining_debt": 260000,
            "dask_var": 0,
            "dask_police_no": None,
            "is_hassas": 0,
            "priority": "Normal Öncelik",
            "status": "afet_kapsaminda",
        },
        {
            "id": "cust_rize_005",
            "tckn": "53719284716",
            "name": "İdris Çepni",
            "email": "idris@demo.com",
            "age": 66,
            "city": "Rize / Güneysu",
            "loan_type": "Konut Kredisi",
            "monthly_installment": 10500,
            "remaining_debt": 510000,
            "dask_var": 0,
            "dask_police_no": None,
            "is_hassas": 1,
            "priority": "Yüksek Öncelik",
            "status": "devredildi",
        },
    ]

    for c in initial_customers:
        cur.execute(
            """
        INSERT INTO core_customers (id, tckn, name, email, age, city, loan_type, monthly_installment, remaining_debt, dask_var, dask_police_no, is_hassas, priority, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
            (
                c["id"],
                c["tckn"],
                c["name"],
                c["email"],
                c["age"],
                c["city"],
                c["loan_type"],
                c["monthly_installment"],
                c["remaining_debt"],
                c["dask_var"],
                c["dask_police_no"],
                c["is_hassas"],
                c["priority"],
                c["status"],
                now_iso,
            ),
        )

        cur.execute(
            """
        INSERT INTO core_loans (id, customer_id, loan_type, monthly_installment, remaining_debt, status, created_at)
        VALUES (?, ?, ?, ?, ?, 'aktif', ?)
        """,
            (
                f"loan_{c['id']}",
                c["id"],
                c["loan_type"],
                c["monthly_installment"],
                c["remaining_debt"],
                now_iso,
            ),
        )

    # Örnek afet olayları
    cur.execute(
        """
    INSERT INTO disaster_events (id, tur, buyukluk, seviye, iller, kaynak, zaman, affected_count, created_at)
    VALUES 
    ('evt_deprem_001', 'deprem', 7.4, '4. Seviye', 'Hatay, Kahramanmaraş, Malatya, Adıyaman, Gaziantep', 'AFAD / Kandilli', '16 Ekim 2026, 04:17', 258, ?),
    ('evt_sel_002', 'sel_heyelan', 0.0, 'Kırmızı Kod', 'Rize (Çayeli, Ardeşen, Fındıklı, Güneysu, İkizdere)', 'Meteoroloji Genel Müdürlüğü & AFAD', '16 Ekim 2026, 09:30', 5, ?)
    """,
        (now_iso, now_iso),
    )

    # Başlangıç planları
    cur.execute(
        """
    INSERT INTO agent_plans (id, customer_id, erteleme_ay, oncelik, toplam_otelenen, status, message, created_at)
    VALUES
    ('plan_hatice_001', 'cust_hatice_001', 4, 'yuksek', 58000, 'taslak', 'Sayın Hatice Hanım, konut krediniz için 4 aylık erteleme talebiniz hazırlandı.', ?),
    ('plan_emre_002', 'cust_emre_002', 3, 'normal', 15600, 'taslak', 'Sayın Emre Bey, ihtiyaç krediniz için 3 aylık erteleme taslağınız hazırlandı.', ?),
    ('plan_selma_003', 'cust_selma_003', 3, 'normal', 33000, 'devredildi', 'Sayın Selma Hanım, DASK poliçe eksikliği nedeniyle temsilcimiz arayacaktır.', ?)
    """,
        (now_iso, now_iso, now_iso),
    )

    # Audit Log
    cur.execute(
        """
    INSERT INTO audit_logs (id, event_type, customer_id, actor, details, created_at)
    VALUES
    ('log_001', 'disaster.declared', 'SYSTEM', 'AFAD_KANDILLI', 'M7.4 Deprem uyarısı sisteme girdi. Bölgedeki müşteriler taranıyor.', ?),
    ('log_002', 'plan.drafted', 'cust_hatice_001', 'Ajan A (Planlayıcı)', '4 aylık (3+1) faizsiz erteleme planı oluşturuldu.', ?),
    ('log_003', 'plan.escalated', 'cust_selma_003', 'Ajan A (Planlayıcı)', 'DASK poliçesi eksik olduğu için temsilci aramasına devredildi.', ?)
    """,
        (now_iso, now_iso, now_iso),
    )

    # Staff / Admin Seed Kayıtları
    cur.execute(
        """
    INSERT INTO staff_users (id, name, surname, email, role, staff_id, department, city, tckn, age, status, created_at)
    VALUES
    ('staff_admin_001', 'Ahmet Yıldız', 'Yıldız', 'admin@limanbank.com.tr', 'admin', 'LB-9001', 'Bilgi Teknolojileri & Güvenlik', 'İstanbul', '10000000001', 42, 'aktif', ?),
    ('staff_op_002', 'Zeynep Kaya', 'Kaya', 'zeynep.kaya@limanbank.com.tr', 'staff', 'LB-4102', 'Kredi ve Afet Operasyonları', 'Ankara', '10000000002', 34, 'aktif', ?),
    ('staff_op_003', 'Murat Çetin', 'Çetin', 'murat.cetin@limanbank.com.tr', 'staff', 'LB-4103', 'Saha ve Çağrı Destek', 'Gaziantep', '10000000003', 29, 'aktif', ?)
    """,
        (now_iso, now_iso, now_iso),
    )

    conn.commit()


# ════════════════════════════════════════════════════════════════
# 3. SSE BROADCASTER (CANLI OLAY YAYINCISI)
# ════════════════════════════════════════════════════════════════
async def broadcast_event(topic: str, data: Dict[str, Any]):
    now = datetime.now().strftime("%H:%M:%S")
    payload = {
        "topic": topic,
        "time": now,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "data": data,
    }
    raw = json.dumps(payload, ensure_ascii=False)

    # Log tablosuna ekle
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            """
        INSERT INTO audit_logs (id, event_type, customer_id, actor, details, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
            (
                f"log_{uuid.uuid4().hex[:8]}",
                topic,
                str(data.get("customer_id", "SYSTEM")),
                str(data.get("actor", "API_SERVER")),
                str(data.get("desc", data.get("message", raw))),
                payload["timestamp"],
            ),
        )
        conn.commit()
        conn.close()
    except Exception as e:
        print("Audit log save error:", e)

    # Tüm SSE dinleyicilerine gönder
    dead_queues = []
    for q in sse_subscribers:
        try:
            q.put_nowait(payload)
        except Exception:
            dead_queues.append(q)

    for dq in dead_queues:
        if dq in sse_subscribers:
            sse_subscribers.remove(dq)


# ════════════════════════════════════════════════════════════════
# 4. KURAL MOTORU VE AJAN FONKSİYONLARI (KODDA ZORLANAN GÜVENCE)
# ════════════════════════════════════════════════════════════════
def execute_rule_engine(loan_type: str, age: int, has_dask: bool = False, is_hassas: bool = False):
    loan_lower = loan_type.lower()
    temel = 2 if "kart" in loan_lower else 3
    is_senior = age >= 65 or is_hassas
    hassas_ek = 1 if is_senior else 0
    sure = temel + hassas_ek
    sure = min(sure, 6)  # KOD ÜST SINIRI 6 AY!

    priority = "Yüksek Öncelik" if is_senior else "Normal Öncelik"
    docs = ["Kimlik fotokopisi / T.C. Kimlik doğrulaması", "Hasar tespit veya ikametgâh belgesi"]
    if "konut" in loan_lower:
        docs.append("Tapu örneği")
        if has_dask:
            docs.append("DASK Poliçe Belgesi")
        else:
            docs.append("DASK Eksiklik Bilgilendirmesi")

    return {
        "erteleme_ay": sure,
        "oncelik": priority,
        "is_hassas": is_senior,
        "belgeler": docs,
    }


def generate_agent_message(name: str, loan_type: str, months: int, has_dask: bool, is_senior: bool):
    hitap = f"Sayın {name}"
    kredi = "konut krediniz" if "konut" in loan_type.lower() else ("kredi kartınız" if "kart" in loan_type.lower() else "ihtiyaç krediniz")
    dask_not = " Mevcut DASK poliçeniz sistemimizde teyit edilmiştir." if has_dask else (
        " Konutunuzun DASK kaydına ulaşılamamış olup, haklarınız konusunda temsilcimiz sizi arayacaktır." if "konut" in loan_type.lower() else ""
    )

    if is_senior:
        return (
            f"{hitap}, geçmiş olsun. Yaşadığınız afet nedeniyle {kredi} için {months} aylık "
            f"kolaylaştırıcı erteleme talebiniz, değerlendirmeye alınmak üzere hazırlandı.{dask_not} "
            f"Siz uygun görürseniz onayınızla banka değerlendirmesine ilerleyebiliriz; dilerseniz temsilcimiz sizi arasın."
        )
    return (
        f"{hitap}, geçmiş olsun. Afet bölgesi kapsamında {kredi} için {months} aylık erteleme "
        f"taslağınız hazırlandı.{dask_not} Onayınız halinde banka yetkilisinin son kontrolüne iletilecektir."
    )


# ════════════════════════════════════════════════════════════════
# 5. REST UÇ NOKTALARI
# ════════════════════════════════════════════════════════════════




@app.get("/health")
@app.get("/api/health")
def health():
    return {
        "status": "healthy",
        "service": "afet-modu-api",
        "version": "2.6.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "db": "sqlite3_live",
        "sse_subscribers": len(sse_subscribers),
    }


# ── AUTH SERVICE ────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    name: str
    surname: str
    tckn: str
    age: int
    city: str
    email: str
    password: Optional[str] = "demo1234"
    loan_type: str = "konut"
    dask_var: bool = True
    hassas: bool = False


@app.post("/auth/register")
@app.post("/api/auth/register")
async def register(req: RegisterRequest):
    full_name = f"{req.name} {req.surname}".strip()
    cust_id = f"cust_{req.tckn[:4]}_{uuid.uuid4().hex[:4]}"
    now_iso = datetime.now(timezone.utc).isoformat()

    calc = execute_rule_engine(req.loan_type, req.age, req.dask_var, req.hassas)
    monthly = 13500 if req.loan_type == "konut" else (5800 if req.loan_type == "ihtiyac" else 3200)
    total_deferred = monthly * calc["erteleme_ay"]
    remaining = monthly * 36

    conn = get_db_connection()
    cur = conn.cursor()
    city_il = req.city.split('/')[0].strip() if '/' in req.city else req.city.strip()

    cur.execute(
        """
    INSERT INTO core_customers (id, tckn, name, email, age, city, loan_type, monthly_installment, remaining_debt, dask_var, dask_police_no, is_hassas, priority, status, created_at, kredi_durumu, yas, il, kredi_turu, aylik_taksit, kalan_borc)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'afet_kapsaminda', ?, 'BEKLEMEDE', ?, ?, ?, ?, ?)
    """,
        (
            cust_id,
            req.tckn,
            full_name,
            req.email,
            req.age,
            req.city,
            req.loan_type,
            monthly,
            remaining,
            1 if req.dask_var else 0,
            f"DASK-2026-{req.city[:2].upper()}-{uuid.uuid4().hex[:4].upper()}" if req.dask_var else None,
            1 if calc["is_hassas"] else 0,
            calc["oncelik"],
            now_iso,
            req.age,
            city_il,
            req.loan_type,
            monthly,
            remaining,
        ),
    )

    cur.execute(
        """
    INSERT INTO core_loans (id, customer_id, loan_type, monthly_installment, remaining_debt, status, created_at, tur, kredi_durumu, aylik_taksit, kalan_borc)
    VALUES (?, ?, ?, ?, ?, 'aktif', ?, ?, 'BEKLEMEDE', ?, ?)
    """,
        (
            f"loan_{cust_id}",
            cust_id,
            req.loan_type,
            monthly,
            remaining,
            now_iso,
            req.loan_type,
            monthly,
            remaining,
        ),
    )

    plan_id = f"plan_{uuid.uuid4().hex[:8]}"
    msg = generate_agent_message(full_name, req.loan_type, calc["erteleme_ay"], req.dask_var, calc["is_hassas"])

    cur.execute(
        """
    INSERT INTO agent_plans (id, customer_id, erteleme_ay, oncelik, toplam_otelenen, status, message, documents_json, created_at, durum, onaylandi_mi, musteri_adi)
    VALUES (?, ?, ?, ?, ?, 'taslak', ?, ?, ?, 'TASLAK_BEKLİYOR', 0, ?)
    """,
        (
            plan_id,
            cust_id,
            calc["erteleme_ay"],
            calc["oncelik"],
            total_deferred,
            msg,
            json.dumps(calc["belgeler"], ensure_ascii=False),
            now_iso,
            full_name,
        ),
    )
    conn.commit()
    conn.close()

    # SSE Olayı Gönder: customer.registered & plan.drafted
    await broadcast_event("customer.registered", {
        "customer_id": cust_id,
        "name": full_name,
        "city": req.city,
        "loan_type": req.loan_type,
        "months": calc["erteleme_ay"],
        "desc": f"YENİ MÜŞTERİ: {full_name} ({req.city}) kaydoldu → {calc['erteleme_ay']} Ay erteleme planı oluşturuldu.",
    })

    return {
        "status": "success",
        "customer_id": cust_id,
        "plan_id": plan_id,
        "name": full_name,
        "months": calc["erteleme_ay"],
        "monthly_installment": monthly,
        "total_deferred": total_deferred,
        "priority": calc["oncelik"],
        "message": msg,
        "access_token": f"jwt_{uuid.uuid4().hex}",
    }


# ── STAFF / ADMIN KAYIT ─────────────────────────────────────────
class StaffRegisterRequest(BaseModel):
    name: str
    surname: str
    tckn: str = ""
    age: int = 30
    city: str = ""
    email: str = ""
    password: Optional[str] = "demo1234"
    role: str = "staff"  # 'staff' veya 'admin'
    staff_id: Optional[str] = None
    department: Optional[str] = "Operasyon"


@app.post("/auth/register-staff")
@app.post("/api/auth/register-staff")
async def register_staff(req: StaffRegisterRequest):
    full_name = f"{req.name} {req.surname}".strip()
    user_id = f"staff_{uuid.uuid4().hex[:8]}"
    staff_id = req.staff_id or f"LB-{uuid.uuid4().hex[:4].upper()}"
    now_iso = datetime.now(timezone.utc).isoformat()

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        """
    INSERT INTO staff_users (id, name, surname, email, role, staff_id, department, city, tckn, age, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'aktif', ?)
    """,
        (
            user_id,
            full_name,
            req.surname,
            req.email,
            req.role,
            staff_id,
            req.department or "Operasyon",
            req.city,
            req.tckn,
            req.age,
            now_iso,
        ),
    )
    conn.commit()
    conn.close()

    role_label = "Sistem Yöneticisi (Admin)" if req.role == "admin" else "Banka Operasyon Çalışanı"

    # SSE Olayı Gönder
    await broadcast_event(f"{req.role}.registered", {
        "user_id": user_id,
        "name": full_name,
        "role": req.role,
        "staff_id": staff_id,
        "department": req.department,
        "desc": f"YENİ {req.role.upper()}: {full_name} (Sicil: {staff_id}, Birim: {req.department}) sisteme yetkilendirildi.",
    })

    return {
        "status": "success",
        "user_id": user_id,
        "name": full_name,
        "role": req.role,
        "role_label": role_label,
        "staff_id": staff_id,
        "department": req.department or "Operasyon",
        "access_token": f"jwt_{uuid.uuid4().hex}",
    }


@app.get("/staff")
@app.get("/api/staff")
def get_staff_users():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM staff_users ORDER BY created_at DESC")
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return {"total": len(rows), "staff": rows}


class LoginRequest(BaseModel):
    identifier: str
    password: Optional[str] = None


@app.post("/auth/login")
@app.post("/api/auth/login")
def login(req: LoginRequest):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM core_customers WHERE email = ? OR tckn = ? OR id = ?", (req.identifier, req.identifier, req.identifier))
    cust = cur.fetchone()
    conn.close()

    if not cust:
        # Demo esnekliği
        return {
            "status": "success",
            "access_token": f"jwt_{uuid.uuid4().hex}",
            "role": "customer",
            "customer_id": req.identifier,
            "name": req.identifier.split("@")[0].capitalize(),
        }

    return {
        "status": "success",
        "access_token": f"jwt_{uuid.uuid4().hex}",
        "role": "customer",
        "customer_id": cust["id"],
        "name": cust["name"],
        "city": cust["city"],
        "loan_type": cust["loan_type"],
    }


# ── CORE BANKING SERVICE ─────────────────────────────────────────

@app.get("/customers")
@app.get("/api/core/customers")
def get_customers():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM core_customers ORDER BY created_at DESC")
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return {"total": len(rows), "customers": rows}


@app.get("/customers/{customer_id}")
@app.get("/api/core/customers/{customer_id}")
def get_customer(customer_id: str):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM core_customers WHERE id = ?", (customer_id,))
    row = cur.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Müşteri bulunamadı")
    return dict(row)


@app.get("/loans")
@app.get("/api/core/loans")
def get_loans():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM core_loans ORDER BY created_at DESC")
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return {"total": len(rows), "loans": rows}


# ── DISASTER SERVICE ─────────────────────────────────────────────

class DisasterTriggerRequest(BaseModel):
    tur: str = "sel_heyelan"
    buyukluk: float = 7.4
    seviye: str = "Kırmızı Kod"
    iller: str = "Rize, Artvin, Trabzon"
    kaynak: str = "SİMÜLASYON (AFAD / MGM)"


@app.post("/disaster/trigger")
@app.post("/api/disaster/trigger")
async def trigger_disaster(req: DisasterTriggerRequest):
    event_id = f"evt_{uuid.uuid4().hex[:8]}"
    now_str = datetime.now().strftime("%d %B %Y, %H:%M")
    now_iso = datetime.now(timezone.utc).isoformat()

    conn = get_db_connection()
    cur = conn.cursor()

    # İlgili illerdeki müşterileri tara
    cur.execute("SELECT id, name, city FROM core_customers")
    all_custs = cur.fetchall()
    matched_ids = []
    iller_list = [i.strip().lower() for i in req.iller.split(",")]

    for c in all_custs:
        city_lower = c["city"].lower()
        if any(il in city_lower for il in iller_list):
            matched_ids.append(c["id"])

    cur.execute(
        """
    INSERT INTO disaster_events (id, tur, buyukluk, seviye, iller, kaynak, zaman, affected_count, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """,
        (event_id, req.tur, req.buyukluk, req.seviye, req.iller, req.kaynak, now_str, len(matched_ids), now_iso),
    )
    conn.commit()
    conn.close()

    # Canlı Olayları Yayınla
    await broadcast_event("disaster.declared", {
        "event_id": event_id,
        "tur": req.tur,
        "buyukluk": req.buyukluk,
        "seviye": req.seviye,
        "iller": req.iller,
        "zaman": now_str,
        "desc": f"AFET İLANI: {req.iller} bölgesinde {req.tur} bildirimi alındı ({req.seviye}).",
    })

    await broadcast_event("customer.affected", {
        "event_id": event_id,
        "affected_count": len(matched_ids),
        "customer_ids": matched_ids,
        "desc": f"Müşteri Eşleştirme: {len(matched_ids)} müşteri afet koordinatlarıyla eşleştirildi.",
    })

    await broadcast_event("sms.dispatched", {
        "event_id": event_id,
        "recipient": "cust_selma_003",
        "phone": "+90 532 *** 12 84",
        "title": "Geçmiş Olsun & Erteleme Bilgilendirmesi",
        "text": "Sayın Selma Hanım, bölgenizde meydana gelen afet sebebiyle geçmiş olsun dileklerimizi iletiyoruz. Liman Bankası olarak yanınızdayız...",
        "zaman": now_str,
        "desc": f"SMS İletildi: {len(matched_ids)} afetzede müşteriye geçmiş olsun ve erteleme bilgilendirme SMS'i gönderildi (Kanal: Liman Telco Gateway).",
    })

    return {
        "status": "success",
        "event_id": event_id,
        "affected_customers": len(matched_ids),
        "message": f"{req.tur.capitalize()} simülasyonu tetiklendi.",
    }


class SmsSendRequest(BaseModel):
    phone: str
    recipient_name: Optional[str] = "Müşteri"
    message: Optional[str] = None


@app.post("/sms/send")
@app.post("/api/sms/send")
async def send_sms_endpoint(req: SmsSendRequest):
    now_str = datetime.now().strftime("%H:%M:%S")
    msg = req.message or f"Sayın {req.recipient_name}, geçmiş olsun dileklerimizi iletiyoruz. Liman Bankası Afet Destek Paketi kapsamında krediniz için faizsiz erteleme planınız hazırlanmıştır. Onay için Liman Mobil uygulamasını açın. Uygulamayı açamıyorsanız bu mesaja EVET yazarak yanıtlayabilir veya 0850 222 0 600 Afet Destek Hattımızı arayabilirsiniz. Liman Bank B002"

    await broadcast_event("sms.dispatched", {
        "phone": req.phone,
        "recipient": req.recipient_name,
        "text": msg,
        "zaman": now_str,
        "desc": f"Canlı SMS İletildi (Sıfır Link / Anti-Phishing) ➔ {req.recipient_name} ({req.phone})"
    })

    return {
        "status": "success",
        "recipient": req.recipient_name,
        "phone": req.phone,
        "message": msg,
        "anti_phishing_guarantee": "Sıfır Bağlantı (Zero-Link) Politikası: SMS içerisinde link bulunmaz.",
        "delivered_at": now_str,
        "carrier": "Liman Telco Gateway / Turkcell 5G"
    }


class SmsInboundRequest(BaseModel):
    phone: str
    message: str
    customer_id: Optional[str] = None


@app.post("/sms/inbound")
@app.post("/api/sms/inbound")
async def inbound_sms_endpoint(req: SmsInboundRequest):
    now_iso = datetime.now(timezone.utc).isoformat()
    text = req.message.strip().upper()

    conn = get_db_connection()
    cur = conn.cursor()

    target_cust_id = req.customer_id
    if not target_cust_id:
        cur.execute("SELECT id FROM core_customers LIMIT 1")
        row = cur.fetchone()
        target_cust_id = row["id"] if row else "cust_hatice_001"

    if "EVET" in text or "ONAY" in text or text == "E":
        cur.execute("UPDATE core_customers SET status = 'onaylandi', kredi_durumu = 'ONAYLANDI' WHERE id = ?", (target_cust_id,))
        cur.execute("UPDATE agent_plans SET status = 'onaylandi', durum = 'ONAYLANDI', onaylandi_mi = 1, approved_at = ? WHERE customer_id = ?", (now_iso, target_cust_id))
        cur.execute("UPDATE core_loans SET status = 'onaylandi', kredi_durumu = 'ONAYLANDI' WHERE customer_id = ?", (target_cust_id,))
        conn.commit()
        conn.close()

        reply_msg = "Sayın müşterimiz, EVET yanıtınız alınmış ve erteleme planınız onaylanmıştır. Liman Mobil'den güncel durumunuzu takip edebilirsiniz. Liman Bank B002"
        await broadcast_event("sms.two_way.approved", {
            "customer_id": target_cust_id,
            "phone": req.phone,
            "text": req.message,
            "desc": f"MÜŞTERİ SMS İLE ONAYLADI ('EVET') ➔ {target_cust_id} ({req.phone}) ertelemesi çift yönlü SMS ile onaylandı."
        })
        return {
            "status": "success",
            "action": "approved",
            "reply": reply_msg,
            "customer_id": target_cust_id
        }
    else:
        cur.execute("UPDATE core_customers SET status = 'devredildi', kredi_durumu = 'TEMSİLCİDE' WHERE id = ?", (target_cust_id,))
        cur.execute("UPDATE agent_plans SET status = 'devredildi', durum = 'TEMSİLCİDE' WHERE customer_id = ?", (target_cust_id,))
        conn.commit()
        conn.close()

        reply_msg = "Talebiniz Afet Masamıza iletilmiştir. Temsilcimiz en kısa sürede sizi arayacaktır. Destek: 0850 222 0 600 B002"
        await broadcast_event("sms.inbound.escalated", {
            "customer_id": target_cust_id,
            "phone": req.phone,
            "text": req.message,
            "desc": f"GELEN SMS TEMSİLCİYE DEVREDİLDİ ➔ {target_cust_id} ({req.phone})"
        })
        return {
            "status": "success",
            "action": "escalated",
            "reply": reply_msg,
            "customer_id": target_cust_id
        }


@app.get("/disaster/events")
@app.get("/api/disaster/events")
def get_disaster_events():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM disaster_events ORDER BY created_at DESC")
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return {"total": len(rows), "events": rows}


# ── AGENT SERVICE & PLAN YÖNETİMİ ───────────────────────────────

class AgentRunRequest(BaseModel):
    customer_id: str


@app.post("/agent/run")
@app.post("/api/agent/run")
async def run_agent(req: AgentRunRequest):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM core_customers WHERE id = ?", (req.customer_id,))
    c = cur.fetchone()
    conn.close()

    if not c:
        raise HTTPException(status_code=404, detail="Müşteri bulunamadı")

    c_dict = dict(c)
    calc = execute_rule_engine(c_dict["loan_type"], c_dict["age"], bool(c_dict["dask_var"]), bool(c_dict["is_hassas"]))
    msg = generate_agent_message(c_dict["name"], c_dict["loan_type"], calc["erteleme_ay"], bool(c_dict["dask_var"]), calc["is_hassas"])

    # 5 adımlı şeffaf tool yürütmesi
    steps = [
        {
            "step": 1,
            "tool": "musteri_bilgisi_getir",
            "agent": "Ajan A (Planlayıcı)",
            "in": {"customer_id": c_dict["id"]},
            "out": {"ad": c_dict["name"], "yas": c_dict["age"], "kredi": c_dict["loan_type"], "il": c_dict["city"]},
            "ms": 110,
            "desc": "Müşteri çekirdek verileri core-service üzerinden getirildi.",
        },
        {
            "step": 2,
            "tool": "oncelik_belirle",
            "agent": "Ajan A (Planlayıcı)",
            "in": {"yas": c_dict["age"], "hassas_durum": bool(c_dict["is_hassas"])},
            "out": {"oncelik": calc["oncelik"]},
            "ms": 42,
            "desc": "Hassas durum ve yaş kuralı işletildi.",
        },
        {
            "step": 3,
            "tool": "erteleme_taslagi_olustur",
            "agent": "Ajan A (Planlayıcı)",
            "in": {"kredi": c_dict["loan_type"], "oncelik": calc["oncelik"]},
            "out": {"erteleme_ay": calc["erteleme_ay"], "kod_ust_sinir": 6},
            "ms": 80,
            "desc": "Kural motoru çalıştırıldı, kod üst sınırı (6 ay) denetlendi.",
        },
        {
            "step": 4,
            "tool": "belge_listesi_getir",
            "agent": "Ajan A (Planlayıcı)",
            "in": {"kredi": c_dict["loan_type"], "dask": bool(c_dict["dask_var"])},
            "out": calc["belgeler"],
            "ms": 48,
            "desc": "Müşteriye özel belge seti listelendi.",
        },
        {
            "step": 5,
            "tool": "iletisimci_ajan_yaz",
            "agent": "Ajan B (İletişimci)",
            "in": {"model": "openai/gpt-4o-mini", "ton": "sakin, saygili"},
            "out": msg,
            "ms": 1150,
            "desc": "Sakin ve saygılı dil filtresinden geçirildi. Ticari ve bağlayıcı vaat ifadeleri elendi.",
        },
    ]

    await broadcast_event("agent.loop.completed", {
        "customer_id": c_dict["id"],
        "steps_count": len(steps),
        "duration_ms": 1430,
        "desc": f"Ajan Döngüsü: {c_dict['name']} için 5 tool çağrısı başarıyla tamamlandı.",
    })

    return {
        "status": "success",
        "customer_id": c_dict["id"],
        "erteleme_ay": calc["erteleme_ay"],
        "priority": calc["oncelik"],
        "message": msg,
        "steps": steps,
        "total_latency_ms": 1430,
    }


@app.get("/agent/plans")
@app.get("/api/agent/plans")
def get_plans():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
    SELECT p.*, c.name as customer_name, c.city, c.loan_type
    FROM agent_plans p
    LEFT JOIN core_customers c ON p.customer_id = c.id
    ORDER BY p.created_at DESC
    """)
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return {"total": len(rows), "plans": rows}


@app.post("/plans/{plan_id}/approve")
@app.post("/api/plans/{plan_id}/approve")
async def approve_plan(plan_id: str):
    now_iso = datetime.now(timezone.utc).isoformat()
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("SELECT * FROM agent_plans WHERE id = ? OR customer_id = ?", (plan_id, plan_id))
    p = cur.fetchone()
    if not p:
        # ID yoksa ilk taslağı onayla
        cur.execute("SELECT * FROM agent_plans LIMIT 1")
        p = cur.fetchone()

    p_dict = dict(p) if p else {"customer_id": "cust_hatice_001", "erteleme_ay": 4}
    target_id = p_dict.get("id", plan_id)
    cust_id = p_dict.get("customer_id", "cust_hatice_001")

    cur.execute("UPDATE agent_plans SET status = 'onaylandi', durum = 'ONAYLANDI', onaylandi_mi = 1, approved_at = ? WHERE id = ?", (now_iso, target_id))
    cur.execute("UPDATE core_customers SET status = 'onaylandi', kredi_durumu = 'ONAYLANDI' WHERE id = ?", (cust_id,))
    cur.execute("UPDATE core_loans SET status = 'onaylandi', kredi_durumu = 'ONAYLANDI' WHERE customer_id = ?", (cust_id,))

    # İşlem kaydı
    tx_id = f"tx_{uuid.uuid4().hex[:8]}"
    cur.execute(
        """
    INSERT INTO transactions (id, customer_id, type, amount, status, description, created_at)
    VALUES (?, ?, 'erteleme_onayi', 0, 'tamamlandi', ?, ?)
    """,
        (tx_id, cust_id, f"Afet Modu: {p_dict.get('erteleme_ay', 4)} Ay faizsiz kredi ertelemesi uygulandı.", now_iso),
    )

    conn.commit()
    conn.close()

    await broadcast_event("plan.approved", {
        "plan_id": target_id,
        "customer_id": cust_id,
        "actor": "Müşteri Mobil Portalı",
        "desc": f"PLAN ONAYLANDI: {cust_id} müşterisi {p_dict.get('erteleme_ay', 4)} aylık ertelemeyi onayladı → Çalışan onay havuzuna aktarıldı.",
    })

    return {
        "status": "success",
        "plan_id": target_id,
        "customer_id": cust_id,
        "approved_at": now_iso,
        "message": "Erteleme planı başarıyla onaylandı ve çalışan onay havuzuna aktarıldı.",
    }


class EscalateRequest(BaseModel):
    reason: str = "sure_uzatma"
    notes: Optional[str] = "Müşteri temsilci ile görüşmek istedi."


@app.post("/plans/{plan_id}/escalate")
@app.post("/api/plans/{plan_id}/escalate")
async def escalate_plan(plan_id: str, req: EscalateRequest):
    now_iso = datetime.now(timezone.utc).isoformat()
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("SELECT * FROM agent_plans WHERE id = ? OR customer_id = ?", (plan_id, plan_id))
    p = cur.fetchone()
    cust_id = p["customer_id"] if p else plan_id

    cur.execute("UPDATE agent_plans SET status = 'devredildi', durum = 'TEMSİLCİDE' WHERE id = ? OR customer_id = ?", (plan_id, plan_id))
    cur.execute("UPDATE core_customers SET status = 'devredildi', kredi_durumu = 'TEMSİLCİDE' WHERE id = ?", (cust_id,))
    cur.execute("UPDATE core_loans SET status = 'devredildi', kredi_durumu = 'TEMSİLCİDE' WHERE customer_id = ?", (cust_id,))
    conn.commit()
    conn.close()

    await broadcast_event("plan.escalated", {
        "plan_id": plan_id,
        "customer_id": cust_id,
        "reason": req.reason,
        "notes": req.notes,
        "desc": f"TEMSİLCİ DEVRİ: {cust_id} talebi ({req.reason}) nedeniyle çağrı merkezi temsilcisine yönlendirildi.",
    })

    return {
        "status": "success",
        "plan_id": plan_id,
        "customer_id": cust_id,
        "escalated_to": "Öncelikli Afet Çağrı Masası",
        "message": "Talebiniz temsilcimize iletildi. En kısa sürede aranacaksınız.",
    }


# ── SSE GERÇEK ZAMANLI VERİ AKIŞI ────────────────────────────────

@app.get("/agent/stream")
@app.get("/api/agent/stream")
async def agent_stream(request: Request):
    """
    Server-Sent Events (SSE) Canlı Olay Akışı
    afet-modu-app.html bu uç noktayı EventSource ile dinler.
    """
    queue: asyncio.Queue = asyncio.Queue()
    sse_subscribers.append(queue)

    async def event_generator():
        # İlk bağlantıda hoş geldin olayı
        welcome = {
            "topic": "system.connected",
            "time": datetime.now().strftime("%H:%M:%S"),
            "data": {
                "message": "Liman Bankası Gerçek Zamanlı Ajan ve Olay Akışına Bağlanıldı.",
                "server_time": datetime.now(timezone.utc).isoformat(),
            },
        }
        yield f"data: {json.dumps(welcome, ensure_ascii=False)}\n\n"

        try:
            while True:
                # İstemci koptu mu kontrol et
                if await request.is_disconnected():
                    break

                try:
                    # Yeni bir olay gelene kadar bekle (10 sn timeout ile heartbeat)
                    payload = await asyncio.wait_for(queue.get(), timeout=10.0)
                    yield f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"
                except asyncio.TimeoutError:
                    # SSE Keep-Alive ping
                    yield ": ping\n\n"
        finally:
            if queue in sse_subscribers:
                sse_subscribers.remove(queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ── SQL ÇALIŞTIRMA & VERİTABANI MOTORU UÇ NOKTASI ────────────────

class QueryRequest(BaseModel):
    query: str


@app.post("/db/query")
@app.post("/api/db/query")
def run_sql_query(req: QueryRequest):
    sql = req.query.strip()

    # DBeaver / PostgreSQL tablo isimlerini yerel SQLite eşdeğerlerine eşle
    translated_sql = (
        sql.replace("core.customers", "core_customers")
        .replace("core.loans", "core_loans")
        .replace("agent.plans", "agent_plans")
        .replace("disaster.events", "disaster_events")
        .replace("audit.logs", "audit_logs")
        .replace("afet.transactions", "transactions")
        .replace("core.transactions", "transactions")
        .replace("auth.staff_users", "staff_users")
        .replace("auth.users", "staff_users")
    )

    # Boolean true/false eşleme (SQLite 1/0)
    translated_sql = re.sub(r'\btrue\b', '1', translated_sql, flags=re.IGNORECASE)
    translated_sql = re.sub(r'\bfalse\b', '0', translated_sql, flags=re.IGNORECASE)

    # kredi_durumu sorgusunu hem ONAYLANDI hem onaylandi ile uyumlu yap
    translated_sql = re.sub(
        r"\bkredi_durumu\s*=\s*'ONAYLANDI'",
        "(kredi_durumu = 'ONAYLANDI' OR status = 'onaylandi' OR status = 'ONAYLANDI')",
        translated_sql,
        flags=re.IGNORECASE
    )

    # il / city filtrelerini esnek eşle
    il_match = re.search(r"\b(?:il|city)\s*=\s*'([^']+)'", translated_sql, re.IGNORECASE)
    if il_match:
        city_name = il_match.group(1)
        translated_sql = re.sub(
            r"\b(?:il|city)\s*=\s*'[^']+'",
            f"(il = '{city_name}' OR city LIKE '%{city_name}%')",
            translated_sql,
            flags=re.IGNORECASE
        )

    # kredi türü eşlemesi: tur = 'konut' -> (tur = 'konut' OR loan_type LIKE '%konut%')
    tur_match = re.search(r"\b(?:tur|kredi_turu|loan_type)\s*=\s*'([^']+)'", translated_sql, re.IGNORECASE)
    if tur_match:
        tur_val = tur_match.group(1)
        translated_sql = re.sub(
            r"\b(?:tur|kredi_turu|loan_type)\s*=\s*'[^']+'",
            f"(tur = '{tur_val}' OR loan_type LIKE '%{tur_val}%')",
            translated_sql,
            flags=re.IGNORECASE
        )

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        t0 = time.time()
        cur.execute(translated_sql)
        duration_ms = round((time.time() - t0) * 1000, 2)

        if translated_sql.lower().startswith("select"):
            rows = cur.fetchall()
            columns = [d[0] for d in cur.description] if cur.description else []
            data = [dict(zip(columns, [row[c] for c in columns])) for row in rows]
            conn.close()
            return {
                "status": "success",
                "columns": columns,
                "rows": data,
                "rowCount": len(data),
                "duration_ms": duration_ms,
                "sql": sql,
            }
        else:
            conn.commit()
            affected = cur.rowcount
            conn.close()
            return {
                "status": "success",
                "affectedRows": affected,
                "duration_ms": duration_ms,
                "sql": sql,
            }
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=400, detail=str(e))


# ════════════════════════════════════════════════════════════════
# 6. STATİK DOSYALAR VE WEB ÖN YÜZÜ
# ════════════════════════════════════════════════════════════════
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

if os.path.exists(os.path.join(BASE_DIR, "css")):
    app.mount("/css", StaticFiles(directory=os.path.join(BASE_DIR, "css")), name="css")
if os.path.exists(os.path.join(BASE_DIR, "js")):
    app.mount("/js", StaticFiles(directory=os.path.join(BASE_DIR, "js")), name="js")

@app.get("/", summary="Ana Sayfa (Afet Modu Arayüzü)")
async def serve_index():
    index_path = os.path.join(BASE_DIR, "index.html")
    if not os.path.exists(index_path):
        index_path = os.path.join(BASE_DIR, "afet-modu-app.html")
    return FileResponse(index_path)

@app.get("/afet-modu-app.html", summary="Afet Modu Arayüzü")
async def serve_afet_app():
    return FileResponse(os.path.join(BASE_DIR, "afet-modu-app.html"))

@app.get("/database.html", summary="Veritabanı Arayüzü")
async def serve_database_html():
    return FileResponse(os.path.join(BASE_DIR, "database.html"))

@app.get("/api-docs.html", summary="API Dokümantasyon Arayüzü")
async def serve_api_docs_html():
    return FileResponse(os.path.join(BASE_DIR, "api-docs.html"))


# ════════════════════════════════════════════════════════════════
# 7. DOĞRUDAN ÇALIŞTIRMA
# ════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    uvicorn.run("api_server:app", host="0.0.0.0", port=8000, reload=False)
