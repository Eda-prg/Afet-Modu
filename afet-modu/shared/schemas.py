"""
Paylaşılan Pydantic Şemaları
"""
from pydantic import EmailStr
from typing import Optional, List
from datetime import datetime
from enum import Enum


# ── Roller ──────────────────────────────────────────────────────
class Role(str, Enum):
    customer = "customer"
    staff = "staff"
    admin = "admin"


# ── Kredi Türleri ────────────────────────────────────────────────
class LoanType(str, Enum):
    konut = "konut"
    ihtiyac = "ihtiyac"
    kart = "kart"


# ── Öncelik ──────────────────────────────────────────────────────
class Priority(str, Enum):
    yuksek = "yuksek"
    normal = "normal"


# ── Plan Durumu ──────────────────────────────────────────────────
class PlanStatus(str, Enum):
    taslak = "taslak"
    onaylandi = "onaylandi"
    devredildi = "devredildi"
    iptal = "iptal"


# ── Afet Türü ────────────────────────────────────────────────────
class DisasterType(str, Enum):
    deprem = "deprem"
    sel = "sel"
    yangin = "yangin"


# ── Erteleme Kuralları (Tek Kaynak) ──────────────────────────────
ERTELEME_KURALLARI = {
    LoanType.konut: {"temel": 3, "hassas_ek": 1, "ust_sinir": 6},
    LoanType.ihtiyac: {"temel": 3, "hassas_ek": 1, "ust_sinir": 6},
    LoanType.kart: {"temel": 2, "hassas_ek": 1, "ust_sinir": 6},
}

YASLI_SINIR = 65  # Bu prototipte varsayım; mevzuat değildir


def hesapla_erteleme_ay(loan_type: LoanType, hassas: bool) -> int:
    """Erteleme süresini hesapla. Üst sınır kodla zorlanır."""
    kural = ERTELEME_KURALLARI[loan_type]
    sure = kural["temel"]
    if hassas:
        sure += kural["hassas_ek"]
    return min(sure, kural["ust_sinir"])


def hesapla_belge_listesi(loan_type: LoanType, dask_var: Optional[bool]) -> List[str]:
    """Müşteriye özel belge listesi."""
    belgeler = ["kimlik", "hasar_tespit_ikametgah"]
    if loan_type == LoanType.konut:
        belgeler.append("tapu")
    if loan_type == LoanType.konut:
        if dask_var is True:
            belgeler.append("dask_police_no")
        else:
            belgeler.append("dask_durum_bilgisi_temsilci_verecek")
    return belgeler
