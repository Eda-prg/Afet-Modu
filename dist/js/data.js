// VERİ HAVUZU
    const CUSTOMERS = {
      hatice: {
        id: 'cust_hatice_001',
        name: 'Hatice Hanım',
        age: 72,
        city: 'Hatay / Antakya',
        loanType: 'Konut Kredisi',
        installment: '14.500 ₺',
        total: '58.000 ₺',
        months: '4 Ay',
        dask: '✓ DASK Var (DASK-2022-HY-001)',
        priority: 'Yüksek Öncelik',
        msg: 'Sayın Hatice Hanım, geçmiş olsun. Yaşadığınız afet nedeniyle konut krediniz için 4 aylık kolaylaştırıcı erteleme talebiniz, değerlendirmeye alınmak üzere hazırlandı. Mevcut DASK poliçeniz (DASK-2022-HY-001) sistemimizde teyit edilmiştir. Siz uygun görürseniz onayınızla banka değerlendirmesine ilerleyebiliriz; dilerseniz temsilcimiz sizi arasın.',
        docs: [
          'Kimlik fotokopisi / T.C. Kimlik doğrulaması <span style="color:var(--status-green)">(Sistemde mevcut ✓)</span>',
          'Hasar tespit tutanağı veya ikametgâh belgesi <span style="color:var(--status-amber)">(60 gün ek süre)</span>',
          'Tapu örneği <span style="color:var(--status-green)">(Kayıtlı ✓)</span>',
          'DASK poliçe no: <strong>DASK-2022-HY-001</strong>'
        ],
        steps: [
          { tool: 'musteri_bilgisi_getir', agent: 'Ajan A (Planlayıcı)', in: '{"customer_id": "cust_hatice_001"}', out: '{"ad": "Hatice", "yas": 72, "kredi": "konut", "aylik_taksit": 14500, "dask": true, "il": "Hatay"}', ms: 110, desc: 'Müşteri çekirdek verileri core-service üzerinden getirildi.' },
          { tool: 'oncelik_belirle', agent: 'Ajan A (Planlayıcı)', in: '{"yas": 72, "hassas_durum": true}', out: '{"oncelik": "YUKSEK", "kural": "yas >= 65"}', ms: 42, desc: '65 yaş üstü kuralı işletildi → Yüksek Öncelik verildi.' },
          { tool: 'erteleme_taslagi_olustur', agent: 'Ajan A (Planlayıcı)', in: '{"kredi": "konut", "oncelik": "yuksek"}', out: '{"erteleme_ay": 4, "kural": "konut_3 + hassasiyet_1", "kod_ust_sinir": 6}', ms: 80, desc: '3 ay temel + 1 ay hassasiyet desteği hesaplandı; 6 ay üst sınır kontrolü geçti.' },
          { tool: 'belge_listesi_getir', agent: 'Ajan A (Planlayıcı)', in: '{"kredi": "konut", "dask": true}', out: '["kimlik", "hasar_tespit", "tapu", "dask_police_no"]', ms: 48, desc: 'DASK poliçesi mevcut olduğundan poliçe numarası şablona eklendi.' },
          { tool: 'iletisimci_ajan_yaz', agent: 'Ajan B (İletişimci)', in: '{"model": "openai/gpt-4o-mini", "ton": "sakin, saygili"}', out: '"Sayın Hatice Hanım, geçmiş olsun. Konut krediniz için 4 aylık erteleme talebiniz değerlendirmeye alınmak üzere hazırlandı..."', ms: 1240, desc: 'Sakin ve saygılı dil filtresinden geçirildi. Ticari kelimeler ve kesin vaatler elendi.' },
          { tool: 'sohbet_baglam_yukle', agent: 'Ajan C (Sohbet Ajanı)', in: '{"customer_id": "cust_hatice_001", "plan": "4_ay_konut", "dask": "DASK-2022-HY-001"}', out: '{"status": "CONTEXT_READY", "memory_injected": true}', ms: 35, desc: 'Hatice Hanım\'ın kredi, DASK ve 4 aylık plan bağlamı Ajan C sohbet oturumuna sıfır sorguyla yüklendi.' }
        ]
      },
      emre: {
        id: 'cust_emre_002',
        name: 'Emre Bey',
        age: 34,
        city: 'K.Maraş / Elbistan',
        loanType: 'İhtiyaç Kredisi',
        installment: '5.200 ₺',
        total: '15.600 ₺',
        months: '3 Ay',
        dask: 'Uygulanamaz (İhtiyaç)',
        priority: 'Normal Öncelik',
        msg: 'Sayın Emre Bey, geçmiş olsun. Afet bölgesi kapsamında ihtiyaç krediniz için 3 aylık erteleme taslağınız hazırlandı. Onayınız halinde banka yetkilisinin son kontrolüne iletilecektir.',
        docs: [
          'Kimlik fotokopisi / T.C. Kimlik doğrulaması <span style="color:var(--status-green)">(Sistemde mevcut ✓)</span>',
          'Hasar tespit tutanağı veya ikametgâh belgesi <span style="color:var(--status-amber)">(60 gün ek süre)</span>'
        ],
        steps: [
          { tool: 'musteri_bilgisi_getir', agent: 'Ajan A (Planlayıcı)', in: '{"customer_id": "cust_emre_002"}', out: '{"ad": "Emre", "yas": 34, "kredi": "ihtiyac", "aylik_taksit": 5200, "dask": null}', ms: 95, desc: 'Müşteri çekirdek verileri core-service üzerinden çekildi.' },
          { tool: 'oncelik_belirle', agent: 'Ajan A (Planlayıcı)', in: '{"yas": 34, "hassas_durum": false}', out: '{"oncelik": "NORMAL"}', ms: 38, desc: 'Standart akış olarak işaretlendi.' },
          { tool: 'erteleme_taslagi_olustur', agent: 'Ajan A (Planlayıcı)', in: '{"kredi": "ihtiyac", "oncelik": "normal"}', out: '{"erteleme_ay": 3, "kural": "ihtiyac_temel_3", "kod_ust_sinir": 6}', ms: 75, desc: 'İhtiyaç kredisi 3 ay erteleme hesaplandı.' },
          { tool: 'belge_listesi_getir', agent: 'Ajan A (Planlayıcı)', in: '{"kredi": "ihtiyac"}', out: '["kimlik", "hasar_tespit"]', ms: 40, desc: 'İhtiyaç kredisi için sade belge seti listelendi.' },
          { tool: 'iletisimci_ajan_yaz', agent: 'Ajan B (İletişimci)', in: '{"model": "openai/gpt-4o-mini", "ton": "kisa_net"}', out: '"Sayın Emre Bey, geçmiş olsun. Afet bölgesi kapsamında ihtiyaç krediniz için 3 aylık erteleme taslağınız hazırlandı..."', ms: 1100, desc: 'Kısa ve net bilgilendirme mesajı oluşturuldu.' }
        ]
      },
      selma: {
        id: 'cust_selma_003',
        name: 'Selma Hanım',
        age: 58,
        city: 'Malatya / Battalgazi',
        loanType: 'Konut Kredisi',
        installment: '11.000 ₺',
        total: '33.000 ₺',
        months: '3 Ay',
        dask: '⚠ DASK Yok',
        priority: 'Normal Öncelik',
        msg: 'Sayın Selma Hanım, geçmiş olsun. Afet bölgesi kapsamında konut krediniz için 3 aylık erteleme taslağınız hazırlandı. Konutunuzun DASK kaydına ulaşılamamış olup, temsilcimiz haklarınız konusunda sizi bilgilendirecektir. Onayınız halinde banka yetkilisinin son kontrolüne iletilecektir.',
        docs: [
          'Kimlik fotokopisi / T.C. Kimlik doğrulaması <span style="color:var(--status-green)">(Sistemde mevcut ✓)</span>',
          'Hasar tespit tutanağı veya ikametgâh belgesi <span style="color:var(--status-amber)">(60 gün ek süre)</span>',
          'Tapu örneği <span style="color:var(--status-green)">(Kayıtlı ✓)</span>',
          'DASK poliçesi: <strong style="color:var(--status-red)">Kayıt bulunamadı (Temsilci arayacak)</strong>'
        ],
        steps: [
          { tool: 'musteri_bilgisi_getir', agent: 'Ajan A (Planlayıcı)', in: '{"customer_id": "cust_selma_003"}', out: '{"ad": "Selma", "yas": 58, "kredi": "konut", "aylik_taksit": 11000, "dask": false}', ms: 105, desc: 'Konut kredisi verileri getirildi, DASK poliçesi sistemde tespit edilemedi.' },
          { tool: 'oncelik_belirle', agent: 'Ajan A (Planlayıcı)', in: '{"yas": 58}', out: '{"oncelik": "NORMAL"}', ms: 40, desc: 'Öncelik kuralı işletildi.' },
          { tool: 'erteleme_taslagi_olustur', agent: 'Ajan A (Planlayıcı)', in: '{"kredi": "konut"}', out: '{"erteleme_ay": 3, "kural": "konut_temel_3", "kod_ust_sinir": 6}', ms: 80, desc: '3 ay erteleme taslağı açıldı.' },
          { tool: 'belge_listesi_getir', agent: 'Ajan A (Planlayıcı)', in: '{"kredi": "konut", "dask": false}', out: '["kimlik", "hasar_tespit", "tapu", "dask_temsilci_yonlendirme"]', ms: 52, desc: 'DASK eksikliği nedeniyle otomatik temsilci bilgilendirme notu eklendi.' },
          { tool: 'iletisimci_ajan_yaz', agent: 'Ajan B (İletişimci)', in: '{"ton": "sakin, yonlendirici"}', out: '"Sayın Selma Hanım, geçmiş olsun... Konutunuzun DASK kaydına ulaşılamamış olup temsilcimiz arayacaktır."', ms: 1190, desc: 'DASK konusunda müşteri yönlendirmesi içeren metin hazırlandı.' }
        ]
      },
      // 🌊 RİZE SEL & HEYELAN FELAKETİ MÜŞTERİLERİ (+5 KİŞİ)
      dursun: {
        id: 'cust_rize_001',
        name: 'Dursun Ali Reis',
        age: 69,
        city: 'Rize / Çayeli (Aşıklar Deresi Taşkın Bölgesi)',
        loanType: 'Tarım & Konut Kredisi',
        installment: '16.200 ₺',
        total: '64.800 ₺',
        months: '4 Ay',
        dask: '✓ DASK Var (DASK-2023-RZ-401)',
        priority: 'Yüksek Öncelik (65+ Yaş & Afet Bölgesi)',
        msg: 'Sayın Dursun Ali Bey, geçmiş olsun. Rize Çayeli ilçemizdeki sel felaketi sebebiyle çay tarımı ve konut krediniz için 4 aylık erteleme talebiniz değerlendirmeye alınmak üzere hazırlandı. DASK poliçeniz sistemimizde teyit edilmiştir. Siz uygun görürseniz onayınızla banka değerlendirmesine iletebiliriz; dilerseniz temsilcimiz sizi arasın.',
        docs: [
          'Kimlik fotokopisi / T.C. Kimlik doğrulaması <span style="color:var(--status-green)">(Sistemde mevcut ✓)</span>',
          'Çiftçi Kayıt Sistemi (ÇKS) / Tapu örneği <span style="color:var(--status-green)">(Kayıtlı ✓)</span>',
          'İlçe Tarım & AFAD hasar tespit tutanağı <span style="color:var(--status-amber)">(60 gün ek süre)</span>',
          'DASK poliçe no: <strong>DASK-2023-RZ-401</strong>'
        ],
        steps: [
          { tool: 'sel_risk_haritasi_sorgula', agent: 'Ajan A (Planlayıcı)', in: '{"il": "Rize", "ilce": "Cayeli", "koordinat": "41.09, 40.72"}', out: '{"durum": "KIRMIZI_KOD_SEL", "risk": "KRITIK", "kaynak": "MGM/AFAD"}', ms: 92, desc: 'Meteoroloji kırmızı kod sel uyarısı ve Çayeli taşkın havzası eşleştirildi.' },
          { tool: 'musteri_bilgisi_getir', agent: 'Ajan A (Planlayıcı)', in: '{"customer_id": "cust_rize_001"}', out: '{"ad": "Dursun Ali", "yas": 69, "kredi": "tarim_konut", "aylik": 16200, "dask": true}', ms: 85, desc: '69 yaşındaki çay üreticisi müşterinin kredi ve aktif DASK kaydı çekildi.' },
          { tool: 'oncelik_belirle', agent: 'Ajan A (Planlayıcı)', in: '{"yas": 69, "afet": "sel_kirmizi_kod"}', out: '{"oncelik": "YUKSEK", "gerekce": "yas >= 65"}', ms: 35, desc: 'Hassas yaş grubu (69 yaş) nedeniyle Yüksek Öncelik atandı.' },
          { tool: 'erteleme_taslagi_olustur', agent: 'Ajan A (Planlayıcı)', in: '{"kredi": "konut", "oncelik": "yuksek"}', out: '{"erteleme_ay": 4, "kural": "konut_3 + yasli_1", "kod_ust_sinir": 6}', ms: 75, desc: '3 ay temel + 1 ay yaşlı desteği (toplam 4 ay) oluşturuldu; 6 ay üst sınır korundu.' },
          { tool: 'belge_listesi_getir', agent: 'Ajan A (Planlayıcı)', in: '{"kredi": "konut", "dask": true, "afet": "sel"}', out: '["kimlik", "tapu_cks", "hasar_tespit", "dask_police_no"]', ms: 45, desc: 'Sel hasar tespiti ve ÇKS evrakları için 60 gün süre tanımlandı.' },
          { tool: 'iletisimci_ajan_yaz', agent: 'Ajan B (İletişimci)', in: '{"ton": "saygili_empatik", "bolge": "Rize Çayeli"}', out: '"Sayın Dursun Ali Bey, geçmiş olsun. Rize Çayeli ilçemizdeki sel felaketi sebebiyle..."', ms: 1140, desc: 'Rize sel ve çay tarımı bağlamına uygun saygılı bildirim metni üretildi.' }
        ]
      },
      fadime: {
        id: 'cust_rize_002',
        name: 'Fadime Kaya',
        age: 71,
        city: 'Rize / Ardeşen (Fırtına Vadisi Kıyı Hattı)',
        loanType: 'Konut Kredisi',
        installment: '12.400 ₺',
        total: '49.600 ₺',
        months: '4 Ay',
        dask: '✓ DASK Var (DASK-2024-RZ-112)',
        priority: 'Yüksek Öncelik (65+ Yaş)',
        msg: 'Sayın Fadime Hanım, geçmiş olsun. Rize Ardeşen taşkın hattı kapsamında konut krediniz için 4 aylık erteleme planı oluşturuldu. Onayınız ile talep banka personelimizin inceleme havuzuna iletilecektir.',
        docs: [
          'Kimlik fotokopisi / T.C. Kimlik doğrulaması <span style="color:var(--status-green)">(Sistemde mevcut ✓)</span>',
          'Tapu örneği <span style="color:var(--status-green)">(Kayıtlı ✓)</span>',
          'DASK poliçe no: <strong>DASK-2024-RZ-112</strong>'
        ],
        steps: [
          { tool: 'musteri_bilgisi_getir', agent: 'Ajan A (Planlayıcı)', in: '{"customer_id": "cust_rize_002"}', out: '{"ad": "Fadime", "yas": 71, "kredi": "konut", "aylik": 12400, "dask": true}', ms: 78, desc: 'Müşteri konut kredisi ve aktif DASK kaydı doğrulandı.' },
          { tool: 'oncelik_belirle', agent: 'Ajan A (Planlayıcı)', in: '{"yas": 71}', out: '{"oncelik": "YUKSEK"}', ms: 30, desc: '71 yaş sebebiyle Yüksek Öncelik atandı.' },
          { tool: 'erteleme_taslagi_olustur', agent: 'Ajan A (Planlayıcı)', in: '{"kredi": "konut", "oncelik": "yuksek"}', out: '{"erteleme_ay": 4, "kod_ust_sinir": 6}', ms: 65, desc: '4 ay faizsiz öteleme taslağı bağlandı.' },
          { tool: 'iletisimci_ajan_yaz', agent: 'Ajan B (İletişimci)', in: '{"ton": "sakin_guvenli"}', out: '"Sayın Fadime Hanım, geçmiş olsun..."', ms: 980, desc: 'Duyarlı ve sakin tonlu metin üretildi.' }
        ]
      },
      temel: {
        id: 'cust_rize_003',
        name: 'Temel Karadeniz',
        age: 42,
        city: 'Rize / Merkez (Portakallık Mah.)',
        loanType: 'İhtiyaç Kredisi',
        installment: '5.800 ₺',
        total: '17.400 ₺',
        months: '3 Ay',
        dask: 'Uygulanamaz (İhtiyaç Kredisi)',
        priority: 'Normal Öncelik',
        msg: 'Sayın Temel Bey, geçmiş olsun. Rize merkezdeki su baskınları kapsamında ihtiyaç krediniz için 3 aylık kolaylaştırıcı erteleme taslağınız hazırlanmıştır.',
        docs: [
          'Kimlik fotokopisi / T.C. Kimlik doğrulaması <span style="color:var(--status-green)">(Sistemde mevcut ✓)</span>',
          'İkametgâh belgesi <span style="color:var(--status-amber)">(60 gün ek süre)</span>'
        ],
        steps: [
          { tool: 'musteri_bilgisi_getir', agent: 'Ajan A (Planlayıcı)', in: '{"customer_id": "cust_rize_003"}', out: '{"ad": "Temel", "yas": 42, "kredi": "ihtiyac", "aylik": 5800}', ms: 82, desc: 'Müşteri ihtiyaç kredisi verileri getirildi.' },
          { tool: 'oncelik_belirle', agent: 'Ajan A (Planlayıcı)', in: '{"yas": 42}', out: '{"oncelik": "NORMAL"}', ms: 28, desc: 'Standart akış olarak işaretlendi.' },
          { tool: 'erteleme_taslagi_olustur', agent: 'Ajan A (Planlayıcı)', in: '{"kredi": "ihtiyac"}', out: '{"erteleme_ay": 3, "kod_ust_sinir": 6}', ms: 60, desc: '3 ay erteleme hesaplandı.' },
          { tool: 'iletisimci_ajan_yaz', agent: 'Ajan B (İletişimci)', in: '{"ton": "kisa_net"}', out: '"Sayın Temel Bey, geçmiş olsun..."', ms: 920, desc: 'Net ve şeffaf erteleme mesajı oluşturuldu.' }
        ]
      },
      asiye: {
        id: 'cust_rize_004',
        name: 'Asiye Yıldız',
        age: 38,
        city: 'Rize / Fındıklı (Sümer Köyü)',
        loanType: 'Esnaf Kredisi',
        installment: '8.500 ₺',
        total: '25.500 ₺',
        months: '3 Ay',
        dask: 'Uygulanamaz',
        priority: 'Normal Öncelik',
        msg: 'Sayın Asiye Hanım, geçmiş olsun. Rize Fındıklı ilçesindeki heyelan ve taşkın afeti dolayısıyla esnaf krediniz için 3 aylık erteleme taslağınız hazırlanmıştır.',
        docs: [
          'Kimlik fotokopisi / T.C. Kimlik doğrulaması <span style="color:var(--status-green)">(Sistemde mevcut ✓)</span>',
          'Esnaf Sicil & Vergi Levhası örneği <span style="color:var(--status-green)">(Kayıtlı ✓)</span>'
        ],
        steps: [
          { tool: 'musteri_bilgisi_getir', agent: 'Ajan A (Planlayıcı)', in: '{"customer_id": "cust_rize_004"}', out: '{"ad": "Asiye", "yas": 38, "kredi": "esnaf", "aylik": 8500}', ms: 75, desc: 'Esnaf kredi kaydı doğrulandı.' },
          { tool: 'oncelik_belirle', agent: 'Ajan A (Planlayıcı)', in: '{"yas": 38}', out: '{"oncelik": "NORMAL"}', ms: 25, desc: 'Normal öncelik tespit edildi.' },
          { tool: 'erteleme_taslagi_olustur', agent: 'Ajan A (Planlayıcı)', in: '{"kredi": "ihtiyac"}', out: '{"erteleme_ay": 3, "kod_ust_sinir": 6}', ms: 55, desc: '3 ay erteleme bağlandı.' },
          { tool: 'iletisimci_ajan_yaz', agent: 'Ajan B (İletişimci)', in: '{"ton": "destekleyici"}', out: '"Sayın Asiye Hanım, geçmiş olsun..."', ms: 890, desc: 'Esnaf odaklı destekleyici bildirim üretildi.' }
        ]
      },
      idris: {
        id: 'cust_rize_005',
        name: 'İdris Çepni',
        age: 66,
        city: 'Rize / Güneysu (Merkez Mah.)',
        loanType: 'Konut Kredisi',
        installment: '10.500 ₺',
        total: '42.000 ₺',
        months: '4 Ay',
        dask: '⚠ Sigorta Yok (Temsilci Danışmanlığı)',
        priority: 'Yüksek Öncelik (65+ Yaş & Temsilci Devri)',
        msg: 'Sayın İdris Bey, geçmiş olsun. Güneysu sel felaketi sebebiyle konut krediniz için 4 aylık erteleme taslağınız hazırlanmıştır. Konutunuzun sigortasına ulaşılamadığından temsilcimiz sizi arayarak haklarınız ve hasar tespit desteği konusunda yardımcı olacaktır.',
        docs: [
          'Kimlik fotokopisi / T.C. Kimlik doğrulaması <span style="color:var(--status-green)">(Sistemde mevcut ✓)</span>',
          'Tapu örneği <span style="color:var(--status-green)">(Kayıtlı ✓)</span>',
          'DASK/Sel Poliçesi: <strong style="color:var(--status-red)">Poliçe tespit edilemedi (Temsilci arayacak)</strong>'
        ],
        steps: [
          { tool: 'musteri_bilgisi_getir', agent: 'Ajan A (Planlayıcı)', in: '{"customer_id": "cust_rize_005"}', out: '{"ad": "İdris", "yas": 66, "kredi": "konut", "aylik": 10500, "dask": false}', ms: 84, desc: 'Müşteri konut kredisi çekildi, sel/DASK poliçesi bulunamadı.' },
          { tool: 'oncelik_belirle', agent: 'Ajan A (Planlayıcı)', in: '{"yas": 66}', out: '{"oncelik": "YUKSEK"}', ms: 32, desc: '66 yaş nedeniyle Yüksek Öncelik atandı.' },
          { tool: 'erteleme_taslagi_olustur', agent: 'Ajan A (Planlayıcı)', in: '{"kredi": "konut", "oncelik": "yuksek"}', out: '{"erteleme_ay": 4, "kod_ust_sinir": 6}', ms: 70, desc: '4 ay erteleme taslağı bağlandı.' },
          { tool: 'temsilci_devir_kontrol', agent: 'Ajan A (Planlayıcı)', in: '{"dask": false, "afet": "sel"}', out: '{"devir_gerekli": true, "sebep": "sigorta_eksik_danismanlik"}', ms: 45, desc: 'DASK ve sel teminatı olmaması sebebiyle otomatik temsilci devir bayrağı kalktı.' },
          { tool: 'iletisimci_ajan_yaz', agent: 'Ajan B (İletişimci)', in: '{"ton": "guvence_veren", "temsilci_arama": true}', out: '"Sayın İdris Bey, geçmiş olsun... Konutunuzun sigorta kaydına ulaşılamadığından temsilcimiz arayacaktır."', ms: 1040, desc: 'Müşteriyi telaşlandırmayan, temsilci yönlendirmeli metin oluşturuldu.' }
        ]
      }
    };
    window.CUSTOMERS = CUSTOMERS;

    // ════════════════════════════════════════════════════════════════
    // LIMAN BANKASI ÇEKİRDEK VERİTABANI VE İŞLEM DEFTERİ (CORE DB & AUDIT)
    // ════════════════════════════════════════════════════════════════
    const LimanDB = {
      KEY_CUSTOMERS: 'liman_db_customers_v2',
      KEY_TX: 'liman_db_transactions_v2',

      initialTransactions: [
        {
          id: 'TX-2026-001',
          time: '04:17:15',
          date: '30.09.2026',
          customerId: 'cust_hatice_001',
          customerName: 'Hatice Hanım',
          type: 'KREDİ_ERTELEME_ONAYI',
          loanType: 'Konut Kredisi',
          amount: '58.000 ₺',
          period: '4 Ay',
          status: 'ONAYLANDI',
          channel: 'Liman Mobil (Ajan C Destekli)',
          note: '0% faiz ile 4 aylık erteleme müşterinin doğrudan mobil onayıyla kesinleşti.'
        },
        {
          id: 'TX-2026-002',
          time: '04:17:08',
          date: '30.09.2026',
          customerId: 'cust_selma_003',
          customerName: 'Selma Hanım',
          type: 'TEMSİLCİ_DEVİR',
          loanType: 'Konut Kredisi',
          amount: '44.000 ₺',
          period: '4 Ay',
          status: 'TEMSİLCİDE',
          channel: 'Kural Motoru (Ajan A)',
          note: 'DASK poliçesi eksikliği nedeniyle uzman müşteri temsilcisi havuzuna yönlendirildi.'
        },
        {
          id: 'TX-2026-003',
          time: '04:17:05',
          date: '30.09.2026',
          customerId: 'cust_emre_002',
          customerName: 'Emre Bey',
          type: 'TASLAK_HAZIRLANDI',
          loanType: 'İhtiyaç Kredisi',
          amount: '15.600 ₺',
          period: '3 Ay',
          status: 'BEKLEMEDE',
          channel: 'Ajan A (Planlayıcı)',
          note: '3 aylık ihtiyaç kredisi erteleme taslağı oluşturuldu ve SMS bildirimi iletildi.'
        },
        {
          id: 'TX-2026-004',
          time: '04:18:22',
          date: '30.09.2026',
          customerId: 'cust_rize_001',
          customerName: 'Dursun Ali Reis',
          type: 'YENİ_AFET_TESPİTİ',
          loanType: 'Tarım / Ticari Kredi',
          amount: '72.000 ₺',
          period: '4 Ay',
          status: 'BEKLEMEDE',
          channel: 'Rize Sel Afet Entegrasyonu',
          note: 'MGM Kırmızı Kod uyarısı ile Çayeli taşkın bölgesinde tespit edilip havuza eklendi.'
        }
      ],

      init() {
        try {
          // Müşterileri localStorage'dan yükle veya başlangıç durumunu kaydet
          const savedCust = localStorage.getItem(this.KEY_CUSTOMERS);
          if (savedCust) {
            const parsed = JSON.parse(savedCust);
            Object.assign(CUSTOMERS, parsed);
          } else {
            this.saveCustomers();
          }

          // İşlem geçmişini localStorage'a senkronize et
          const savedTx = localStorage.getItem(this.KEY_TX);
          if (!savedTx) {
            localStorage.setItem(this.KEY_TX, JSON.stringify(this.initialTransactions));
          }
        } catch (e) {
          console.warn('LimanDB init error:', e);
        }
      },

      saveCustomers() {
        try {
          localStorage.setItem(this.KEY_CUSTOMERS, JSON.stringify(CUSTOMERS));
        } catch (e) {
          console.error('LimanDB localStorage error:', e);
        }

        // Açık veritabanı penceresi varsa doğrudan güncelle (hata durumunda sessizce geç)
        try {
          if (typeof window !== 'undefined' && window._dbWindow) {
            if (window._dbWindow.CUSTOMERS) {
              Object.assign(window._dbWindow.CUSTOMERS, CUSTOMERS);
            }
            if (window._dbWindow.onRemoteUpdateReceived) {
              window._dbWindow.onRemoteUpdateReceived('Canlı Senkronizasyon (Veritabanı Güncellendi)');
            }
          }
        } catch (e) {}

        // Gömülü iframe varsa doğrudan güncelle (0ms anında senkron)
        try {
          if (typeof document !== 'undefined') {
            const ifr = document.getElementById('db-iframe');
            if (ifr && ifr.contentWindow) {
              if (ifr.contentWindow.CUSTOMERS) {
                Object.assign(ifr.contentWindow.CUSTOMERS, CUSTOMERS);
              }
              if (ifr.contentWindow.onRemoteUpdateReceived) {
                ifr.contentWindow.onRemoteUpdateReceived('Canlı Senkronizasyon (Veritabanı Güncellendi)');
              }
            }
          }
        } catch (e) {}

        // Ana pencereden açılmışsak ana pencere hafızasını da güncelle
        try {
          if (typeof window !== 'undefined' && window.opener && window.opener.CUSTOMERS) {
            Object.assign(window.opener.CUSTOMERS, CUSTOMERS);
          }
        } catch (e) {}
      },

      getTransactions() {
        try {
          const raw = localStorage.getItem(this.KEY_TX);
          return raw ? JSON.parse(raw) : this.initialTransactions;
        } catch (e) {
          return this.initialTransactions;
        }
      },

      addTransaction(tx) {
        try {
          const list = this.getTransactions();
          const now = new Date();
          const newTx = {
            id: 'TX-' + Math.floor(1000 + Math.random() * 9000),
            time: now.toTimeString().split(' ')[0],
            date: now.toLocaleDateString('tr-TR'),
            ...tx
          };
          list.unshift(newTx);
          localStorage.setItem(this.KEY_TX, JSON.stringify(list));
          return newTx;
        } catch (e) {
          console.error('LimanDB addTransaction error:', e);
        }
      },

      // 1. KREDİ ERTELEME ONAYI KAYDI
      recordLoanApproval(custKey, channel = 'Liman Dijital Bankacılık') {
        const c = CUSTOMERS[custKey];
        if (!c) return;
        c.approved = true;
        c.escalated = false;
        c.declined = false;
        c.loanStatus = 'ONAYLANDI';
        const nowIso = new Date().toISOString().replace('T', ' ').substring(0, 19);
        c.updatedAt = nowIso;

        this.saveCustomers();
        this.addTransaction({
          customerId: c.id,
          customerName: c.name,
          type: 'KREDİ_ERTELEME_ONAYI',
          loanType: c.loanType,
          amount: c.total || c.installment,
          period: c.months,
          status: 'ONAYLANDI',
          channel: channel,
          note: `${c.loanType} için ${c.months} erteleme onayı veritabanına işlendi. Korunan taksit: ${c.total || c.installment}.`
        });
        this.broadcastChange('LOAN_APPROVED', `${c.name} kredisini onayladı (${c.months} - ONAYLANDI)`);

        try {
          if (window._dbWindow && window._dbWindow.onRemoteUpdateReceived) {
            window._dbWindow.onRemoteUpdateReceived(`${c.name} kredisini onayladı (core.customers & core.loans güncellendi)`);
          }
        } catch (e) {}
      },

      // 2. YENİ MÜŞTERİ KAYDI (LİMANLI OL)
      recordNewCustomer(custKey, customerData) {
        const nowIso = new Date().toISOString().replace('T', ' ').substring(0, 19);
        CUSTOMERS[custKey] = {
          ...customerData,
          loanStatus: customerData.approved ? 'ONAYLANDI' : 'BEKLEMEDE',
          registeredAt: nowIso,
          updatedAt: nowIso
        };
        this.saveCustomers();
        this.addTransaction({
          customerId: customerData.id,
          customerName: customerData.name,
          type: 'YENİ_MÜŞTERİ_KAYDI',
          loanType: customerData.loanType,
          amount: customerData.total,
          period: customerData.months,
          status: customerData.approved ? 'ONAYLANDI' : 'BEKLEMEDE',
          channel: 'Limanlı Ol Kayıt Portalı',
          note: `Yeni müşteri kaydı core.customers ve core.loans tablosuna eklendi.`
        });
        this.broadcastChange('NEW_CUSTOMER', `${customerData.name} yeni kayıt oldu (${customerData.city})`);

        try {
          if (window._dbWindow && window._dbWindow.onRemoteUpdateReceived) {
            window._dbWindow.onRemoteUpdateReceived(`${customerData.name} yeni müşteri olarak core.customers tablosuna eklendi`);
          }
        } catch (e) {}
      },

      // 3. TEMSİLCİ DEVİR KAYDI
      recordEscalation(custKey, reason = 'Müşteri danışmanlık talep etti', channel = 'Liman Destek Hattı') {
        const c = CUSTOMERS[custKey];
        if (!c) return;
        c.escalated = true;
        c.approved = false;
        c.declined = false;
        c.loanStatus = 'TEMSİLCİDE';
        c.updatedAt = new Date().toLocaleString('tr-TR');

        this.saveCustomers();
        this.addTransaction({
          customerId: c.id,
          customerName: c.name,
          type: 'TEMSİLCİ_DEVİR',
          loanType: c.loanType,
          amount: c.total || c.installment,
          period: c.months,
          status: 'TEMSİLCİDE',
          channel: channel,
          note: `Temsilci arama talebi açıldı. Neden: ${reason}`
        });
        this.broadcastChange('ESCALATION', `${c.name} temsilci talebi açtı (${reason})`);
      },

      // 4. VAZGEÇME / NORMAL ÖDEME KAYDI
      recordOptOut(custKey, channel = 'Liman Mobil') {
        const c = CUSTOMERS[custKey];
        if (!c) return;
        c.declined = true;
        c.approved = false;
        c.escalated = false;
        c.loanStatus = 'NORMAL_ÖDEME';
        c.updatedAt = new Date().toLocaleString('tr-TR');

        this.saveCustomers();
        this.addTransaction({
          customerId: c.id,
          customerName: c.name,
          type: 'ERTELEMEDEN_FERAGAT',
          loanType: c.loanType,
          amount: c.total || c.installment,
          period: c.months,
          status: 'NORMAL_ÖDEME',
          channel: channel,
          note: 'Müşteri afet ertelemesinden feragat etti, olağan taksit ödeme planına devam kararı verdi.'
        });
        this.broadcastChange('OPTOUT', `${c.name} ertelemeden vazgeçti (Normal Öde)`);
      },

      // 5. YENİ AFET (RİZE SELİ) SİSTEME DÜŞTÜĞÜNDE
      recordFloodEvent() {
        const rizeKeys = ['dursun', 'fadime', 'temel', 'asiye', 'idris'];
        rizeKeys.forEach(k => {
          if (CUSTOMERS[k]) {
            if (!CUSTOMERS[k].loanStatus) {
              CUSTOMERS[k].loanStatus = (k === 'idris') ? 'TEMSİLCİDE' : 'BEKLEMEDE';
            }
          }
        });
        this.saveCustomers();
        this.addTransaction({
          customerId: 'MGM-RIZE-2026',
          customerName: 'Rize Sel Afet Havuzu (+5 Müşteri)',
          type: 'YENİ_AFET_TESPİTİ',
          loanType: 'Tarım / Konut / Esnaf',
          amount: '215.000 ₺ Toplam',
          period: '3 - 4 Ay',
          status: 'BEKLEMEDE',
          channel: 'Meteoroloji GM & AFAD Kırmızı Kod',
          note: 'Rize Çayeli, Ardeşen, Fındıklı, Güneysu sel taşkın felaketi sisteme entegre edildi. 5 yeni müşteri veritabanına işlendi.'
        });
        this.broadcastChange('DISASTER_TRIGGERED', 'Rize Sel Felaketi sisteme düştü (+5 yeni müşteri eklendi)');
      },

      // GERÇEK ZAMANLI SEKRONİZASYON YAYINI (BROADCAST & STORAGE PING)
      broadcastChange(action, detail) {
        try {
          const payload = { time: Date.now(), action, detail };
          localStorage.setItem('liman_db_sync_ping', JSON.stringify(payload));
          if (typeof BroadcastChannel !== 'undefined') {
            if (!this._bc) this._bc = new BroadcastChannel('liman_db_sync');
            this._bc.postMessage(payload);
          }
        } catch (e) {
          console.warn('broadcast error:', e);
        }
      },

      // Veritabanını Sıfırlama
      resetDatabase() {
        if (confirm('Liman Bankası veritabanını fabrika ayarlarına sıfırlamak istediğinize emin misiniz?')) {
          localStorage.removeItem(this.KEY_CUSTOMERS);
          localStorage.removeItem(this.KEY_TX);
          localStorage.removeItem('liman_db_sync_ping');
          this.broadcastChange('DB_RESET', 'Veritabanı sıfırlandı');
          location.reload();
        }
      },

      // JSON Olarak Dışa Aktarma
      exportJSON() {
        const payload = {
          bank: 'Liman Bankası A.Ş.',
          system: 'Afet Modu Çekirdek Veritabanı (Core DB)',
          exportedAt: new Date().toISOString(),
          customerCount: Object.keys(CUSTOMERS).length,
          customers: CUSTOMERS,
          transactions: this.getTransactions()
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `liman_bankasi_db_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      },

      // Müşteri listesini hem bellek hem de localStorage ile tazeleyerek getir
      getCustomers() {
        try {
          if (typeof window !== 'undefined' && window.opener) {
            try {
              if (window.opener.CUSTOMERS) {
                Object.assign(CUSTOMERS, window.opener.CUSTOMERS);
              }
            } catch (e) {}
          }
          const raw = localStorage.getItem(this.KEY_CUSTOMERS);
          if (raw) {
            const parsed = JSON.parse(raw);
            Object.assign(CUSTOMERS, parsed);
          }
        } catch (e) {
          console.warn('getCustomers sync err:', e);
        }
        return CUSTOMERS;
      }
    };

    window.LimanDB = LimanDB;