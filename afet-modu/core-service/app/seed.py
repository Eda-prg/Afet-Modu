"""
Sentetik Veri Tohumlama — 400 Türk müşteri
Sabit rastgele tohum (seed=42) ile tekrarlanabilir veri.

ÖNEMLİ: Tüm veriler kurgusaldır. Gerçek kişi veya kurum içermez.
"""
import random
import uuid
from datetime import datetime, timezone, timedelta

# Sabit tohum — her çalıştırmada aynı veri
random.seed(42)

# ── Afet Case Bölgeleri ──────────────────────────────────────────
AFET_ILLERI = ["Hatay", "Kahramanmaraş", "Malatya", "Adıyaman", "Gaziantep"]
AFET_ILCELERI = {
    "Hatay": ["Antakya", "İskenderun", "Kırıkhan", "Reyhanlı", "Samandağ"],
    "Kahramanmaraş": ["Elbistan", "Dulkadiroğlu", "Onikişubat", "Pazarcık", "Afşin"],
    "Malatya": ["Battalgazi", "Yeşilyurt", "Akçadağ", "Doğanşehir", "Darende"],
    "Adıyaman": ["Merkez", "Besni", "Kahta", "Gölbaşı", "Gerger"],
    "Gaziantep": ["Şahinbey", "Şehitkamil", "Nizip", "Islahiye", "Nurdağı"],
}

DIGER_ILLER = [
    ("İstanbul", ["Kadıköy", "Beşiktaş", "Üsküdar", "Fatih", "Beyoğlu"]),
    ("Ankara", ["Çankaya", "Keçiören", "Mamak", "Yenimahalle"]),
    ("İzmir", ["Bornova", "Konak", "Karşıyaka", "Buca"]),
    ("Bursa", ["Nilüfer", "Osmangazi", "Yıldırım"]),
    ("Antalya", ["Muratpaşa", "Kepez", "Konyaaltı"]),
]

ERKEK_ADLARI = ["Ahmet", "Mehmet", "Mustafa", "Ali", "Hüseyin", "İbrahim", "Hasan",
                "Emre", "Murat", "Ömer", "Yusuf", "Kadir", "Serkan", "Burak"]
KADIN_ADLARI = ["Fatma", "Ayşe", "Emine", "Hatice", "Zeynep", "Elif", "Selma",
                "Nurgül", "Havva", "Rukiye", "Merve", "Seda", "Nurcan", "Döndü"]
SOYADLARI = ["Yılmaz", "Kaya", "Demir", "Şahin", "Çelik", "Yıldız", "Öztürk",
             "Arslan", "Doğan", "Kılıç", "Aslan", "Çetin", "Erdoğan", "Güneş"]

# İl koordinatları (yaklaşık merkez)
IL_KOORDINATLARI = {
    "Hatay": (36.2021, 36.1601),
    "Kahramanmaraş": (37.5858, 36.9371),
    "Malatya": (38.3552, 38.3095),
    "Adıyaman": (37.7648, 38.2786),
    "Gaziantep": (37.0662, 37.3833),
    "İstanbul": (41.0082, 28.9784),
    "Ankara": (39.9334, 32.8597),
    "İzmir": (38.4192, 27.1287),
    "Bursa": (40.1885, 29.0610),
    "Antalya": (36.8969, 30.7133),
}

LOAN_TYPES = ["konut", "ihtiyac", "kart"]


def mask_phone(phone: str) -> str:
    """Telefon maskeleme: 05**_***_**72"""
    digits = ''.join(filter(str.isdigit, phone))
    if len(digits) >= 10:
        return f"0{digits[1:3]}**_***_**{digits[-2:]}"
    return "**_***_**"


