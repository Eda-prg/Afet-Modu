# 🚨 Afet Modu — Müşteri Başvurmaz, Banka Müşteriye Gelir



[![Python](https://img.shields.io/badge/Python-3.12-blue?logo=python)](https://python.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://typescriptlang.org)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)](https://docker.com)
[![License](https://img.shields.io/badge/Veri-Tamamen%20Sentetik-orange)](.)

---

## 📌 Tek Cümlelik Özet

Afetten dakikalar sonra, müşteri hiçbir şey yapmadan, banka ona **hazır bir plan** ile ulaşır; karar yine insandadır.

---

## 🎯 Problem

Afet yaşayan kişi, tam o anda hem kayıplarıyla hem de bankacılık prosedürleriyle uğraşmak zorunda kalır:

| Sorun | Açıklama |
|---|---|
| ⚖️ Yük yanlış yerde | Afetzede şubeye gitmek, sıra beklemek, form doldurmak zorunda kalır |
| 📶 Erişim sorunu | Şubeler, internet ve iletişim kesintili; belgeler hasar görmüş olabilir |
| ❓ Bilgi eksikliği | Müşteri hangi ertelemeden yararlanacağını, hangi belgelerin gerektiğini bilmez |
| 👴 Savunmasız gruplar | Yaşlı ve engelli müşteriler dijital kanallara ulaşmakta daha çok zorlanır |
| 📚 Banka tarafında yığılma | Aynı anda binlerce talep gelir; her biri elle değerlendirilir |
| ⚠️ Kaçınılabilir sonuçlar | Taksit ödenemez, gecikme kaydı oluşur; müşteri-banka güveni zedelenir |

---

## 💡 Çözüm: Görünmez Bankacılık

Bunu bir **kargo takip sistemi** gibi düşünün: siz bir şey yapmazsınız, sistem kendi kendine ilerler ve size yalnızca sonucu bildirir.

### Akış

```
Afet Bildirimi (M7.4 deprem, 5 il)
        │
        ▼
[disaster-service] → Etkilenen müşterileri eşler
        │
        ▼ Kafka: customer.affected
[agent-service] → Ajan A (Planlayıcı) çalışır
        │  • musteri_bilgisi_getir
        │  • belge_listesi_getir
        │  • erteleme_taslagi_olustur
        │  • oncelik_belirle
        │
        ▼
[agent-service] → Ajan B (İletişimci) kişiselleştirilmiş mesaj yazar
        │
        ▼ SSE (Server-Sent Events)
[Next.js] → Müşteri ekranı: bildirim kartı
        │
        ▼
Müşteri: [Onayla] veya [Temsilci beni arasın]
        │
        ▼
Banka çalışanı → insan onayı / denetim
```

### Örnek Bildirim (Yaşlı Müşteri İçin)

> **Banka · Yeni Bildirim**
>
> Sayın Hatice Hanım, **geçmiş olsun.** Konut krediniz için 4 aylık erteleme talebiniz, değerlendirmeye alınmak üzere hazırlandı. Siz uygun görürseniz onayınızla ilerleyebiliriz; dilerseniz temsilcimiz sizi arasın.
>
> Gerekli belgeler: kimlik, hasar tespit tutanağı, tapu örneği, DASK poliçe numarası.
>
> **[Onayla]** · **[Temsilci beni arasın]**

> ⚠️ Mesajda "ertelendi" gibi kesin ifadeler kullanılmaz. Ticari dil (kampanya, fırsat) yasaktır.

---

## 🛡️ Bilinçli Güvenlik Tasarımı: Sıfır Bağlantı (Zero-Link) & Anti-Phishing

> **"Bağlantı göndermiyoruz, çünkü dolandırıcılığa karşı müşteriyi eğitiyoruz."**

Afet zamanlarında oltalama ve dolandırıcılık girişimleri (smishing) zirve yapar; sahte "Afet kredisi onay linki" SMS'leri yayılır. Liman Bankası olarak bilinçli bir güvenlik tercihi uyguluyoruz:

1. **SMS'te ASLA Link Yok:** Gönderilen SMS'lerde hiçbir web bağlantısı (URL) bulunmaz. Müşteriyi SMS linklerine tıklamaması yönünde eğitiyoruz.
2. **Birincil Kanal:** SMS doğrudan *"Onay için Liman Mobil uygulamasını açın"* talimatı verir; müşteri işlemi kendi güvenli bankacılık oturumundan inceler.
3. **Kapsayıcı Alternatifler (Uygulamayı Açamayanlar İçin):**
   - **İki Yönlü SMS Onayı:** Müşteri gelen SMS'e sadece **"EVET"** yazarak yanıt verdiğinde sistem erteleme planını güvenle yürürlüğe sokar.
   - **0850 Acil Afet Masası:** Dileyen müşteri **0850 222 0 600** numarasını arayarak temsilci üzerinden işlemi tamamlar.

---

## 🏗️ Mimari

```
Tarayıcı (Next.js 16 · React 19 · TypeScript · Tailwind 4)
              │ HTTPS / SSE
              ▼
    ┌──────── Nginx (API Gateway) ────────┐
    │ /api/auth  →  8001                  │
    │ /api/core  →  8002                  │
    │ /api/disaster → 8003                │
    │ /api/agent (SSE dahil) → 8004       │
    └─────────────────────────────────────┘
         │         │          │         │
         ▼         ▼          ▼         ▼
    auth-      core-      disaster-  agent-
    service    service    service    service

         └─────────┴──────────┴─────────┘
                          │
                          ▼
              PostgreSQL (servis başına şema)
              Redis (önbellek, SSE dağıtım)
              Kafka KRaft (olay yolu)
```

### Servisler

| Servis | Port | Sorumluluk | Veritabanı Şeması |
|---|---|---|---|
| `auth-service` | 8001 | Kayıt/giriş, JWT üretimi, RBAC | `auth` |
| `core-service` | 8002 | Müşteri, kredi, DASK bilgisi | `core` |
| `disaster-service` | 8003 | Afet olayı alma, etkilenen eşleme | `disaster` |
| `agent-service` | 8004 | Ajanlar, planlar, onay akışı, SSE | `agent` |

---

## 🤖 Yapay Zekâ Katmanı

### Ajan A — Planlayıcı
- Müşteriyi inceler, önceliği belirler
- Erteleme taslağı açar, belgeleri getirir
- **En fazla 8 adım**, sayı uyduramaz
- Süre üst sınırı **kodla** zorlanır (ajan aşamaz)

### Ajan B — İletişimci
- Kısa, sakin, kişiselleştirilmiş Türkçe bildirim yazar
- Kesin söz vermez, ticari dil kullanmaz
- Yaşlı kullanıcı için sade ve yavaş dil

### Araçlar

| Araç | Ne Yapar |
|---|---|
| `musteri_bilgisi_getir` | Kredi, yaş, hassasiyet, DASK durumu ve önerilen erteleme süresi |
| `belge_listesi_getir` | Müşteriye özel belge listesi |
| `erteleme_taslagi_olustur` | Yalnızca TASLAK açar; süre üst sınırı kodla zorlanır |
| `oncelik_belirle` | Öncelik: yüksek veya normal |

### Döngü
```
openai SDK → OpenRouter (model: ortam değişkeni)
Araç girdi/çıktıları → Pydantic doğrulama
Her adım → agent_steps tablosuna yazılır → UI'de "ajan ne yaptı?" gösterilir
```

---

## 📊 Simüle Edilen Senaryo

> ⚠️ **Tüm veriler kurgusaldır.** Gerçek AFAD verisi veya gerçek müşteri verisi içermez.

### Olay: M7.4 Deprem Simülasyonu

| Alan | Bilgi |
|---|---|
| Olay | M7.4 deprem (simülasyon) |
| Zaman | 16 Ekim 2026, 04:17 |
| Etkilenen İller | Hatay, Kahramanmaraş, Malatya, Adıyaman, Gaziantep |
| Kaynak | SİMÜLASYON |

### Üç Örnek Müşteri

| | Hatice Hanım | Emre Bey | Selma Hanım |
|---|---|---|---|
| **Yaş / İl** | 72 · Antakya (Hatay) | 34 · Elbistan (K.Maraş) | 58 · Battalgazi (Malatya) |
| **Kredi** | Konut, 14.500 TL/ay | İhtiyaç, 5.200 TL/ay | Konut, 11.000 TL/ay |
| **DASK** | Var | Uygulanamaz | Görünmüyor |
| **Öncelik** | 🔴 Yüksek (yaşlı) | 🟡 Normal | 🟡 Normal |
| **Erteleme Taslağı** | 4 ay (3+1 hassasiyet) | 3 ay | 3 ay |
| **Ertelenen Taksit** | 58.000 TL | 15.600 TL | 33.000 TL |
| **Dil** | Sade, yavaş, temsilci seçeneği öne çıkar | Kısa ve net | Sade; DASK yönlendirme |

### Toplu Simülasyon Sonuçları (400 Sentetik Müşteri)

| Ölçü | Sonuç |
|---|---|
| Toplam sentetik müşteri | 400 |
| Afet bölgesinde etkilenen | 258 |
| Yüksek öncelikli (yaşlı 73, engelli 3) | 76 |
| Kredi türü dağılımı | Konut 98 · İhtiyaç 88 · Kart 72 |
| DASK'ı görünmeyen konut müşterisi | 46 (temsilci bilgilendirir) |
| Erteleme taslağı dağılımı | 2 ay: 54 · 3 ay: 146 · 4 ay: 58 |
| Ertelenmesi önerilen toplam taksit | ~8,54 milyon TL (sentetik) |
| Onay bekleyen taslak | 258 (hiçbiri otomatik onaylanmadı) |

---

## 📐 Plan Mantığı ve Erteleme Kuralları

> Erteleme süreleri **mevzuat değil, simülasyon varsayımıdır.**

| Kredi Türü | Temel Erteleme | Yaşlı/Engelli Ek | Üst Sınır |
|---|---|---|---|
| Konut | 3 ay | +1 ay | 6 ay |
| İhtiyaç | 3 ay | +1 ay | 6 ay |
| Kredi Kartı | 2 ay | +1 ay | 6 ay |

**Belge kuralları:**
- Herkes: kimlik + hasar tespit/ikametgâh
- Konut kredisi: + tapu
- DASK varsa: poliçe numarası / yoksa: "temsilci bilgi verecek"

---

## 🛠️ Teknoloji Yığını

| Katman | Teknoloji | Görev |
|---|---|---|
| Backend | Python 3.12 + FastAPI | 4 servis, otomatik API dökümantasyonu (/docs) |
| ORM | SQLAlchemy 2 (async) + Alembic | Tek şema kaynağı, migration yönetimi |
| Veritabanı | PostgreSQL | Servis başına ayrı şema |
| Önbellek / Canlı Akış | Redis | Önbellek + SSE bildirim dağıtımı |
| Olay Akışı | Apache Kafka (KRaft modu) | Servisler arası olaylar; Zookeeper gereksiz |
| API Gateway | Nginx (reverse proxy) | Tek giriş, servis yönlendirme, hız sınırı |
| Ön yüz | Next.js 16 + React 19 + TypeScript + Tailwind CSS 4 | Müşteri ekranı + çalışan konsolu |
| UI Bileşenleri | shadcn/ui + MapLibre GL | Hazır bileşenler + afet haritası |
| Kimlik Doğrulama | JWT (PyJWT) + bcrypt + RBAC | Giriş, rol bazlı yetki |
| Ajan (AI) | Kendi tool-calling döngüsü + openai SDK → OpenRouter | Planlayıcı ve İletişimci ajanlar |
| Opsiyonel ML | scikit-learn (GradientBoostingClassifier) | Öncelik/aciliyet skoru |
| Altyapı | Docker Compose + GitHub Actions | Tek komutla kurulum, otomatik test |

---

## 👥 Roller ve Yetkiler (RBAC)

| Rol | Yetkiler |
|---|---|
| `customer` | Kendi bildirimini ve planını görür; onaylar veya temsilci ister |
| `staff` | Tüm etkilenen müşterileri, öncelik kuyruğunu, haritayı ve ajan günlüğünü görür |
| `admin` | Afet simülasyonu başlatır, varsayım parametrelerini yönetir, kullanıcı yönetimi |

---

## 🗄️ Veri Modeli (Özet)

| Şema | Tablo | Önemli Alanlar |
|---|---|---|
| `auth` | `users` | id, email, password_hash (bcrypt), role, created_at |
| `core` | `customers` | id, ad, il, ilce, yas, hassas_durum, telefon (maskeli), lat, lon |
| `core` | `loans` | id, customer_id, tur, kalan_borc, aylik_taksit, sonraki_taksit_tarihi, dask_var |
| `disaster` | `disaster_events` | id, tur, buyukluk, iller[], tarih, kaynak |
| `disaster` | `affected_customers` | event_id, customer_id, eslesme_zamani |
| `agent` | `plans` | id, event_id, customer_id, oncelik, erteleme_ay, belgeler (jsonb), mesaj, durum |
| `agent` | `agent_runs / agent_steps` | run_id, ajan, arac, girdi, cikti, sure, hata |
| `audit` | `audit_log` | kim, ne, ne zaman, hangi kayıt |

---

## 🚀 Hızlı Başlangıç

### Gereksinimler
- Docker Desktop (Compose V2)
- Git

### Kurulum

```bash
git clone https://github.com/<ekip>/afet-modu.git
cd afet-modu

# Ortam değişkenlerini ayarla
cp .env.example .env
# .env dosyasına OPENROUTER_API_KEY ve MODEL_NAME ekle (opsiyonel, mock mod hazırdır)

# Tek komutla tüm sistemi ayağa kaldır
docker compose up
```

### ⚡ Hızlı CLI Senaryo Testi (Docker Olmadan Doğrudan Çalışır)

Projeyi veya senaryoyu Docker kurmadan/açmadan saniyeler içinde test etmek için:

```bash
# Python ile uçtan uca senaryoyu ve 3 vaka müşterisini test et
py afet-modu/scenario_test.py
```

### 📖 İnteraktif API Dokümantasyonu

Proje kök dizinindeki [`api-docs.html`](file:///c:/Users/topal/Desktop/afet%20modu/api-docs.html) dosyasını tarayıcınızda açarak tüm uç noktaları, şemaları, RBAC kurallarını ve canlı senaryo akışını interaktif olarak inceleyebilirsiniz.

### Servis Adresleri (Docker ile)

| Servis | URL |
|---|---|
| Müşteri Portalı & Çalışan Konsolu (Next.js) | http://localhost:3000 |
| API Gateway (Nginx) | http://localhost:80 |
| İnteraktif Dokümantasyon Sayfası | [`api-docs.html`](file:///c:/Users/topal/Desktop/afet%20modu/api-docs.html) |
| auth-service API Docs | http://localhost:8001/docs |
| core-service API Docs | http://localhost:8002/docs |
| disaster-service API Docs | http://localhost:8003/docs |
| agent-service API Docs | http://localhost:8004/docs |

### Demo Hesapları

| Rol | E-Posta | Şifre | Açıklama |
|---|---|---|---|
| Müşteri (Hatice Hanım) | `hatice@demo.com` | `demo1234` | 72 yaş, Hatay, konut kredisi, DASK var |
| Müşteri (Emre Bey) | `emre@demo.com` | `demo1234` | 34 yaş, K.Maraş, ihtiyaç kredisi |
| Çalışan | `calisan@demo.com` | `demo1234` | Operasyon konsolu, onay kuyruğu |
| Admin | `admin@demo.com` | `demo1234` | Afet simülasyonu başlatma yetkisi |

### Afet Simülasyonu Başlatma

1. `http://localhost:3000` adresine git
2. Admin veya Çalışan (`admin@demo.com` / `demo1234`) ile giriş yap
3. **"Afet Simüle Et"** butonuna tıkla
4. M7.4 deprem → etkilenen müşteri → plan → ekranda bildirim akışını izle
5. `hatice@demo.com` ile müşteri ekranına (`/customer`) geç ve planı tek tıkla onayla

### Yedek Plan (Kafka çalışmazsa)

```bash
EVENT_BUS_BACKEND=redis docker compose up
```

## 📈 KPI ve Banka İçin Değer

| KPI | Tanım |
|---|---|
| Plan hazırlama süresi | Afet bildiriminden müşteriye hazır plana geçen süre |
| Müşteri başına adım sayısı | Hedef: onay tek dokunuş |
| Öncelikli müşteriye ulaşma | Yaşlı/engelli müşterilerin bildirim sırası |
| Onay / temsilci oranı | Kaç müşteri kendi başına onayladı, kaçı temsilci istedi |
| Hata → insan devri | Hedef: %100 güvenli devir |
| Mesaj kalitesi | Yanlış vaat / uygunsuz dil içeren mesaj (hedef: 0) |

---

## 🔒 Güvenlik, Etik ve Hassasiyet

- ✅ **Karar insanda.** Ajan yalnızca taslak açar. Müşteri onayı ve banka çalışanı kontrolü olmadan hiçbir erteleme gerçekleşmez.
- ✅ **Güvenli hata.** Ajan hata verirse otomatik olarak temsilciye aktarılır.
- ✅ **Yanlış vaat yok.** "değerlendirmeye alınmıştır" dili kullanılır; kesin söz verilmez.
- ✅ **Saygılı dil.** "fırsat", "kampanya", "çapraz satış" kesinlikle yoktur.
- ✅ **Dijital uçurum.** Yaşlı müşteriler önceliklidir; proaktif arama ve SMS kanalı tasarımın parçasıdır.
- ✅ **KVKK.** Prototip sentetik veri kullanır. Canlıda amaçla sınırlı işleme zorunludur.
- ✅ **Denetim izi.** Her karar `audit_log` ve `agent_steps` tablolarına yazılır.

---

## 🔭 Gelecek Çalışmalar

- [ ] AFAD/Kandilli akışıyla otomatik tetikleme
- [ ] Acil nakit desteği ve DASK/sigorta hasar sürecinin ajana eklenmesi
- [ ] Sel, yangın gibi diğer afet türleri
- [ ] Çok kanallı iletişim: SMS, arama, uygulama bildirimi
- [ ] Bölge dışındaki afetzede yakınları için beyan kanalı

---

## ⚠️ Varsayımlar

- Tüm müşteriler, krediler ve afet olayı kurgusaldır.
- Erteleme süreleri **mevzuat değildir.**
- Yaşlı tanımı 65 yaş ve üzeridir.
- Faiz ve masraf etkileri bu prototipte hesaplanmaz.
- Kafka çalıştırılamazsa olay yolu Redis Streams'e çevrilebilir.
- LLM modeli ve fiyatı hackathon günü OpenRouter'dan seçilecektir.

---