def generate_customers(count: int = 400) -> list[dict]:
    """400 sentetik müşteri üret."""
    customers = []
    
    # Hatice Hanım — Yaşlı, Hatay, Konut, DASK Var (case'den)
    customers.append({
        "id": "cust_hatice_001",
        "ad": "Hatice", "soyad": "Yılmaz",
        "il": "Hatay", "ilce": "Antakya",
        "yas": 72, "hassas_durum": True, "engelli": False,
        "telefon_maskeli": "05**_***_**12",
        "lat": 36.2021 + random.uniform(-0.05, 0.05),
        "lon": 36.1601 + random.uniform(-0.05, 0.05),
    })

    # Emre Bey — 34, Kahramanmaraş, İhtiyaç (case'den)
    customers.append({
        "id": "cust_emre_002",
        "ad": "Emre", "soyad": "Kaya",
        "il": "Kahramanmaraş", "ilce": "Elbistan",
        "yas": 34, "hassas_durum": False, "engelli": False,
        "telefon_maskeli": "05**_***_**34",
        "lat": 37.5858 + random.uniform(-0.05, 0.05),
        "lon": 36.9371 + random.uniform(-0.05, 0.05),
    })

    # Selma Hanım — 58, Malatya, Konut, DASK Görünmüyor (case'den)
    customers.append({
        "id": "cust_selma_003",
        "ad": "Selma", "soyad": "Demir",
        "il": "Malatya", "ilce": "Battalgazi",
        "yas": 58, "hassas_durum": False, "engelli": False,
        "telefon_maskeli": "05**_***_**58",
        "lat": 38.3552 + random.uniform(-0.05, 0.05),
        "lon": 38.3095 + random.uniform(-0.05, 0.05),
    })

    # Kalan 397 rastgele müşteri
    for i in range(4, count + 1):
        cinsiyet = random.choice(["E", "K"])
        ad = random.choice(ERKEK_ADLARI if cinsiyet == "E" else KADIN_ADLARI)
        soyad = random.choice(SOYADLARI)
        yas = random.randint(18, 85)
        engelli = random.random() < 0.05  # %5 engelli
        hassas = yas >= 65 or engelli

        # %64.5 afet bölgesinde (case'deki 258/400 oranı)
        if random.random() < 0.645:
            il = random.choice(AFET_ILLERI)
            ilce = random.choice(AFET_ILCELERI[il])
            koordinat = IL_KOORDINATLARI[il]
        else:
            il_data = random.choice(DIGER_ILLER)
            il, ilceler = il_data
            ilce = random.choice(ilceler)
            koordinat = IL_KOORDINATLARI.get(il, (39.9, 32.8))

        lat = koordinat[0] + random.uniform(-0.2, 0.2)
        lon = koordinat[1] + random.uniform(-0.2, 0.2)

        customers.append({
            "id": f"cust_{i:04d}",
            "ad": ad, "soyad": soyad,
            "il": il, "ilce": ilce,
            "yas": yas, "hassas_durum": hassas, "engelli": engelli,
            "telefon_maskeli": mask_phone(f"05{random.randint(10,59)}{random.randint(1000000,9999999)}"),
            "lat": lat, "lon": lon,
        })

    return customers


def generate_loans(customers: list[dict]) -> list[dict]:
    """Her müşteriye 1-2 kredi üret."""
    loans = []
    next_taksit = datetime.now(timezone.utc) + timedelta(days=random.randint(5, 35))

    # Case müşterileri — özel krediler
    # Hatice Hanım — Konut, 14.500 TL/ay, DASK Var
    loans.append({
        "id": "loan_hatice_001",
        "customer_id": "cust_hatice_001",
        "tur": "konut", "kalan_borc": 1_250_000, "aylik_taksit": 14_500,
        "sonraki_taksit_tarihi": next_taksit,
        "dask_var": True, "dask_police_no": "DASK-2022-HY-001",
    })

    # Emre Bey — İhtiyaç, 5.200 TL/ay
    loans.append({
        "id": "loan_emre_001",
        "customer_id": "cust_emre_002",
        "tur": "ihtiyac", "kalan_borc": 180_000, "aylik_taksit": 5_200,
        "sonraki_taksit_tarihi": next_taksit,
        "dask_var": None, "dask_police_no": None,  # Uygulanamaz
    })

    # Selma Hanım — Konut, 11.000 TL/ay, DASK Görünmüyor
    loans.append({
        "id": "loan_selma_001",
        "customer_id": "cust_selma_003",
        "tur": "konut", "kalan_borc": 850_000, "aylik_taksit": 11_000,
        "sonraki_taksit_tarihi": next_taksit,
        "dask_var": None, "dask_police_no": None,  # Görünmüyor
    })

    # Diğer müşteriler
    for customer in customers[3:]:
        n_loans = random.choices([1, 2], weights=[0.7, 0.3])[0]
        loan_types = random.sample(LOAN_TYPES, n_loans)

        for lt in loan_types:
            if lt == "konut":
                kalan = random.randint(300_000, 2_000_000)
                taksit = random.randint(8_000, 25_000)
                dask = random.choices([True, False, None], weights=[0.6, 0.1, 0.3])[0]
                dask_no = f"DASK-{random.randint(2020,2024)}-{random.randint(10000,99999)}" if dask else None
            elif lt == "ihtiyac":
                kalan = random.randint(20_000, 300_000)
                taksit = random.randint(2_000, 12_000)
                dask, dask_no = None, None
            else:  # kart
                kalan = random.randint(5_000, 80_000)
                taksit = random.randint(1_000, 6_000)
                dask, dask_no = None, None

            loans.append({
                "id": str(uuid.uuid4()),
                "customer_id": customer["id"],
                "tur": lt,
                "kalan_borc": float(kalan),
                "aylik_taksit": float(taksit),
                "sonraki_taksit_tarihi": datetime.now(timezone.utc) + timedelta(days=random.randint(5, 45)),
                "dask_var": dask,
                "dask_police_no": dask_no,
            })

    return loans
