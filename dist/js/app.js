let selectedCustKey = 'hatice';
    let currentRole = 'staff';

    // CANLI EVENT LOGLARI
    const eventLogs = [
      { time: '04:17:01', topic: 'disaster.declared', desc: 'M7.4 Kahramanmaraş Depremi AFAD/Kandilli akışından alındı' },
      { time: '04:17:02', topic: 'customer.affected', desc: '258 müşteri afet koordinatlarıyla eşleştirildi' },
      { time: '04:17:03', topic: 'agent.loop.start', desc: 'Ajan A (Planlayıcı) cust_hatice_001 için uyandı (72 yaş)' },
      { time: '04:17:04', topic: 'plan.drafted', desc: 'cust_hatice_001 için 4 ay (3+1 hassasiyet) taslak hazırlandı' },
      { time: '04:17:05', topic: 'plan.drafted', desc: 'cust_emre_002 için 3 ay ihtiyaç ertelemesi hazırlandı' },
      { time: '04:17:06', topic: 'plan.escalated', desc: 'cust_selma_003: DASK poliçesi eksikliği nedeniyle temsilciye devredildi' },
      { time: '04:17:15', topic: 'plan.approved', desc: 'Hatice Hanım mobilden planı onayladı → Çalışan onayına gitti' }
    ];

    function renderEvents() {
      const box = document.getElementById('event-feed-box');
      box.innerHTML = eventLogs.map(e => `
        <div class="event-entry">
          <div style="display:flex;justify-content:space-between;color:var(--text-dim);font-size:10px">
            <span>[${e.time}]</span>
            <strong style="color:var(--ing-primary)">${e.topic}</strong>
          </div>
          <div style="color:var(--text-main);margin-top:3px">${e.desc}</div>
        </div>
      `).join('');
    }

    // GİRİŞ / LİMANLI OL MOD GEÇİŞİ
    function switchLoginMode(mode) {
      document.getElementById('btn-login-tab').classList.toggle('active', mode === 'login');
      document.getElementById('btn-register-tab').classList.toggle('active', mode === 'register');
      document.getElementById('form-login-box').style.display = mode === 'login' ? 'block' : 'none';
      document.getElementById('form-register-box').style.display = mode === 'register' ? 'block' : 'none';
      document.getElementById('login-error-msg').style.display = 'none';

      if (mode === 'register') {
        setTimeout(() => {
          const container = document.getElementById('reg-scroll-container');
          if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
        }, 50);
      }
    }

    // YUKARI-AŞAĞI HAREKET ETTİRME / KAYDIRMA
    function scrollRegister(dir) {
      const container = document.getElementById('reg-scroll-container');
      if (!container) return;
      if (dir === 'top') {
        container.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (dir === 'bottom') {
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      } else if (dir === 'toggle') {
        if (container.scrollTop > 80) {
          container.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
        }
      }
    }

    function handleScrollUpdate() {
      const container = document.getElementById('reg-scroll-container');
      const hint = document.getElementById('scroll-direction-hint');
      if (!container || !hint) return;
      if (container.scrollTop > 100) {
        hint.innerHTML = 'Başa Dön ↑';
      } else {
        hint.innerHTML = 'Aşağı Kaydır ↓';
      }
    }

    // ŞİFRE GÖSTER / GİZLE
    function togglePassword(inputId, btn) {
      const input = document.getElementById(inputId);
      if (input.type === 'password') {
        input.type = 'text';
        btn.innerText = '🙈';
      } else {
        input.type = 'password';
        btn.innerText = '👁';
      }
    }

    // HIZLI DEMO GİRİŞİ
    function fillAndLogin(identifier, pass, role, custKey) {
      document.getElementById('login-identifier').value = identifier;
      document.getElementById('login-password').value = pass;
      loginAs(role, custKey);
    }

    // FORM İLE ŞİFRELİ GİRİŞ YAP
    function handleFormLogin(e) {
      e.preventDefault();
      const identifier = document.getElementById('login-identifier').value.trim().toLowerCase();
      const pass = document.getElementById('login-password').value;
      const errBox = document.getElementById('login-error-msg');

      if (!identifier || !pass) {
        errBox.innerText = 'Lütfen T.C. Kimlik / e-posta ve şifrenizi girin.';
        errBox.style.display = 'block';
        return;
      }

      if (identifier.includes('hatice')) {
        loginAs('customer', 'hatice');
      } else if (identifier.includes('emre')) {
        loginAs('customer', 'emre');
      } else if (identifier.includes('selma')) {
        loginAs('customer', 'selma');
      } else if (identifier.includes('calisan') || identifier.includes('staff')) {
        loginAs('staff', null);
      } else if (identifier.includes('admin')) {
        loginAs('admin', null);
      } else if (CUSTOMERS[identifier]) {
        loginAs('customer', identifier);
      } else {
        let foundKey = Object.keys(CUSTOMERS).find(k => 
          (CUSTOMERS[k].email && CUSTOMERS[k].email.toLowerCase() === identifier) || 
          CUSTOMERS[k].id === identifier || 
          CUSTOMERS[k].name.toLowerCase().includes(identifier)
        );
        if (foundKey) {
          loginAs('customer', foundKey);
        } else {
          // Dinamik müşteri oluşturup gir
          const dynKey = 'dyn_' + Date.now();
          CUSTOMERS[dynKey] = {
            id: 'cust_' + Math.floor(1000 + Math.random() * 9000),
            name: identifier.split('@')[0].toUpperCase(),
            age: 45,
            city: 'Hatay / Antakya',
            loanType: 'İhtiyaç Kredisi',
            installment: '6.400 ₺',
            total: '19.200 ₺',
            months: '3 Ay',
            dask: 'Uygulanamaz',
            priority: 'Normal Öncelik',
            msg: `Sayın ${identifier.split('@')[0]}, geçmiş olsun. Afet bölgesi kapsamında krediniz için 3 aylık erteleme taslağınız hazırlanmıştır.`,
            docs: ['Kimlik fotokopisi / T.C. Kimlik doğrulaması ✓', 'Hasar tespit veya ikametgâh belgesi'],
            steps: CUSTOMERS.emre.steps
          };
          loginAs('customer', dynKey);
        }
      }
    }

    // LİMANLI OL (KAYIT OL) FORMU
    function handleFormRegister(e) {
      e.preventDefault();
      const name = document.getElementById('reg-name').value.trim();
      const surname = document.getElementById('reg-surname').value.trim();
      const tckn = document.getElementById('reg-tckn').value.trim();
      const age = parseInt(document.getElementById('reg-age').value) || 35;
      const city = document.getElementById('reg-city').value;
      const email = document.getElementById('reg-email').value.trim();
      const loanType = document.getElementById('reg-loan').value;
      const daskVal = document.getElementById('reg-dask').value === 'true';
      const isHassas = document.getElementById('reg-hassas').checked || age >= 65;

      const custKey = 'user_' + Date.now();
      const fullName = `${name} ${surname}`;

      let ertelemeAy = (loanType === 'kart') ? 2 : 3;
      if (isHassas) ertelemeAy += 1;
      ertelemeAy = Math.min(ertelemeAy, 6);

      const aylik = (loanType === 'konut') ? 13500 : (loanType === 'ihtiyac' ? 5800 : 3200);
      const toplam = aylik * ertelemeAy;

      CUSTOMERS[custKey] = {
        id: 'cust_' + tckn.slice(0, 4) + '_' + Math.floor(100 + Math.random() * 900),
        name: fullName,
        email: email,
        age: age,
        city: `${city} (Afet Bölgesi)`,
        loanType: (loanType === 'konut' ? 'Konut Kredisi' : (loanType === 'ihtiyac' ? 'İhtiyaç Kredisi' : 'Kredi Kartı')),
        installment: aylik.toLocaleString('tr-TR') + ' ₺',
        total: toplam.toLocaleString('tr-TR') + ' ₺',
        months: `${ertelemeAy} Ay`,
        dask: (loanType === 'konut' ? (daskVal ? '✓ DASK Var' : '⚠ DASK Yok (Temsilci Bilgilendirecek)') : 'Uygulanamaz'),
        priority: isHassas ? 'Yüksek Öncelik' : 'Normal Öncelik',
        msg: `Sayın ${fullName}, geçmiş olsun. Afet bölgesi kapsamında ${loanType} krediniz için ${ertelemeAy} aylık kolaylaştırıcı erteleme talebiniz hazırlanmıştır.`,
        docs: [
          'Kimlik fotokopisi / T.C. Kimlik doğrulaması <span style="color:var(--status-green)">(Onaylandı ✓)</span>',
          'Hasar tespit tutanağı veya ikametgâh belgesi <span style="color:var(--status-amber)">(60 gün ek süre)</span>',
          loanType === 'konut' ? 'Tapu örneği <span style="color:var(--status-green)">(İnceleniyor)</span>' : null,
          loanType === 'konut' ? (daskVal ? 'DASK Poliçesi: Doğrulandı ✓' : '<strong style="color:var(--status-red)">DASK Poliçesi Eksik (Temsilci arayacak)</strong>') : null
        ].filter(Boolean),
        steps: [
          { tool: 'musteri_bilgisi_getir', agent: 'Ajan A (Planlayıcı)', in: `{"customer_id": "${tckn}"}`, out: `{"ad": "${fullName}", "yas": ${age}, "il": "${city}", "kredi": "${loanType}"}`, ms: 105, desc: 'Yeni kayıtlı müşteri çekirdek verileri oluşturuldu.' },
          { tool: 'oncelik_belirle', agent: 'Ajan A (Planlayıcı)', in: `{"yas": ${age}, "hassas_durum": ${isHassas}}`, out: `{"oncelik": "${isHassas ? 'YUKSEK' : 'NORMAL'}"}`, ms: 40, desc: isHassas ? '65 yaş üstü/hassas durum kuralı gereği Yüksek Öncelik verildi.' : 'Standart öncelik belirlendi.' },
          { tool: 'erteleme_taslagi_olustur', agent: 'Ajan A (Planlayıcı)', in: `{"kredi": "${loanType}", "oncelik": "${isHassas ? 'yuksek' : 'normal'}"}`, out: `{"erteleme_ay": ${ertelemeAy}, "ust_sinir": 6}`, ms: 75, desc: 'Kural motoru çalıştırıldı, kod üst sınırı denetlendi.' },
          { tool: 'belge_listesi_getir', agent: 'Ajan A (Planlayıcı)', in: `{"kredi": "${loanType}", "dask": ${daskVal}}`, out: '["kimlik", "hasar_tespit", "tapu"]', ms: 45, desc: 'Gerekli evrak listesi şablona bağlandı.' },
          { tool: 'iletisimci_ajan_yaz', agent: 'Ajan B (İletişimci)', in: '{"ton": "sakin, saygili"}', out: `"Sayın ${fullName}, geçmiş olsun..."`, ms: 1150, desc: 'Saygılı, vaatsiz ve şeffaf bilgilendirme metni hazırlandı.' }
        ]
      };

      // Liman Bankası Çekirdek Veritabanına kaydet
      const db = (typeof LimanDB !== 'undefined') ? LimanDB : window.LimanDB;
      if (db) {
        db.recordNewCustomer(custKey, CUSTOMERS[custKey]);
      }
      refreshDatabaseIframe();

      // FastAPI Canlı Akış Servisine İlet (:8000/api/auth/register)
      if (window.LimanAPI && LimanAPI.isOnline()) {
        LimanAPI.register({
          name: name,
          surname: surname,
          tckn: tckn,
          age: age,
          city: city,
          email: email,
          loan_type: loanType,
          dask_var: daskVal,
          hassas: isHassas
        }).then(res => {
          if (res) console.log('✅ [FastAPI :8000] Yeni Limanlı backend API ve SQLite veritabanına kaydedildi:', res);
        });
      }

      // Müşteri kuyruğuna (Dashboard) ve Ajan dropdownlarına anında ekle
      injectCustomerCard(custKey, CUSTOMERS[custKey]);

      const now = new Date().toTimeString().split(' ')[0];
      eventLogs.unshift({
        time: now,
        topic: 'customer.registered',
        desc: `YENİ MÜŞTERİ: ${fullName} (${city}) Limanlı oldu → Otonom erteleme planı oluşturuldu.`
      });
      renderEvents();

      // İstatistikleri güncelle
      const statEtk = document.getElementById('stat-etkilenen');
      if (statEtk) statEtk.innerText = Object.keys(CUSTOMERS).length;
      const statTas = document.getElementById('stat-taslak');
      if (statTas) statTas.innerText = Object.keys(CUSTOMERS).length;

      alert(`Tebrikler Sayın ${fullName}!\n\nLiman hesabınız başarıyla açıldı.\nBölgenizdeki afet durumu tespit edildi ve adınıza ${ertelemeAy} aylık erteleme taslağı hazırlandı.\n\nMüşteri portalınıza yönlendiriliyorsunuz.`);

      loginAs('customer', custKey);
    }

    // MÜŞTERİ KUYRUĞUNA DİNAMİK KART EKLEME
    function injectCustomerCard(key, c) {
      if (!c) return;
      const queue = document.getElementById('customer-queue-container');
      if (queue && !document.getElementById(`card-${key}`)) {
        const isSenior = (c.age >= 65) || (c.priority && c.priority.includes('Yüksek'));
        const badgePriority = isSenior
          ? `<span class="badge-pill" style="background:var(--status-red-bg);color:var(--status-red);border:1px solid var(--status-red-border)">Yüksek Öncelik</span>`
          : `<span class="badge-pill" style="background:var(--status-blue-bg);color:var(--status-blue);border:1px solid var(--status-blue-border)">Normal Öncelik</span>`;

        const daskText = c.dask && c.dask.includes('Var') ? '✓ Var' : 'Yok/Uygulanmaz';
        const msgSnippet = c.msg ? c.msg.slice(0, 100) + '...' : 'Afet erteleme planı hazırlandı.';

        const cardHtml = `
          <div class="cust-card" id="card-${key}" onclick="pickCustomer('${key}')" style="border-left:4px solid var(--ing-primary)">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
              <span style="font-weight:700;font-size:14px">👤 ${c.name} (${c.age} yaş) <span style="font-size:10px;color:var(--ing-primary);font-weight:700;background:var(--ing-subtle);border:1px solid var(--ing-border);padding:1px 5px;border-radius:3px">YENİ KAYIT</span></span>
              <div style="display:flex;gap:6px">
                <span class="badge-pill" style="background:var(--ing-subtle);color:var(--ing-primary);border:1px solid var(--ing-border)">✨ Yeni Limanlı</span>
                ${badgePriority}
              </div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(4,1fr);font-size:11.5px;color:var(--text-muted);margin-bottom:8px">
              <div>İl: <strong style="color:var(--text-main)">${c.city.replace('(Afet Bölgesi)', '').trim()}</strong></div>
              <div>Kredi: <strong style="color:var(--text-main)">${c.loanType} (${c.installment})</strong></div>
              <div>DASK: <strong style="color:var(--status-green)">${daskText}</strong></div>
              <div>Erteleme: <strong style="color:var(--ing-primary)">${c.months}</strong></div>
            </div>
            <div style="font-size:12px;color:var(--text-muted);background:var(--bg-card);border:1px solid var(--border-subtle);padding:8px 12px;border-radius:4px;font-style:italic">
              "${msgSnippet}"
            </div>
            <div style="margin-top:8px;display:flex;justify-content:space-between;align-items:center;font-size:11px">
              <span style="color:var(--status-amber);font-weight:600" id="badge-${key}">⏳ Taslak Hazırlandı → Müşteri Onayı Bekleniyor</span>
              <span style="color:var(--text-dim)">Ötelenen: ${c.total}</span>
            </div>
          </div>
        `;
        queue.insertAdjacentHTML('afterbegin', cardHtml);
      }

      // Dropdownlara ekle
      const selAgent = document.getElementById('agent-cust-select');
      if (selAgent && !selAgent.querySelector(`option[value="${key}"]`)) {
        const opt = document.createElement('option');
        opt.value = key;
        opt.innerText = `🆕 ${c.name} (${c.age} yaş · ${c.loanType})`;
        selAgent.insertBefore(opt, selAgent.firstChild);
      }

      const quickSel = document.getElementById('quick-cust-switch');
      if (quickSel && !quickSel.querySelector(`option[value="${key}"]`)) {
        const opt = document.createElement('option');
        opt.value = key;
        opt.innerText = `🆕 ${c.name} (${c.loanType})`;
        quickSel.insertBefore(opt, quickSel.firstChild);
      }
    }

    // KAYITLI YENİ MÜŞTERİLERİ YÜKLE
    function loadSavedCustomCustomers() {
      if (window.LimanDB) window.LimanDB.getCustomers();
      Object.keys(CUSTOMERS).forEach(k => {
        if (k.startsWith('user_')) {
          injectCustomerCard(k, CUSTOMERS[k]);
        }
      });
    }

    // GİRİŞ / ROL SEÇİMİ
    function loginAs(role, custKey) {
      currentRole = role;
      document.getElementById('login-view').style.display = 'none';

      if (role === 'customer') {
        selectedCustKey = custKey || 'hatice';
        document.getElementById('active-user-badge').innerText = `👤 ${CUSTOMERS[selectedCustKey].name}`;
        updateCustomerView();
        switchTab('customer');
      } else if (role === 'admin') {
        document.getElementById('active-user-badge').innerText = '⚙️ Sistem Admin';
        switchTab('dashboard');
      } else {
        document.getElementById('active-user-badge').innerText = '🏦 Banka Çalışanı';
        switchTab('dashboard');
      }
    }

    function openLogin() {
      document.getElementById('login-view').style.display = 'flex';
    }

    // SEKME DEĞİŞTİRME
    function switchTab(tab) {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      if (tab === 'dashboard') document.getElementById('tab-dash-btn')?.classList.add('active');
      if (tab === 'customer') document.getElementById('tab-cust-btn')?.classList.add('active');
      if (tab === 'agent') document.getElementById('tab-agent-btn')?.classList.add('active');
      if (tab === 'audit') document.getElementById('tab-audit-btn')?.classList.add('active');
      if (tab === 'database') document.getElementById('tab-database-btn')?.classList.add('active');

      const vDash = document.getElementById('view-dashboard');
      if (vDash) vDash.style.display = tab === 'dashboard' ? 'block' : 'none';
      const vCust = document.getElementById('view-customer');
      if (vCust) vCust.style.display = tab === 'customer' ? 'block' : 'none';
      const vAgent = document.getElementById('view-agent');
      if (vAgent) vAgent.style.display = tab === 'agent' ? 'block' : 'none';
      const vAudit = document.getElementById('view-audit');
      if (vAudit) vAudit.style.display = tab === 'audit' ? 'block' : 'none';
      const vDb = document.getElementById('view-database');
      if (vDb) {
        vDb.style.display = tab === 'database' ? 'block' : 'none';
        if (tab === 'database') {
          refreshDatabaseIframe();
        }
      }
    }

    // GÖMÜLÜ VERİTABANI İFRAME'İNİ CANLI GÜNCELLE
    function refreshDatabaseIframe() {
      try {
        const ifr = document.getElementById('db-iframe');
        if (ifr && ifr.contentWindow) {
          if (ifr.contentWindow.CUSTOMERS && typeof CUSTOMERS !== 'undefined') {
            Object.assign(ifr.contentWindow.CUSTOMERS, CUSTOMERS);
          }
          if (ifr.contentWindow.onRemoteUpdateReceived) {
            ifr.contentWindow.onRemoteUpdateReceived('Canlı Senkronizasyon (Veritabanı Sekmesi)');
          } else if (ifr.contentWindow.selectTable) {
            ifr.contentWindow.selectTable('core.customers');
          }
        }
      } catch (e) {
        console.warn('refreshDatabaseIframe error:', e);
      }
    }
    window.refreshDatabaseIframe = refreshDatabaseIframe;

    // MÜŞTERİ SEÇME
    function pickCustomer(key) {
      if (!CUSTOMERS[key]) return;
      selectedCustKey = key;
      document.querySelectorAll('.cust-card').forEach(c => c.classList.remove('active-cust'));
      const card = document.getElementById(`card-${key}`);
      if (card) card.classList.add('active-cust');
      updateCustomerView();
      loadAgentStepsFor(key);
      const sel = document.getElementById('agent-cust-select');
      if (sel) {
        if (!sel.querySelector(`option[value="${key}"]`)) {
          updateAgentCustomerDropdown();
        }
        sel.value = key;
      }
    }

    function updateCustomerView() {
      const c = CUSTOMERS[selectedCustKey];
      if (!c) return;

      // 1. Normal Bankacılık Arayüzü Alanları
      const bankNameEl = document.getElementById('bank-cust-name');
      if (bankNameEl) bankNameEl.innerText = c.name;
      
      const bankCityEl = document.getElementById('bank-cust-city');
      if (bankCityEl) bankCityEl.innerText = c.city;

      const ribbonLoanType = document.getElementById('ribbon-loan-type');
      if (ribbonLoanType) ribbonLoanType.innerText = c.loanType;

      const ribbonMonths = document.getElementById('ribbon-months');
      if (ribbonMonths) ribbonMonths.innerText = c.months;

      const loanTitleEl = document.getElementById('bank-loan-type-title');
      if (loanTitleEl) loanTitleEl.innerText = c.loanType;

      const loanInstEl = document.getElementById('bank-loan-installment-disp');
      if (loanInstEl) loanInstEl.innerText = c.installment;

      const loanDebtEl = document.getElementById('bank-loan-debt-disp');
      if (loanDebtEl) loanDebtEl.innerText = c.total;

      const loanDefEl = document.getElementById('bank-loan-total-deferred');
      if (loanDefEl) loanDefEl.innerText = `Ötelenen: ${c.total}`;

      const loanMonthsDesc = document.getElementById('bank-loan-months-desc');
      if (loanMonthsDesc) loanMonthsDesc.innerText = `${c.months} faizsiz vade sonu erteleme`;

      const loanDaskEl = document.getElementById('bank-loan-dask');
      if (loanDaskEl) {
        if (c.dask && c.dask.includes('Var')) {
          loanDaskEl.innerHTML = '<span style="color:var(--status-green)">✓ DASK/Sigorta Var</span>';
        } else if (c.dask && (c.dask.includes('Yok') || c.dask.includes('Danışmanlığı'))) {
          loanDaskEl.innerHTML = '<span style="color:var(--status-red)">⚠ Sigorta/DASK Eksik</span>';
        } else {
          loanDaskEl.innerHTML = '<span style="color:var(--text-dim)">Sigorta: ' + c.dask + '</span>';
        }
      }

      // Durum Durumu (Onaylandı / Devredildi / Vazgeçildi / Beklemede)
      const loanBadge = document.getElementById('bank-loan-badge');
      const ribbon = document.getElementById('bank-afet-ribbon');
      const ribbonTag = document.getElementById('ribbon-tag');
      const ribbonMsg = document.getElementById('ribbon-msg');
      const btnRibbon = document.getElementById('btn-ribbon-action');
      const btnStartFlow = document.getElementById('btn-start-flow');
      const ribbonActions = document.getElementById('ribbon-actions-box');
      const loanDecBtns = document.getElementById('bank-loan-decision-btns');

      if (c.approved) {
        if (loanBadge) {
          loanBadge.style.background = 'var(--status-green-bg)';
          loanBadge.style.color = 'var(--status-green)';
          loanBadge.innerText = '✓ Erteleme Talebi Alındı - Personel Kontrolünde';
        }
        if (ribbon) ribbon.style.borderLeftColor = 'var(--status-green)';
        if (ribbonTag) {
          ribbonTag.innerText = '✓ Erteleme Talebiniz Alındı';
          ribbonTag.style.color = 'var(--status-green)';
        }
        if (ribbonMsg) {
          ribbonMsg.innerHTML = `<strong>${c.loanType}</strong> için <strong>${c.months} faizsiz erteleme</strong> talebiniz alındı. Banka personeli nihai kontrolü sonrası SMS ile bilgilendirileceksiniz.`;
        }
        if (btnRibbon) btnRibbon.innerText = '📋 Detayları Görüntüle';
        if (btnStartFlow) btnStartFlow.innerText = '📋 Erteleme Detaylarını İncele';

        if (ribbonActions) {
          ribbonActions.innerHTML = `
            <span style="font-size:12px;color:var(--status-green);font-weight:600;padding:6px 12px;background:rgba(46,158,104,0.15);border-radius:6px;border:1px solid rgba(46,158,104,0.3)">
              ✓ Onay Alındı (Personel İncelemesinde)
            </span>
            <button class="btn-step-nav" style="padding:7px 12px;font-size:11.5px" onclick="openAfetFlowModal(3)">
              Detaylar →
            </button>
            <button class="btn-decision-chat" style="padding:7px 12px;font-size:11.5px" onclick="openChatAgent()">
              💬 Sorum Var
            </button>
          `;
        }
        if (loanDecBtns) {
          loanDecBtns.innerHTML = `
            <span style="font-size:11.5px;color:var(--status-green);font-weight:600;padding:6px 10px;background:rgba(46,158,104,0.12);border-radius:6px;border:1px solid rgba(46,158,104,0.3);flex:1;text-align:center">
              ✓ Onay Talebi Gönderildi
            </span>
            <button class="btn-decision-chat" style="padding:6px 10px;font-size:11px" onclick="openChatAgent()">
              💬 Sorum Var
            </button>
          `;
        }
      } else if (c.escalated) {
        if (loanBadge) {
          loanBadge.style.background = 'rgba(157, 139, 201, 0.12)';
          loanBadge.style.color = '#B3A4DB';
          loanBadge.innerText = '☎ Temsilci Görüşmesi Bekleniyor';
        }
        if (ribbon) ribbon.style.borderLeftColor = '#9D8BC9';
        if (ribbonTag) {
          ribbonTag.innerText = '☎ Öncelikli Çağrı Planlandı';
          ribbonTag.style.color = '#B3A4DB';
        }
        if (ribbonMsg) {
          ribbonMsg.innerHTML = `Afet Masası müşteri temsilcimiz kayıtlı telefonunuzdan sizi arayacaktır.`;
        }
        if (btnRibbon) btnRibbon.innerText = '☎ Talebi İncele';
        if (btnStartFlow) btnStartFlow.innerText = '☎ Görüşme Detayları';

        if (ribbonActions) {
          ribbonActions.innerHTML = `
            <span style="font-size:12px;color:#B3A4DB;font-weight:600;padding:6px 12px;background:rgba(157,139,201,0.12);border-radius:6px;border:1px solid rgba(157,139,201,0.25)">
              ☎ Temsilcimiz Sizi Arayacak
            </span>
            <button class="btn-decision-chat" style="padding:7px 12px;font-size:11.5px" onclick="openChatAgent()">
              💬 Sorum Var
            </button>
          `;
        }
        if (loanDecBtns) {
          loanDecBtns.innerHTML = `
            <span style="font-size:11.5px;color:#B3A4DB;font-weight:600;padding:6px 10px;background:rgba(157,139,201,0.12);border-radius:6px;border:1px solid rgba(157,139,201,0.25);flex:1;text-align:center">
              ☎ Temsilci Arayacak
            </span>
            <button class="btn-decision-chat" style="padding:6px 10px;font-size:11px" onclick="openChatAgent()">
              💬 Sorum Var
            </button>
          `;
        }
      } else if (c.declined) {
        if (loanBadge) {
          loanBadge.style.background = 'rgba(255, 255, 255, 0.08)';
          loanBadge.style.color = '#94A3B8';
          loanBadge.innerText = 'ℹ Tercih: Normal Ödeme Takvimine Devam';
        }
        if (ribbon) ribbon.style.borderLeftColor = '#64748B';
        if (ribbonTag) {
          ribbonTag.innerText = 'Normal Ödeme Tercihi';
          ribbonTag.style.color = '#94A3B8';
        }
        if (ribbonMsg) {
          ribbonMsg.innerHTML = `Erteleme hakkınızı şimdilik kullanmadınız. Afet Destek Paketi haklarınız afet süresince saklıdır; dilediğiniz an tekrar erteleme alabilirsiniz.`;
        }
        if (btnRibbon) btnRibbon.innerText = '🛡️ Yeniden Değerlendir';
        if (btnStartFlow) btnStartFlow.innerText = '🛡️ Erteleme Planını Yeniden Aç';

        if (ribbonActions) {
          ribbonActions.innerHTML = `
            <span style="font-size:12px;color:#94A3B8;font-weight:600;padding:6px 12px;background:rgba(255,255,255,0.06);border-radius:6px;border:1px solid var(--border-subtle)">
              ℹ Normal Ödeme Tercihi
            </span>
            <button class="btn-decision-approve" style="padding:7px 14px;font-size:12px" onclick="approvePlan()">
              ✓ Şimdi Onayla
            </button>
            <button class="btn-decision-chat" style="padding:7px 12px;font-size:11.5px" onclick="openChatAgent()">
              💬 Sorum Var
            </button>
          `;
        }
        if (loanDecBtns) {
          loanDecBtns.innerHTML = `
            <button class="btn-decision-approve" style="padding:6px 10px;font-size:11.5px;flex:1" onclick="approvePlan()">
              ✓ Erteleme Al
            </button>
            <button class="btn-decision-chat" style="padding:6px 10px;font-size:11px" onclick="openChatAgent()">
              💬 Sorum Var
            </button>
          `;
        }
      } else {
        if (loanBadge) {
          loanBadge.style.background = 'var(--status-amber-bg)';
          loanBadge.style.color = 'var(--status-amber)';
          loanBadge.innerText = '⏳ Afet Erteleme Taslağınız Hazırlandı';
        }
        if (ribbon) ribbon.style.borderLeftColor = 'var(--ing-primary)';
        if (ribbonTag) {
          ribbonTag.innerText = 'Liman Afet Destek Paketi · Otomatik Durum Tespiti';
          ribbonTag.style.color = 'var(--ing-primary)';
        }
        if (ribbonMsg) {
          ribbonMsg.innerHTML = `Bölgenizde yaşanan afet sebebiyle <strong id="ribbon-loan-type">${c.loanType}</strong> için <strong><span id="ribbon-months">${c.months}</span> faizsiz erteleme taslağınız</strong> hazırlandı.`;
        }
        if (btnRibbon) btnRibbon.innerText = '🛡️ Erteleme Akışını Başlat →';
        if (btnStartFlow) btnStartFlow.innerText = '🛡️ Erteleme Akışını İncele & Onayla →';

        if (ribbonActions) {
          ribbonActions.innerHTML = `
            <button class="btn-decision-approve" style="padding:8px 14px;font-size:12px" onclick="approvePlan()">
              ✓ Onayla
            </button>
            <button class="btn-decision-escalate" style="padding:8px 12px;font-size:12px" onclick="openEscalate()">
              ☎ Temsilci Arasın
            </button>
            <button class="btn-decision-chat" style="padding:8px 12px;font-size:12px" onclick="openChatAgent()">
              💬 Sorum Var
            </button>
            <button class="btn-step-nav" style="padding:8px 10px;font-size:11.5px" onclick="openAfetFlowModal(1)" title="Detaylı Akış Sihirbazı">
              Plan Detayları →
            </button>
          `;
        }
        if (loanDecBtns) {
          loanDecBtns.innerHTML = `
            <button class="btn-decision-approve" style="padding:8px 8px;font-size:12px" onclick="approvePlan()">
              ✓ Onayla
            </button>
            <button class="btn-decision-escalate" style="padding:8px 8px;font-size:11.5px" onclick="openEscalate()">
              ☎ Temsilci
            </button>
            <button class="btn-decision-chat" style="padding:8px 8px;font-size:11.5px" onclick="openChatAgent()">
              💬 Sorum Var
            </button>
          `;
        }
      }

      // Hızlı geçiş dropdown senkronizasyonu
      const quickSel = document.getElementById('quick-cust-switch');
      if (quickSel) quickSel.value = selectedCustKey;

      // 2. Gömülü Akış Modal Alanları
      const pName = document.getElementById('p-name');
      if (pName) pName.innerText = c.name;

      const pMsg = document.getElementById('p-msg');
      if (pMsg) pMsg.innerText = `"${c.msg}"`;

      const pSure = document.getElementById('p-sure');
      if (pSure) pSure.innerText = c.months;

      const pTaksit = document.getElementById('p-taksit');
      if (pTaksit) pTaksit.innerText = c.installment;

      const pToplam = document.getElementById('p-toplam');
      if (pToplam) pToplam.innerText = c.total;

      const pKredi = document.getElementById('p-kredi-tur');
      if (pKredi) pKredi.innerText = c.loanType;

      const pBelgeler = document.getElementById('p-belgeler');
      if (pBelgeler) pBelgeler.innerHTML = c.docs.map(d => `<li>${d}</li>`).join('');

      const pPriority = document.getElementById('cust-priority-tag');
      if (pPriority) pPriority.innerText = c.priority;
    }

    // AFET MODU AKIŞ MODALI (AÇ / KAPAT & STEPPER GEÇİŞİ)
    let currentFlowStep = 1;

    function openAfetFlowModal(step = 1) {
      const m = document.getElementById('afet-flow-modal');
      if (m) {
        m.style.display = 'flex';
        m.classList.add('active');
        goToFlowStep(step || 1);
      }
    }

    function closeAfetFlowModal() {
      const m = document.getElementById('afet-flow-modal');
      if (m) {
        m.style.display = 'none';
        m.classList.remove('active');
      }
    }

    function goToFlowStep(n) {
      currentFlowStep = n;
      for (let i = 1; i <= 3; i++) {
        const content = document.getElementById(`flow-step-content-${i}`);
        if (content) content.style.display = (i === n) ? 'block' : 'none';

        const pill = document.getElementById(`flow-step-${i}`);
        if (pill) {
          pill.classList.remove('active', 'completed');
          if (i === n) {
            pill.classList.add('active');
          } else if (i < n) {
            pill.classList.add('completed');
          }
        }
      }

      // Adım 1 alanlarını seçili müşteriye göre dinamik güncelle
      const c = CUSTOMERS[selectedCustKey];
      if (c) {
        const cityEl = document.getElementById('flow-step1-city');
        if (cityEl) cityEl.innerText = c.city;
        const addrEl = document.getElementById('flow-step1-address');
        if (addrEl) addrEl.innerText = `${c.name} (${c.city})`;
        const refEl = document.getElementById('flow-step1-ref');
        if (refEl) refEl.innerText = c.city.includes('Rize') ? 'MGM-2026-RIZE-KIRMIZI' : 'AFAD-2026-TR-8812';
        const evEl = document.getElementById('flow-step1-event');
        if (evEl) evEl.innerText = c.city.includes('Rize') ? 'Rize Sel, Taşkın ve Heyelan Felaketi' : 'M7.4 Deprem Bildirimi (Doğu Anadolu Fayı)';
      }
    }

    // ══════════════════════════════════════════════════════════════
    // SOHBET KATMANI MOTORU (AJAN C - KİŞİSELLEŞTİRİLMİŞ AFET ASİSTANI)
    // ══════════════════════════════════════════════════════════════
    const chatHistories = {};

    function openChatAgent() {
      const c = CUSTOMERS[selectedCustKey];
      if (!c) return;

      const modal = document.getElementById('afet-chat-modal');
      if (modal) {
        modal.style.display = 'flex';
      }

      // Başlık ve Bağlam Bilgilerini Doldur (Model müşteriyi zaten tanır)
      const subHdr = document.getElementById('chat-hdr-sub');
      if (subHdr) {
        subHdr.innerText = `Bağlam Yüklendi: ${c.name} · ${c.loanType} · ${c.months} Faizsiz (${c.installment}/ay)`;
      }

      const ctxText = document.getElementById('chat-context-text');
      if (ctxText) {
        ctxText.innerHTML = `<strong>${c.name}</strong> verileri yüklendi: ${c.loanType} · ${c.installment} taksit · ${c.dask} · <em>Kendinizi tanıtmanıza gerek yoktur.</em>`;
      }

      // Müşteri için geçmiş yoksa Ajan C açılış mesajını hazırla
      if (!chatHistories[selectedCustKey] || chatHistories[selectedCustKey].length === 0) {
        const now = new Date().toTimeString().split(' ')[0].slice(0, 5);
        chatHistories[selectedCustKey] = [
          {
            sender: 'agent',
            time: now,
            text: `Merhaba Sayın <strong>${c.name}</strong>, geçmiş olsun. ${c.city} bölgesindeki afet sebebiyle adınıza hazırlanan <strong>${c.loanType}</strong> için <strong>${c.months} faizsiz erteleme planınız</strong> (aylık ${c.installment} taksit, toplam ötelenen ${c.total}) ve DASK/hasar durumunuz önümde açık.<br><br>Sizi tekrar soruya boğmadan yardımcı olmak için buradayım. Erteleme şartları, faiz durumu, gerekli evraklar veya ödeme takviminiz hakkında aklınıza takılan her şeyi sorabilirsiniz.`
          }
        ];

        // Ajan adımını ve EventBus olayını kaydet
        const timeFull = new Date().toTimeString().split(' ')[0];
        eventLogs.unshift({
          time: timeFull,
          topic: 'chat.context.loaded',
          desc: `Ajan C (Sohbet Katmanı): ${c.name} için kişiselleştirilmiş plan ve DASK bağlamı hafızaya yüklendi.`
        });
        renderEvents();

        // Eğer müşterinin adımlarında sohbet_baglam_yukle yoksa ekle
        if (!c.steps.some(s => s.tool === 'sohbet_baglam_yukle')) {
          c.steps.push({
            tool: 'sohbet_baglam_yukle',
            agent: 'Ajan C (Sohbet Ajanı)',
            in: `{"customer_id": "${c.id}", "kredi": "${c.loanType}", "erteleme": "${c.months}"}`,
            out: `{"status": "CONTEXT_READY", "musteri": "${c.name}", "dask": "${c.dask}"}`,
            ms: 32,
            desc: `${c.name} müşterisinin plan ve sigorta parametreleri sıfır sorguyla LLM sohbet bağlamına yüklendi.`
          });
        }
      }

      renderChatMessages();
    }

    function closeChatAgent() {
      const modal = document.getElementById('afet-chat-modal');
      if (modal) modal.style.display = 'none';
    }

    function renderChatMessages() {
      const container = document.getElementById('chat-messages-container');
      if (!container) return;

      const history = chatHistories[selectedCustKey] || [];

      container.innerHTML = history.map(msg => {
        if (msg.sender === 'user') {
          return `
            <div class="chat-bubble user">
              <div>${escapeHtml(msg.text)}</div>
              <div class="chat-time">${msg.time} · Siz</div>
            </div>
          `;
        } else {
          return `
            <div class="chat-bubble agent">
              <div style="font-size:11px;font-weight:700;color:var(--ing-primary);margin-bottom:4px;display:flex;align-items:center;gap:6px">
                <span>🤖 Liman Destek Asistanı (Ajan C)</span>
              </div>
              <div style="line-height:1.55;font-size:13px">${msg.text}</div>
              <div class="chat-time">${msg.time} · Otonom Doğrulandı</div>
            </div>
          `;
        }
      }).join('');

      container.scrollTop = container.scrollHeight;
    }

    function handleChatSubmit(e) {
      if (e) e.preventDefault();
      const input = document.getElementById('chat-user-input');
      if (!input) return;
      const text = input.value.trim();
      if (!text) return;
      input.value = '';
      sendChatMessage(text);
    }

    function askQuickQuestion(questionText) {
      sendChatMessage(questionText);
    }

    function sendChatMessage(text) {
      const c = CUSTOMERS[selectedCustKey];
      if (!c) return;

      if (!chatHistories[selectedCustKey]) {
        chatHistories[selectedCustKey] = [];
      }

      const now = new Date().toTimeString().split(' ')[0].slice(0, 5);
      chatHistories[selectedCustKey].push({
        sender: 'user',
        time: now,
        text: text
      });

      renderChatMessages();

      // Yazıyor göstergesi ekle
      const container = document.getElementById('chat-messages-container');
      const typingIndicator = document.createElement('div');
      typingIndicator.id = 'chat-typing-indicator';
      typingIndicator.className = 'chat-bubble agent';
      typingIndicator.innerHTML = `
        <div style="font-size:11px;color:var(--text-muted);display:flex;align-items:center;gap:6px">
          <span>🤖 Ajan C yanıtlıyor</span>
          <span style="letter-spacing:2px">...</span>
        </div>
      `;
      container.appendChild(typingIndicator);
      container.scrollTop = container.scrollHeight;

      setTimeout(() => {
        const ind = document.getElementById('chat-typing-indicator');
        if (ind) ind.remove();

        const reply = generateAgentChatReply(text, c);
        const replyTime = new Date().toTimeString().split(' ')[0].slice(0, 5);
        chatHistories[selectedCustKey].push({
          sender: 'agent',
          time: replyTime,
          text: reply
        });

        // EventBus ve Ajan Step izi
        const fullTime = new Date().toTimeString().split(' ')[0];
        eventLogs.unshift({
          time: fullTime,
          topic: 'chat.agent.replied',
          desc: `Ajan C (Sohbet): "${text.slice(0, 28)}..." sorusunu kural guardrail'leri ile yanıtladı.`
        });
        renderEvents();

        c.steps.push({
          tool: 'soru_cevapla',
          agent: 'Ajan C (Sohbet Ajanı)',
          in: `{"soru": "${text.replace(/"/g, '')}", "baglam": "${c.loanType} - ${c.months}"}`,
          out: `{"yanit_durumu": "VALIDATED", "guardrail": "FAIZSIZ_VE_SEFFAF"}`,
          ms: 45,
          desc: `Müşteri sorusu kurum afet ilkeleri ve mevzuat sınırlarıyla yanıtlandı.`
        });

        renderChatMessages();
      }, 400);
    }

    function generateAgentChatReply(query, c) {
      const q = query.toLowerCase();

      if (q.includes('faiz') || q.includes('masraf') || q.includes('ceza') || q.includes('maliyet') || q.includes('ekstra')) {
        return `Kesinlikle <strong>hiçbir faiz, ek masraf, gecikme cezası veya komisyon yansıtılmaz</strong>.<br><br>Yasal afet mevzuatı ve bankamızın afet politikası gereğince <strong>${c.months}</strong> boyunca toplam <strong>${c.total}</strong> tutarındaki taksitleriniz <strong>%0 faizle</strong> doğrudan vade sonuna ötelenir. Anaparanızda da hiçbir artış olmaz.`;
      }

      if (q.includes('dask') || q.includes('sigorta') || q.includes('poliçe') || q.includes('hasar')) {
        if (c.loanType === 'Konut Kredisi' || c.loanType.includes('Konut')) {
          if (c.dask && c.dask.includes('Var')) {
            return `Konut kredinize bağlı <strong>DASK poliçeniz sistemimizde kayıtlı ve onaylıdır</strong>. Erteleme talebinizin yürürlüğe girmesi için ek bir sigorta işlemi yapmanıza gerek yoktur. Afet Masamız DASK tazminat süreçlerini de doğrudan koordine etmektedir.`;
          } else {
            return `Konutunuz için aktif bir DASK poliçesi sistemimizde otomatik doğrulanamamıştır. Ancak bu durum erteleme başvurunuzu engellemez. Dilerseniz aşağıdaki <strong>[☎ Temsilci Arasın]</strong> butonuna tıklayabilirsiniz; uzmanımız sigorta ve haklarınız konusunda sizi telefonla ücretsiz bilgilendirecektir.`;
          }
        } else {
          return `Kullandığınız <strong>${c.loanType}</strong> için DASK sigortası şartı aranmamaktadır. Sadece afet bölgesi eşleşmeniz yeterlidir.`;
        }
      }

      if (q.includes('evrak') || q.includes('belge') || q.includes('zaman') || q.includes('teslim') || q.includes('son gün')) {
        return `Afet şartlarında mağduriyet yaşamamanız için evrak teslim süreniz <strong>60 gün</strong> olarak tanımlanmıştır.<br><br>Gerekli evraklar: <em>${c.docs.map(d => d.replace(/<[^>]*>?/gm, '')).join(', ')}</em>.<br>Evrakları hemen bugün teslim etmek zorunda değilsiniz. Şimdi planı onayladığınızda ertelemeniz derhal başlar; evraklarınızı 60 gün içinde Liman Mobil'den veya şubelerimizden yükleyebilirsiniz.`;
      }

      if (q.includes('kredi not') || q.includes('sicil') || q.includes('puan') || q.includes('kkb') || q.includes('findeks') || q.includes('yasal takip')) {
        return `Bu erteleme işlemi kredi notunuzu (Findeks/KKB puanı) <strong>asla olumsuz etkilemez</strong>. BDDK ve KKB sistemlerine "Afet Sebebiyle Yapılandırma/Erteleme" koduyla bildirilir; hiçbir gecikme, ihtar veya yasal takip kaydı düşmez.`;
      }

      if (q.includes('uzat') || q.includes('6 ay') || q.includes('sure') || q.includes('daha fazla')) {
        return `Hazırlanan taslağınız <strong>${c.months}</strong> olarak tanımlanmıştır. Sistemimizin kod üst sınırı azami 6 aydır. Süreç bittiğinde bölgedeki durumun devam etmesi halinde <strong>[☎ Temsilci Arasın]</strong> talebinde bulunarak süreyi 6 aya kadar uzatma opsiyonunu değerlendirebilirsiniz.`;
      }

      if (q.includes('istemiyorum') || q.includes('vazgeç') || q.includes('normal') || q.includes('ödemek')) {
        return `Erteleme tamamen sizin takdirinizdedir, hiçbir zorunluluk yoktur. Eğer normal ödeme takviminize devam etmek isterseniz hemen aşağıdaki <strong>[✕ Vazgeç (Normal Öde)]</strong> butonuna basabilirsiniz. Afet destek haklarınız afet süresince saklı kalır; dilediğiniz zaman tekrar erteleme talep edebilirsiniz.`;
      }

      if (q.includes('temsilci') || q.includes('ara') || q.includes('telefon') || q.includes('insan')) {
        return `Konuyu uzman bir bankacıyla detaylandırmak isterseniz aşağıdaki <strong>[☎ Temsilci Arasın]</strong> butonuna tıklayabilirsiniz. Afet Masası temsilcimiz kayıtlı telefonunuzdan sizi en kısa sürede arayacaktır.`;
      }

      // Genel / Varsayılan Bağlamsal Yanıt
      return `Sayın <strong>${c.name}</strong>, ${c.loanType} borcunuz (aylık ${c.installment}, ötelenen toplam ${c.total}) afet koruma paketimiz kapsamındadır.<br><br><strong>Karar tamamen sizdedir:</strong><br>• Dilerseniz <strong>[✓ Planı Onayla]</strong> ile faizsiz ertelemeyi hemen başlatabilirsiniz,<br>• <strong>[☎ Temsilci Arasın]</strong> ile özel durumunuzu uzmanımızla görüşebilirsiniz,<br>• Ya da <strong>[✕ Vazgeç (Normal Öde)]</strong> seçerek mevcut takviminizde kalabilirsiniz.`;
    }

    // SOHBETTEN KARARA BAĞLAMA FONKSİYONLARI (3 SEÇENEK)
    function approvePlanFromChat() {
      closeChatAgent();
      approvePlan();
    }

    function openEscalateFromChat() {
      closeChatAgent();
      openEscalate();
    }

    function optOutPlanFromChat() {
      closeChatAgent();
      optOutPlan();
    }

    // MÜŞTERİ ERTELEMEYİ REDDEDİP NORMAL ÖDEMEYİ SEÇERSE
    function optOutPlan() {
      const c = CUSTOMERS[selectedCustKey];
      if (!c) return;

      c.declined = true;
      c.approved = false;
      c.escalated = false;

      // Liman Bankası Çekirdek Veritabanına kaydet
      const db = (typeof LimanDB !== 'undefined') ? LimanDB : window.LimanDB;
      if (db) {
        db.recordOptOut(selectedCustKey, 'Liman Mobil (Normal Ödeme)');
      }
      refreshDatabaseIframe();

      const now = new Date().toTimeString().split(' ')[0];
      eventLogs.unshift({
        time: now,
        topic: 'plan.declined',
        desc: `${c.name} (${c.id}) erteleme almamayı ve normal ödeme takvimine devam etmeyi tercih etti.`
      });
      renderEvents();

      const auditBox = document.getElementById('audit-log-box');
      if (auditBox) {
        auditBox.innerHTML = `<div>[${now}] <strong style="color:#94A3B8">plan.declined</strong> → ${c.name} normal takvimi seçti (hakları saklı)</div>` + auditBox.innerHTML;
      }

      closeAfetFlowModal();
      updateCustomerView();

      const badgeEl = document.getElementById(`badge-${selectedCustKey}`);
      if (badgeEl) badgeEl.innerText = 'ℹ Normal Ödeme Tercihi';

      c.steps.push({
        tool: 'karar_bagla',
        agent: 'Ajan C (Sohbet Ajanı)',
        in: `{"musteri_secimi": "VAZGEC_NORMAL_ODE"}`,
        out: `{"status": "NORMAL_TAKVIM", "hak_sakli": true}`,
        ms: 28,
        desc: 'Müşteri tercihi sisteme işlendi, hakları afet boyunca saklı tutuldu.'
      });

      alert(`Sayın ${c.name},\n\nTercihiniz kaydedildi. Normal ödeme takviminiz geçerliliğini korumaktadır.\n\nAfet destek paketi haklarınız afet süresince saklıdır; dilediğiniz zaman Liman Mobil veya şubenizden erteleme talebinde bulunabilirsiniz.`);
    }

    // AFET SİMÜLATÖRÜ BARINI AÇ / KAPAT
    function toggleSimBar() {
      const b = document.getElementById('disaster-ctrl-bar');
      if (b) {
        b.style.display = (b.style.display === 'none' || b.style.display === '') ? 'flex' : 'none';
      }
    }

    // DÜŞEN BİLDİRİMİ KAPAT
    function dismissDropBanner() {
      const b = document.getElementById('disaster-drop-banner');
      if (b) b.style.display = 'none';
    }

    // AGENT MÜŞTERİ DROPDOWNINI GÜNCELLE
    function updateAgentCustomerDropdown() {
      const sel = document.getElementById('agent-cust-select');
      if (!sel || sel.querySelector('option[value="dursun"]')) return;
      const optGroup = document.createElement('optgroup');
      optGroup.label = '🌊 Rize Sel & Heyelan Müşterileri (+5)';
      optGroup.innerHTML = `
        <option value="dursun">🌊 Dursun Ali Reis (69 yaş · Rize/Çayeli · Konut/Tarım · 4 Ay)</option>
        <option value="fadime">🌊 Fadime Kaya (71 yaş · Rize/Ardeşen · Konut · 4 Ay)</option>
        <option value="temel">🌊 Temel Karadeniz (42 yaş · Rize/Merkez · İhtiyaç · 3 Ay)</option>
        <option value="asiye">🌊 Asiye Yıldız (38 yaş · Rize/Fındıklı · Esnaf · 3 Ay)</option>
        <option value="idris">🌊 İdris Çepni (66 yaş · Rize/Güneysu · Temsilci Devri · 4 Ay)</option>
      `;
      sel.appendChild(optGroup);
    }

    // 5 YENİ RİZE MÜŞTERİ KARTINI KUYRUĞA ENJEKTE ET
    let rizeCardsInjected = false;
    function injectRizeCustomerCards() {
      if (rizeCardsInjected) return;
      rizeCardsInjected = true;

      const queue = document.getElementById('customer-queue-container');
      if (!queue) return;

      const rizeCardsHtml = `
        <!-- 🌊 RİZE MÜŞTERİ 1: DURSUN ALİ REİS -->
        <div class="cust-card" id="card-dursun" onclick="pickCustomer('dursun')" style="border-left:4px solid var(--status-blue)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <span style="font-weight:700;font-size:14px">👴 Dursun Ali Reis (69 yaş)</span>
            <div style="display:flex;gap:6px">
              <span class="badge-pill" style="background:var(--status-blue-bg);color:var(--status-blue);border:1px solid var(--status-blue-border)">🌊 Rize Sel Afeti</span>
              <span class="badge-pill" style="background:var(--status-red-bg);color:var(--status-red);border:1px solid var(--status-red-border)">Yüksek Öncelik</span>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);font-size:11.5px;color:var(--text-muted);margin-bottom:8px">
            <div>İlçe: <strong style="color:var(--text-main)">Rize / Çayeli</strong></div>
            <div>Kredi: <strong style="color:var(--text-main)">Tarım & Konut (16.200 ₺)</strong></div>
            <div>DASK: <strong style="color:var(--status-green)">✓ Var</strong></div>
            <div>Erteleme: <strong style="color:var(--ing-primary)">4 Ay (3+1)</strong></div>
          </div>
          <div style="font-size:12px;color:var(--text-muted);background:var(--bg-card);border:1px solid var(--border-subtle);padding:8px 12px;border-radius:4px;font-style:italic">
            "Sayın Dursun Ali Bey, geçmiş olsun. Rize Çayeli ilçemizdeki sel felaketi sebebiyle çay tarımı ve konut krediniz için 4 aylık erteleme talebiniz hazırlandı..."
          </div>
          <div style="margin-top:8px;display:flex;justify-content:space-between;align-items:center;font-size:11px">
            <span style="color:var(--status-amber);font-weight:600" id="badge-dursun">⏳ Taslak Hazırlandı → Müşteri Onayı Bekleniyor</span>
            <span style="color:var(--text-dim)">Ötelenen: 64.800 ₺</span>
          </div>
        </div>

        <!-- 🌊 RİZE MÜŞTERİ 2: FADİME KAYA -->
        <div class="cust-card" id="card-fadime" onclick="pickCustomer('fadime')" style="border-left:4px solid var(--status-blue)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <span style="font-weight:700;font-size:14px">👵 Fadime Kaya (71 yaş)</span>
            <div style="display:flex;gap:6px">
              <span class="badge-pill" style="background:var(--status-blue-bg);color:var(--status-blue);border:1px solid var(--status-blue-border)">🌊 Rize Sel Afeti</span>
              <span class="badge-pill" style="background:var(--status-red-bg);color:var(--status-red);border:1px solid var(--status-red-border)">Yüksek Öncelik</span>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);font-size:11.5px;color:var(--text-muted);margin-bottom:8px">
            <div>İlçe: <strong style="color:var(--text-main)">Rize / Ardeşen</strong></div>
            <div>Kredi: <strong style="color:var(--text-main)">Konut (12.400 ₺)</strong></div>
            <div>DASK: <strong style="color:var(--status-green)">✓ Var</strong></div>
            <div>Erteleme: <strong style="color:var(--ing-primary)">4 Ay (3+1)</strong></div>
          </div>
          <div style="font-size:12px;color:var(--text-muted);background:var(--bg-card);border:1px solid var(--border-subtle);padding:8px 12px;border-radius:4px;font-style:italic">
            "Sayın Fadime Hanım, geçmiş olsun. Rize Ardeşen taşkın hattı kapsamında konut krediniz için 4 aylık erteleme planı oluşturuldu..."
          </div>
          <div style="margin-top:8px;display:flex;justify-content:space-between;align-items:center;font-size:11px">
            <span style="color:var(--status-amber);font-weight:600" id="badge-fadime">⏳ Taslak Hazırlandı → Müşteri Onayı Bekleniyor</span>
            <span style="color:var(--text-dim)">Ötelenen: 49.600 ₺</span>
          </div>
        </div>

        <!-- 🌊 RİZE MÜŞTERİ 3: TEMEL KARADENİZ -->
        <div class="cust-card" id="card-temel" onclick="pickCustomer('temel')" style="border-left:4px solid var(--status-blue)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <span style="font-weight:700;font-size:14px">👨 Temel Karadeniz (42 yaş)</span>
            <div style="display:flex;gap:6px">
              <span class="badge-pill" style="background:var(--status-blue-bg);color:var(--status-blue);border:1px solid var(--status-blue-border)">🌊 Rize Sel Afeti</span>
              <span class="badge-pill" style="background:var(--status-blue-bg);color:var(--status-blue);border:1px solid var(--status-blue-border)">Normal Öncelik</span>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);font-size:11.5px;color:var(--text-muted);margin-bottom:8px">
            <div>İlçe: <strong style="color:var(--text-main)">Rize / Merkez</strong></div>
            <div>Kredi: <strong style="color:var(--text-main)">İhtiyaç (5.800 ₺)</strong></div>
            <div>DASK: <strong style="color:var(--text-dim)">Uygulanmaz</strong></div>
            <div>Erteleme: <strong style="color:var(--ing-primary)">3 Ay</strong></div>
          </div>
          <div style="font-size:12px;color:var(--text-muted);background:var(--bg-card);border:1px solid var(--border-subtle);padding:8px 12px;border-radius:4px;font-style:italic">
            "Sayın Temel Bey, geçmiş olsun. Rize merkezdeki su baskınları kapsamında ihtiyaç krediniz için 3 aylık erteleme hazırlandı..."
          </div>
          <div style="margin-top:8px;display:flex;justify-content:space-between;align-items:center;font-size:11px">
            <span style="color:var(--status-amber);font-weight:600" id="badge-temel">⏳ Taslak Hazırlandı → Müşteri Onayı Bekleniyor</span>
            <span style="color:var(--text-dim)">Ötelenen: 17.400 ₺</span>
          </div>
        </div>

        <!-- 🌊 RİZE MÜŞTERİ 4: ASİYE YILDIZ -->
        <div class="cust-card" id="card-asiye" onclick="pickCustomer('asiye')" style="border-left:4px solid var(--status-blue)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <span style="font-weight:700;font-size:14px">👩 Asiye Yıldız (38 yaş)</span>
            <div style="display:flex;gap:6px">
              <span class="badge-pill" style="background:var(--status-blue-bg);color:var(--status-blue);border:1px solid var(--status-blue-border)">🌊 Rize Sel Afeti</span>
              <span class="badge-pill" style="background:var(--status-blue-bg);color:var(--status-blue);border:1px solid var(--status-blue-border)">Normal Öncelik</span>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);font-size:11.5px;color:var(--text-muted);margin-bottom:8px">
            <div>İlçe: <strong style="color:var(--text-main)">Rize / Fındıklı</strong></div>
            <div>Kredi: <strong style="color:var(--text-main)">Esnaf (8.500 ₺)</strong></div>
            <div>DASK: <strong style="color:var(--text-dim)">Uygulanmaz</strong></div>
            <div>Erteleme: <strong style="color:var(--ing-primary)">3 Ay</strong></div>
          </div>
          <div style="font-size:12px;color:var(--text-muted);background:var(--bg-card);border:1px solid var(--border-subtle);padding:8px 12px;border-radius:4px;font-style:italic">
            "Sayın Asiye Hanım, geçmiş olsun. Rize Fındıklı heyelan afeti dolayısıyla esnaf krediniz için 3 aylık erteleme hazırlandı..."
          </div>
          <div style="margin-top:8px;display:flex;justify-content:space-between;align-items:center;font-size:11px">
            <span style="color:var(--status-amber);font-weight:600" id="badge-asiye">⏳ Taslak Hazırlandı → Müşteri Onayı Bekleniyor</span>
            <span style="color:var(--text-dim)">Ötelenen: 25.500 ₺</span>
          </div>
        </div>

        <!-- 🌊 RİZE MÜŞTERİ 5: İDRİS ÇEPNİ -->
        <div class="cust-card" id="card-idris" onclick="pickCustomer('idris')" style="border-left:4px solid var(--status-red)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <span style="font-weight:700;font-size:14px">👴 İdris Çepni (66 yaş)</span>
            <div style="display:flex;gap:6px">
              <span class="badge-pill" style="background:var(--status-blue-bg);color:var(--status-blue);border:1px solid var(--status-blue-border)">🌊 Rize Sel Afeti</span>
              <span class="badge-pill" style="background:var(--status-red-bg);color:var(--status-red);border:1px solid var(--status-red-border)">Yüksek Öncelik</span>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);font-size:11.5px;color:var(--text-muted);margin-bottom:8px">
            <div>İlçe: <strong style="color:var(--text-main)">Rize / Güneysu</strong></div>
            <div>Kredi: <strong style="color:var(--text-main)">Konut (10.500 ₺)</strong></div>
            <div>DASK/Sel: <strong style="color:var(--status-red)">⚠ Sigorta Yok</strong></div>
            <div>Erteleme: <strong style="color:var(--ing-primary)">4 Ay</strong></div>
          </div>
          <div style="font-size:12px;color:var(--text-muted);background:var(--bg-card);border:1px solid var(--border-subtle);padding:8px 12px;border-radius:4px;font-style:italic">
            "Sayın İdris Bey, geçmiş olsun. Güneysu sel felaketi sebebiyle 4 aylık erteleme taslağınız hazırlandı. Konutunuzun sigortasına ulaşılamadığından temsilcimiz sizi arayacaktır..."
          </div>
          <div style="margin-top:8px;display:flex;justify-content:space-between;align-items:center;font-size:11px">
            <span style="color:var(--status-amber);font-weight:600" id="badge-idris">☎ Temsilciye Devredildi (Hasar & Sigorta Danışmanlığı)</span>
            <span style="color:var(--text-dim)">Ötelenen: 42.000 ₺</span>
          </div>
        </div>
      `;

      queue.innerHTML = rizeCardsHtml + queue.innerHTML;
    }

    // 🌊 RİZE SEL VE HEYELAN AFETİNİ TETİKLE (+5 MÜŞTERİ DOĞRUDAN DÜŞSÜN)
    function triggerRizeFloodSimulation() {
      const btnFlood = document.getElementById('btn-trigger-flood');
      if (btnFlood) {
        btnFlood.disabled = true;
        btnFlood.innerHTML = '<span>⏳</span> Sel Verisi Alınıyor...';
      }

      // 1. Üst Afet Bildirim Bannerı Düşsün (Slide down animasyonu)
      const dropBanner = document.getElementById('disaster-drop-banner');
      if (dropBanner) {
        dropBanner.style.display = 'block';
        dropBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }

      // 2. Afet Kontrol Barı Doğrudan Güncellensin
      const disasterTag = document.getElementById('current-disaster-tag');
      disasterTag.innerText = '🌊 AKTİF AFET · SEL & HEYELAN';
      disasterTag.style.background = 'rgba(77, 123, 176, 0.2)';
      disasterTag.style.color = '#7EA5D9';
      disasterTag.style.borderColor = 'rgba(126, 165, 217, 0.35)';

      document.getElementById('current-disaster-title').innerText = 'Rize Sel, Taşkın ve Heyelan Felaketi (Meteoroloji Kırmızı Kod)';
      document.getElementById('current-disaster-desc').innerHTML = 'Etkilenen İller/İlçeler: <strong>Rize (Çayeli · Ardeşen · Fındıklı · Güneysu · İkizdere)</strong> · Kaynak: <strong>Meteoroloji Genel Müd. / AFAD</strong>';

      // 3. Canlı Pipeline Göstergesi
      const pBox = document.getElementById('pipeline-box');
      const pBar = document.getElementById('progress-bar');
      const pText = document.getElementById('pipeline-status-text');
      const pPct = document.getElementById('pipeline-percent-text');
      const pSub = document.getElementById('pipeline-sub-text');
      pBox.style.display = 'block';
      pBar.style.width = '30%';
      pText.innerText = 'Rize Meteorolojik Kırmızı Kod Akışı Alındı...';
      pPct.innerText = '30%';
      pSub.innerText = 'Çayeli, Ardeşen, Fındıklı taşkın koordinatları taranıyor...';

      // 4. Doğrudan Müşteri Sayısını Artır (+5 Kişi: 258 -> 263)
      document.getElementById('stat-etkilenen').innerText = '263';
      document.getElementById('stat-oncelik').innerText = '79'; // +3 yaşlı/hassas Rize müşterisi
      document.getElementById('stat-taslak').innerText = '263';
      document.getElementById('stat-hacim').innerText = '₺8.71M'; // +₺173.800
      
      const now = new Date().toTimeString().split(' ')[0];

      // 5. EventBus Canlı Akışına Olayları Düşür
      eventLogs.unshift({
        time: now,
        topic: 'disaster.declared',
        desc: '🌊 AFAD & MGM KIRMIZI KOD: Rize Sel ve Heyelan Bildirimi sisteme düştü (m²\'ye 180kg yağış).'
      });
      eventLogs.unshift({
        time: now,
        topic: 'customer.affected',
        desc: '📍 Rize taşkın havzasından +5 YENİ MÜŞTERİ doğrudan sisteme işlendi (Toplam 263 müşteri).'
      });
      eventLogs.unshift({
        time: now,
        topic: 'agent.loop.start',
        desc: 'Ajan A (Planlayıcı) cust_rize_001 (Dursun Ali Reis, 69 yaş) için tetiklendi.'
      });
      eventLogs.unshift({
        time: now,
        topic: 'plan.drafted',
        desc: 'cust_rize_001 (Dursun Ali Reis) için 4 ay (3+1) çay tarım & konut kredisi ertelemesi üretildi.'
      });
      eventLogs.unshift({
        time: now,
        topic: 'plan.drafted',
        desc: 'cust_rize_002 (Fadime Kaya) için 4 ay (3+1) Ardeşen konut erteleme taslağı üretildi.'
      });
      eventLogs.unshift({
        time: now,
        topic: 'plan.escalated',
        desc: 'cust_rize_005 (İdris Çepni): Sel poliçesi/DASK eksikliği sebebiyle İnsan Müşteri Temsilcisine aktarıldı.'
      });
      renderEvents();

      // Liman Bankası Çekirdek Veritabanına Rize Sel Afetini ve 5 müşteriyi kaydet
      if (window.LimanDB) {
        LimanDB.recordFloodEvent();
      }
      refreshDatabaseIframe();

      // Denetim İzi (Audit Log)
      const auditBox = document.getElementById('audit-log-box');
      if (auditBox) {
        auditBox.innerHTML = `<div>[${now}] <strong style="color:#7EA5D9">disaster.declared</strong> → Rize Sel Felaketi Kırmızı Kod (+5 Müşteri)</div>` + auditBox.innerHTML;
        auditBox.innerHTML = `<div>[${now}] <strong style="color:var(--status-amber)">plan.drafted</strong> → Rize Dursun Ali Reis (4 ay çay tarım/konut)</div>` + auditBox.innerHTML;
      }

      // 6. 5 Yeni Rize Müşterisini Kuyruğa Ekle
      injectRizeCustomerCards();

      // 7. Ajan Müşteri Seçim Kutusunu Güncelle
      updateAgentCustomerDropdown();

      // Aşama 2: İlerleme
      setTimeout(() => {
        pBar.style.width = '75%';
        pText.innerText = 'Rize Sel Afeti Kural Motoru & Ajan Taslakları Tamamlandı';
        pPct.innerText = '75%';
        pSub.innerText = '+5 Rize müşterisi için erteleme taslakları kod üst sınırlarıyla üretildi.';
      }, 700);

      // Aşama 3: Tamamlandı
      setTimeout(() => {
        pBar.style.width = '100%';
        pText.innerText = '✓ Rize Sel Felaketi Başarıyla Entegre Edildi (+5 Müşteri Kuyrukta)';
        pPct.innerText = '100%';
        pSub.innerText = 'Karar insanda: Müşteri onayı ve çalışan inceleme havuzu hazır.';

        if (btnFlood) {
          btnFlood.disabled = false;
          btnFlood.innerHTML = '<span>✓</span> Rize Sel Afeti Aktif (+5 Müşteri Eklendi)';
        }

        // Otomatik olarak ilk Rize müşterisini seçip gösterelim
        pickCustomer('dursun');
      }, 1300);
    }

    // ─── GÜÇLENDİRİLMİŞ AJAN STÜDYOSU VE TOOL ÇAĞRI MOTORU ───
    let currentAgentStepFilter = 'all';

    function filterAgentSteps(filterType) {
      currentAgentStepFilter = filterType;
      document.querySelectorAll('.agent-filter-btn').forEach(b => b.classList.remove('active'));
      if (filterType === 'all') document.getElementById('filter-btn-all').classList.add('active');
      if (filterType === 'Ajan A (Planlayıcı)') document.getElementById('filter-btn-plan').classList.add('active');
      if (filterType === 'Ajan B (İletişimci)') document.getElementById('filter-btn-comm').classList.add('active');
      if (filterType === 'Ajan C (Sohbet Ajanı)') {
        const btn = document.getElementById('filter-btn-chat');
        if (btn) btn.classList.add('active');
      }
      if (filterType === 'rule') document.getElementById('filter-btn-rule').classList.add('active');
      loadAgentStepsFor(selectedCustKey);
    }

    function toggleToolSchemas() {
      const b = document.getElementById('tool-schemas-box');
      if (b) {
        b.style.display = (b.style.display === 'none' || b.style.display === '') ? 'block' : 'none';
      }
    }

    function copyJsonPayload(btn, str) {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(str);
        const originalText = btn.innerText;
        btn.innerText = '✓ Kopyalandı!';
        btn.style.background = 'var(--status-green)';
        setTimeout(() => {
          btn.innerText = originalText;
          btn.style.background = 'rgba(255, 255, 255, 0.08)';
        }, 1500);
      }
    }

    function copyAllTraces(key) {
      const c = CUSTOMERS[key || selectedCustKey];
      if (!c) return;
      const fullPayload = JSON.stringify({
        customer_id: c.id,
        customer_name: c.name,
        disaster_region: c.city,
        loan_type: c.loanType,
        total_deferred: c.total,
        agent_steps: c.steps
      }, null, 2);

      if (navigator.clipboard) {
        navigator.clipboard.writeText(fullPayload);
        alert(`Sayın ${c.name} için üretilen tüm Ajan & Tool çalıştırma izleri JSON formatında panoya kopyalandı!`);
      }
    }

    // AJAN ADIMLARINI DETAYLI VE FİLTRELİ YÜKLE
    function loadAgentStepsFor(key) {
      const c = CUSTOMERS[key];
      if (!c) return;
      selectedCustKey = key;

      // Dropdown senkronizasyonu
      const sel = document.getElementById('agent-cust-select');
      if (sel) sel.value = key;

      // Toplam gecikme ve metrik hesabı
      let totalMs = 0;
      c.steps.forEach(s => totalMs += (s.ms || 50));
      const latEl = document.getElementById('stat-agent-latency');
      if (latEl) latEl.innerText = `${(totalMs / 1000).toFixed(2)} sn`;

      // Filtreleme
      let filteredSteps = c.steps;
      if (currentAgentStepFilter === 'Ajan A (Planlayıcı)') {
        filteredSteps = c.steps.filter(s => s.agent.includes('Planlayıcı'));
      } else if (currentAgentStepFilter === 'Ajan B (İletişimci)') {
        filteredSteps = c.steps.filter(s => s.agent.includes('İletişimci'));
      } else if (currentAgentStepFilter === 'Ajan C (Sohbet Ajanı)') {
        filteredSteps = c.steps.filter(s => s.agent.includes('Sohbet') || s.tool.includes('sohbet') || s.tool.includes('soru') || s.tool.includes('karar'));
      } else if (currentAgentStepFilter === 'rule') {
        filteredSteps = c.steps.filter(s => s.tool.includes('erteleme') || s.tool.includes('oncelik') || s.tool.includes('devir'));
      }

      const box = document.getElementById('agent-steps-timeline');
      if (!box) return;

      if (filteredSteps.length === 0) {
        box.innerHTML = `<div style="text-align:center;padding:24px;color:var(--text-muted)">Bu filtre kriterine uygun tool çağrısı bulunamadı.</div>`;
        return;
      }

      box.innerHTML = filteredSteps.map((s, idx) => {
        const isPlanAgent = s.agent.includes('Planlayıcı');
        const isChatAgent = s.agent.includes('Sohbet');
        let badgeColor = 'rgba(77, 123, 176, 0.15)';
        let badgeTextColor = '#7EA5D9';
        if (isPlanAgent) {
          badgeColor = 'rgba(217, 83, 0, 0.15)';
          badgeTextColor = 'var(--ing-primary)';
        } else if (isChatAgent) {
          badgeColor = 'rgba(46, 158, 104, 0.15)';
          badgeTextColor = '#3DAF7E';
        }

        let guardrailNote = '✓ Kod Üst Sınırı (Max 6 Ay) & Bankacılık Guardrail Denetimi Geçti';
        if (s.tool.includes('oncelik')) {
          guardrailNote = '✓ 65+ Yaş & Hassas Durum Öncelik Kuralı (#REG-702) İşletildi';
        } else if (s.tool.includes('iletisimci')) {
          guardrailNote = '✓ Saygılı Dil & Ticari Pazarlama Filtresi (%100 Vaatsiz ve Şeffaf)';
        } else if (s.tool.includes('sohbet') || s.tool.includes('soru') || s.tool.includes('karar')) {
          guardrailNote = '✓ In-Context Doğrulama: Müşteri Verisi Otomatik Enjekte Edildi & Karar İnsanda Bırakıldı';
        } else if (s.tool.includes('devir')) {
          guardrailNote = '✓ Zorunlu İnsan Müdahalesi (HITL) Devir Bayrağı Kontrol Edildi';
        }

        const cotReasoning = s.cot || `Bu adımda ${s.tool} aracı tetiklenerek ${c.name} için deterministik bağlam oluşturuldu ve sonraki karar aşamasına aktarıldı.`;

        const fullJsonStr = escapeHtml(JSON.stringify({ input: s.in, output: s.out }, null, 2));

        return `
          <div class="agent-step-item">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
              <div style="display:flex;align-items:center;gap:8px">
                <span class="step-badge" style="background:${badgeColor};color:${badgeTextColor}">
                  Adım ${idx + 1} · ${s.agent}
                </span>
                <strong style="color:var(--text-main);font-size:13.5px;font-family:'JetBrains Mono',monospace">${s.tool}()</strong>
              </div>
              <div style="display:flex;align-items:center;gap:10px">
                <span style="font-size:11px;color:var(--status-green);background:var(--status-green-bg);border:1px solid var(--status-green-border);padding:2px 8px;border-radius:4px;font-weight:600">
                  ● HTTP 200 OK
                </span>
                <span style="font-family:'JetBrains Mono';font-size:11.5px;color:var(--text-muted);font-weight:600">
                  ⏱️ ${s.ms} ms
                </span>
              </div>
            </div>

            <!-- AJAN AKIL YÜRÜTME / CHAIN OF THOUGHT -->
            <div class="step-cot-box">
              <strong style="color:var(--status-blue)">🧠 Ajan Akıl Yürütme (Chain of Thought):</strong> ${cotReasoning}
            </div>

            <div style="font-size:12px;color:var(--text-muted);margin:6px 0 2px">
              <strong>İşlev:</strong> ${s.desc}
            </div>

            <!-- GİRDİ VE ÇIKTI JSON KUTUSU -->
            <div class="step-code">
              <button class="step-copy-btn" onclick="copyJsonPayload(this, '${escapeHtml(JSON.stringify({ input: s.in, output: s.out }))}')">
                📋 JSON Kopyala
              </button>
              <div><span style="color:var(--status-blue);font-weight:600">Girdi (Input):</span> ${escapeHtml(typeof s.in === 'string' ? s.in : JSON.stringify(s.in))}</div>
              <div style="margin-top:6px"><span style="color:var(--status-green);font-weight:600">Çıktı (Output):</span> ${escapeHtml(typeof s.out === 'string' ? s.out : JSON.stringify(s.out))}</div>
            </div>

            <!-- GUARDRAIL DOĞRULAMASI -->
            <div class="step-guardrail-tag">
              ${guardrailNote}
            </div>
          </div>
        `;
      }).join('');
    }

    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    // AJANI CANLI YENİDEN KOŞ SİMÜLASYONU
    function reRunAgentLoop() {
      const c = CUSTOMERS[selectedCustKey];
      const box = document.getElementById('agent-steps-timeline');
      box.innerHTML = `<div style="text-align:center;padding:30px;color:var(--text-muted)">⏳ Ajan tool-calling döngüsü canlı olarak yürütülüyor (${c.name})...</div>`;

      // FastAPI Ajan Servisi ile Canlı Koş
      if (window.LimanAPI && LimanAPI.isOnline()) {
        LimanAPI.runAgent(c.id || selectedCustKey).then(res => {
          if (res) console.log('✅ [FastAPI :8000] Ajan döngüsü API üzerinden canlı çalıştırıldı:', res);
        });
      }

      let currentStep = 0;
      const interval = setInterval(() => {
        currentStep++;
        const subset = c.steps.slice(0, currentStep);
        box.innerHTML = subset.map((s, idx) => `
          <div class="agent-step-item ${idx === currentStep - 1 ? 'executing' : ''}">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <div>
                <span class="step-badge" style="background:var(--ing-subtle);color:var(--ing-primary);border:1px solid var(--ing-border)">
                  Adım ${idx + 1} · ${s.agent}
                </span>
                <strong style="color:var(--text-main);font-size:13px;margin-left:6px;font-family:'JetBrains Mono'">${s.tool}()</strong>
              </div>
              <span style="font-family:'JetBrains Mono';font-size:11px;color:var(--status-green)">${s.ms} ms</span>
            </div>
            <div class="step-cot-box">
              <strong style="color:var(--status-blue)">🧠 CoT:</strong> ${s.desc}
            </div>
            <div class="step-code">
              <div><span style="color:var(--status-blue)">Girdi:</span> ${escapeHtml(s.in)}</div>
              <div style="margin-top:4px"><span style="color:var(--status-green)">Çıktı:</span> ${escapeHtml(s.out)}</div>
            </div>
          </div>
        `).join('');

        if (currentStep >= c.steps.length) {
          clearInterval(interval);
          setTimeout(() => loadAgentStepsFor(selectedCustKey), 800);
        }
      }, 350);
    }

    // İNTERAKTİF PLAYGROUND SİMÜLASYON RUNNER'I
    function runPlaygroundSimulation() {
      const name = document.getElementById('play-name').value.trim() || 'Müşteri';
      const age = parseInt(document.getElementById('play-age').value) || 45;
      const loan = document.getElementById('play-loan').value;
      const dask = document.getElementById('play-dask').value === 'true';

      const isSenior = age >= 65;
      let months = (loan === 'kart') ? 2 : 3;
      if (isSenior) months += 1;
      months = Math.min(months, 6);

      const resBox = document.getElementById('playground-result-box');
      const resStatus = document.getElementById('play-result-status');
      const resPlan = document.getElementById('play-result-plan');
      const resMsg = document.getElementById('play-result-msg');

      resBox.style.display = 'block';
      resStatus.innerHTML = '⏳ Ajan A & B çalıştırılıyor...';
      resPlan.innerHTML = 'Kural motoru devrede...';
      resMsg.innerHTML = 'Sentetik agent adımları icra ediliyor...';

      setTimeout(() => {
        resStatus.innerHTML = `✓ Ajan Döngüsü Başarılı · ${isSenior ? '⭐ Yüksek Öncelik (65+ Yaş)' : 'Standart Kapsam'}`;
        resPlan.innerHTML = `🎯 Sonuç: ${months} Ay Faizsiz Erteleme (Kod Üst Sınırı 6 Ay)`;
        resMsg.innerHTML = `"Sayın ${name}, geçmiş olsun. Afet bölgesi kapsamında ${loan === 'konut' ? 'konut' : (loan === 'ihtiyac' ? 'ihtiyaç' : 'kredi kartı')} borcunuz için ${months} aylık kolaylaştırıcı erteleme taslağınız hazırlanmıştır. ${loan === 'konut' && !dask ? 'Konutunuzun sigorta kaydına ulaşılamadığından temsilcimiz danışmanlık amacıyla sizi arayacaktır.' : 'Siz uygun görürseniz onayınızla ilerleyebiliriz.'}"`;
      }, 600);
    }

    // ⚡ YENİ AFET SİMÜLASYONU TETİKLEME (DİNAMİK GÜNCELLEME)
    function runDisasterSimulation() {
      const btn = document.getElementById('btn-trigger');
      btn.disabled = true;
      btn.innerHTML = '<span>⏳</span> Simülasyon Çalışıyor...';

      const pBox = document.getElementById('pipeline-box');
      const pBar = document.getElementById('progress-bar');
      const pText = document.getElementById('pipeline-status-text');
      const pPct = document.getElementById('pipeline-percent-text');
      const pSub = document.getElementById('pipeline-sub-text');

      pBox.style.display = 'block';

      // Sayıları sıfırla ve artıralım
      document.getElementById('stat-etkilenen').innerText = '0';
      document.getElementById('stat-oncelik').innerText = '0';
      document.getElementById('stat-taslak').innerText = '0';
      document.getElementById('stat-hacim').innerText = '₺0';

      const now = new Date().toTimeString().split(' ')[0];
      eventLogs.unshift({
        time: now,
        topic: 'disaster.declared',
        desc: 'YENİ SİMÜLASYON: M7.4 Deprem tetiklendi. Olay kuyruğu uyanıyor.'
      });
      renderEvents();

      // FastAPI Afet Servisi ile Canlı Olay Tetikle (:8000/api/disaster/trigger)
      if (window.LimanAPI && LimanAPI.isOnline()) {
        LimanAPI.triggerDisaster({
          tur: 'deprem',
          buyukluk: 7.4,
          seviye: '4. Seviye',
          iller: 'Hatay, Kahramanmaraş, Malatya, Adıyaman, Gaziantep'
        }).then(res => {
          if (res) console.log('✅ [FastAPI :8000] Afet simülasyonu API üzerinden tetiklendi:', res);
        });
      }

      // Aşama 1: Müşteri eşleme
      pBar.style.width = '25%';
      pText.innerText = 'Aşama 1: Etkilenen Müşteriler Eşleştiriliyor...';
      pPct.innerText = '25%';
      pSub.innerText = '400 müşteri koordinatları taranıyor...';

      setTimeout(() => {
        document.getElementById('stat-etkilenen').innerText = '258';
        pBar.style.width = '55%';
        pText.innerText = 'Aşama 2: Öncelik Belirleme & Kural Motoru...';
        pPct.innerText = '55%';
        pSub.innerText = '65 yaş üstü ve engelli müşteriler tespit edildi (76 kişi).';
        document.getElementById('stat-oncelik').innerText = '76';
        
        eventLogs.unshift({
          time: new Date().toTimeString().split(' ')[0],
          topic: 'customer.affected',
          desc: '258 müşteri afet bölgesiyle eşleştirildi (76 yüksek öncelik).'
        });
        renderEvents();
      }, 700);

      // Aşama 3: Ajan A ve B Taslak Üretimi
      setTimeout(() => {
        pBar.style.width = '85%';
        pText.innerText = 'Aşama 3: Ajan A (Planlayıcı) ve Ajan B (İletişimci) Çalışıyor...';
        pPct.innerText = '85%';
        pSub.innerText = '258 erteleme taslağı kod üst sınırlarıyla üretiliyor, mesajlar yazılıyor...';
        document.getElementById('stat-taslak').innerText = '258';
        document.getElementById('stat-hacim').innerText = '₺8.54M';

        eventLogs.unshift({
          time: new Date().toTimeString().split(' ')[0],
          topic: 'plan.drafted',
          desc: 'Tüm taslaklar oluşturuldu. Bildirimler müşteri paneline iletildi.'
        });
        renderEvents();
      }, 1400);

      // Tamamlandı
      setTimeout(() => {
        pBar.style.width = '100%';
        pText.innerText = '✓ Simülasyon Başarıyla Tamamlandı';
        pPct.innerText = '100%';
        pSub.innerText = 'Planlar hazır. Karar insanda (Müşteri onayı veya temsilci bekleniyor).';

        btn.disabled = false;
        btn.innerHTML = '<span>⚡</span> Yeni Afet Simülasyonu Tetikle';
      }, 2100);
    }

    // MÜŞTERİ PLANI ONAYLAMA (DOĞAL AKIŞ TAMAMLAMA)
    function approvePlan() {
      const c = CUSTOMERS[selectedCustKey];
      const now = new Date().toTimeString().split(' ')[0];
      
      c.approved = true;
      c.escalated = false;
      c.declined = false;

      // Liman Bankası Çekirdek Veritabanına kaydet
      const db = (typeof LimanDB !== 'undefined') ? LimanDB : window.LimanDB;
      if (db) {
        db.recordLoanApproval(selectedCustKey, 'Liman Mobil (Müşteri Kararı)');
      }
      refreshDatabaseIframe();

      // FastAPI Canlı Akış Servisine Bildir (:8000/api/plans/approve)
      if (window.LimanAPI && LimanAPI.isOnline()) {
        LimanAPI.approvePlan(c.id || selectedCustKey).then(res => {
          if (res) console.log('✅ [FastAPI :8000] Plan onaylandı (POST /api/plans/approve):', res);
        });
      }

      eventLogs.unshift({
        time: now,
        topic: 'plan.approved',
        desc: `${c.name} (${c.id}) mobil akış üzerinden planı onayladı → Banka Çalışanı İnceleme Havuzuna eklendi.`
      });
      renderEvents();

      // Denetim izine ekle
      const auditBox = document.getElementById('audit-log-box');
      if (auditBox) {
        auditBox.innerHTML = `<div>[${now}] <strong style="color:var(--status-green)">plan.approved</strong> → ${c.name} mobilden onayladı (${c.months})</div>` + auditBox.innerHTML;
      }

      // Akış penceresini kapat ve arayüzü güncelle
      closeAfetFlowModal();
      updateCustomerView();

      const badgeEl = document.getElementById(`badge-${selectedCustKey}`);
      if (badgeEl) badgeEl.innerText = '✓ Müşteri Onayladı → Çalışan Havuzunda';

      alert(`Sayın ${c.name},\n\n${c.loanType} için ${c.months} erteleme talebiniz başarıyla alınmıştır.\n\nBanka çalışanının onay havuzuna iletildi. Yetkili personel nihai kontrolleri tamamladıktan sonra tarafınıza SMS ile bilgilendirme yapılacaktır.`);
    }

    // TEMSİLCİ DEVİR
    function openEscalate() {
      document.getElementById('escalate-modal').style.display = 'flex';
    }
    function closeEscalate() {
      document.getElementById('escalate-modal').style.display = 'none';
    }
    function submitEscalate() {
      const reason = document.getElementById('escalate-reason').value;
      const c = CUSTOMERS[selectedCustKey];
      const now = new Date().toTimeString().split(' ')[0];
      
      c.escalated = true;
      c.approved = false;
      c.declined = false;

      // Liman Bankası Çekirdek Veritabanına kaydet
      const db = (typeof LimanDB !== 'undefined') ? LimanDB : window.LimanDB;
      if (db) {
        db.recordEscalation(selectedCustKey, reason, 'Mobil Temsilci Talebi');
      }
      refreshDatabaseIframe();

      // FastAPI Canlı Akış Servisine Bildir (:8000/api/plans/escalate)
      if (window.LimanAPI && LimanAPI.isOnline()) {
        LimanAPI.escalatePlan(c.id || selectedCustKey, reason, 'Mobil Temsilci Talebi').then(res => {
          if (res) console.log('✅ [FastAPI :8000] Temsilciye aktarıldı (POST /api/plans/escalate):', res);
        });
      }

      closeEscalate();
      closeAfetFlowModal();

      eventLogs.unshift({
        time: now,
        topic: 'plan.escalated',
        desc: `${c.name} temsilci talebinde bulundu (${reason}) → Öncelikli Çağrı Listesine aktarıldı.`
      });
      renderEvents();

      const auditBox = document.getElementById('audit-log-box');
      if (auditBox) {
        auditBox.innerHTML = `<div>[${now}] <strong style="color:#B3A4DB">plan.escalated</strong> → ${c.name} temsilciye devredildi (${reason})</div>` + auditBox.innerHTML;
      }

      updateCustomerView();

      const badgeEl = document.getElementById(`badge-${selectedCustKey}`);
      if (badgeEl) badgeEl.innerText = '☎ Temsilciye Devredildi';

      alert(`Talebiniz alınmıştır. Afet Öncelik Masası müşteri temsilcimiz en kısa sürede sizi telefonla arayacaktır.`);
    }

    // VERİTABANI PENCERESİNİ AÇMA VE BAĞLANTIYI TUTMA
    function openDatabaseWindow() {
      window._dbWindow = window.open('database.html', 'LimanPostgresDB');
      if (window._dbWindow) {
        window._dbWindow.focus();
      }
    }
    window.openDatabaseWindow = openDatabaseWindow;

    // TEMA DEĞİŞTİRME (AÇIK / KOYU)
    function toggleTheme() {
      document.body.classList.toggle('dark-mode');
      const isDark = document.body.classList.contains('dark-mode');
      try {
        localStorage.setItem('liman_theme', isDark ? 'dark' : 'light');
      } catch (e) {}
      const icon = document.getElementById('theme-toggle-icon');
      if (icon) icon.innerText = isDark ? '☀️' : '🌙';
    }
    window.toggleTheme = toggleTheme;

    // Kayıtlı temayı uygula
    try {
      if (localStorage.getItem('liman_theme') === 'dark') {
        document.body.classList.add('dark-mode');
        const icon = document.getElementById('theme-toggle-icon');
        if (icon) icon.innerText = '☀️';
      }
    } catch (e) {}

    // FASTAPI CANLI VERİ ENTEGRASYONU
    async function fetchCustomersFromAPI() {
      if (!window.LimanAPI || !LimanAPI.isOnline()) return;
      try {
        const res = await LimanAPI.getCustomers();
        if (res && res.customers) {
          res.customers.forEach(c => {
            const key = c.id;
            if (!CUSTOMERS[key] && !Object.values(CUSTOMERS).some(x => x.id === c.id)) {
              CUSTOMERS[key] = {
                id: c.id,
                name: c.name,
                email: c.email,
                age: c.age,
                city: c.city,
                loanType: c.loan_type,
                installment: Number(c.monthly_installment).toLocaleString('tr-TR') + ' ₺',
                total: (Number(c.monthly_installment) * (c.is_hassas ? 4 : 3)).toLocaleString('tr-TR') + ' ₺',
                months: (c.is_hassas ? '4 Ay' : '3 Ay'),
                dask: c.dask_var ? (c.dask_police_no ? `✓ DASK Var (${c.dask_police_no})` : '✓ DASK Var') : '⚠ DASK Yok',
                priority: c.priority || (c.is_hassas ? 'Yüksek Öncelik' : 'Normal Öncelik'),
                msg: `Sayın ${c.name}, geçmiş olsun. Afet bölgesi kapsamında ${c.loan_type} için erteleme taslağınız hazırlanmıştır.`,
                docs: ['Kimlik fotokopisi / T.C. Kimlik doğrulaması', 'Hasar tespit tutanağı veya ikametgâh belgesi'],
                steps: CUSTOMERS.hatice ? CUSTOMERS.hatice.steps : []
              };
              injectCustomerCard(key, CUSTOMERS[key]);
            }
          });
          const statEtk = document.getElementById('stat-etkilenen');
          if (statEtk) statEtk.innerText = Object.keys(CUSTOMERS).length;
        }
      } catch (e) {
        console.warn('[app.js] fetchCustomersFromAPI error:', e);
      }
    }
    window.fetchCustomersFromAPI = fetchCustomersFromAPI;

    // ════════════════════════════════════════════════════════════════
    // 6. BANKACILIK HIZLI İŞLEMLERİ (FAST, QR, ÖZET, BORÇ, LİMİT, EKSTRE)
    // ════════════════════════════════════════════════════════════════

    let userBankingState = {
      checkingBalance: 48250.00,
      cardDebt: 4820.00,
      cardLimit: 60000.00,
      minDebtRate: 0.40,
      iban: 'TR33 0009 9000 0012 3456 7890 01',
      accountTransactions: [
        { date: '04 Eki 2026', type: 'gelen', title: 'Emekli Maaşı / SGK Transferi', desc: 'SGK Başkanlığı', amount: 18500.00 },
        { date: '02 Eki 2026', type: 'giden', title: 'FAST Transfer', desc: 'Ayşe Kaya', amount: -1250.00 },
        { date: '28 Eyl 2026', type: 'giden', title: 'Konut Kredisi Taksiti', desc: 'Liman Bankası Otomatik Tahsilat', amount: -14500.00 },
        { date: '25 Eyl 2026', type: 'giden', title: 'Elektrik & Su Faturası', desc: 'Enerji A.Ş.', amount: -680.00 },
        { date: '20 Eyl 2026', type: 'gelen', title: 'Gelen FAST Transfer', desc: 'Mehmet Yılmaz', amount: 3500.00 }
      ]
    };

    function loadBankingState() {
      try {
        const saved = localStorage.getItem('liman_user_banking_state');
        if (saved) {
          userBankingState = Object.assign(userBankingState, JSON.parse(saved));
        }
      } catch (e) {}
      syncBankingUi();
    }

    function saveBankingState() {
      try {
        localStorage.setItem('liman_user_banking_state', JSON.stringify(userBankingState));
      } catch (e) {}
      syncBankingUi();
    }

    function formatTl(num) {
      return '₺' + Number(num).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function syncBankingUi() {
      const checkEl = document.getElementById('bank-checking-balance');
      if (checkEl) checkEl.innerText = formatTl(userBankingState.checkingBalance);

      const fastSenderBal = document.getElementById('fast-sender-balance');
      if (fastSenderBal) fastSenderBal.innerText = formatTl(userBankingState.checkingBalance);

      const summaryBal = document.getElementById('summary-balance-disp');
      if (summaryBal) summaryBal.innerText = formatTl(userBankingState.checkingBalance);

      const debtEl = document.getElementById('bank-card-debt');
      if (debtEl) debtEl.innerText = formatTl(userBankingState.cardDebt);

      const paydebtTotal = document.getElementById('paydebt-total-disp');
      if (paydebtTotal) paydebtTotal.innerText = formatTl(userBankingState.cardDebt);

      const minPay = userBankingState.cardDebt * userBankingState.minDebtRate;
      const paydebtMin = document.getElementById('paydebt-min-disp');
      if (paydebtMin) paydebtMin.innerText = formatTl(minPay);

      const optTotal = document.getElementById('opt-total-amount');
      if (optTotal) optTotal.innerText = formatTl(userBankingState.cardDebt);

      const optMin = document.getElementById('opt-min-amount');
      if (optMin) optMin.innerText = formatTl(minPay);

      const availLimit = Math.max(0, userBankingState.cardLimit - userBankingState.cardDebt);
      const limitDisp = document.getElementById('bank-card-limit-disp');
      if (limitDisp) limitDisp.innerText = `${formatTl(availLimit)} / ${formatTl(userBankingState.cardLimit)}`;

      const limitBar = document.getElementById('bank-card-limit-bar');
      if (limitBar) {
        const pct = Math.min(100, Math.round((userBankingState.cardDebt / userBankingState.cardLimit) * 100));
        limitBar.style.width = `${pct}%`;
      }

      const limitCurDisp = document.getElementById('limit-current-disp');
      if (limitCurDisp) limitCurDisp.innerText = formatTl(userBankingState.cardLimit);

      const limitAvailDisp = document.getElementById('limit-avail-disp');
      if (limitAvailDisp) limitAvailDisp.innerText = formatTl(availLimit);
    }

    function openBankingModal(modalId) {
      syncBankingUi();
      const modal = document.getElementById(modalId);
      if (modal) {
        modal.style.display = 'flex';
      }
    }

    function closeBankingModal(modalId) {
      const modal = document.getElementById(modalId);
      if (modal) {
        modal.style.display = 'none';
      }
    }
    window.closeBankingModal = closeBankingModal;

    // ── 1. FAST MODAL ──
    function openFastModal() {
      openBankingModal('modal-fast-transfer');
    }
    window.openFastModal = openFastModal;

    function setFastAmount(amt) {
      const inp = document.getElementById('fast-amount');
      if (inp) inp.value = amt;
    }
    window.setFastAmount = setFastAmount;

    function submitFastTransfer(e) {
      e.preventDefault();
      const recipient = document.getElementById('fast-recipient-name').value.trim();
      const iban = document.getElementById('fast-recipient-iban').value.trim();
      const amount = parseFloat(document.getElementById('fast-amount').value);
      const desc = document.getElementById('fast-desc').value.trim() || 'FAST Para Transferi';

      if (isNaN(amount) || amount <= 0) {
        alert('Lütfen geçerli bir transfer tutarı girin.');
        return;
      }

      if (amount > userBankingState.checkingBalance) {
        alert(`Yetersiz bakiye!\nVadesiz hesabınızda ${formatTl(userBankingState.checkingBalance)} bulunmaktadır.`);
        return;
      }

      userBankingState.checkingBalance -= amount;
      const nowStr = new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
      userBankingState.accountTransactions.unshift({
        date: nowStr,
        type: 'giden',
        title: `FAST: ${recipient}`,
        desc: desc,
        amount: -amount
      });
      saveBankingState();

      const txId = 'tx_fast_' + Date.now();
      const now = new Date().toTimeString().split(' ')[0];
      const db = (typeof LimanDB !== 'undefined') ? LimanDB : window.LimanDB;
      if (db && db.recordTransaction) {
        db.recordTransaction(txId, selectedCustKey, 'FAST_GÖNDERİM', amount, 'Mobil FAST', `${recipient} (${iban})`);
      }
      refreshDatabaseIframe();

      eventLogs.unshift({
        time: now,
        topic: 'payment.fast.completed',
        desc: `FAST TRANSFER: ${recipient} kişisine ${formatTl(amount)} anında gönderildi (Ref: ${txId}).`
      });
      renderEvents();

      const auditBox = document.getElementById('audit-log-box');
      if (auditBox) {
        auditBox.innerHTML = `<div>[${now}] <strong style="color:var(--status-green)">payment.fast</strong> → ${formatTl(amount)} ${recipient} (TCMB FAST 200 OK)</div>` + auditBox.innerHTML;
      }

      closeBankingModal('modal-fast-transfer');
      e.target.reset();

      alert(`✓ FAST Transfer Başarılı!\n\nAlıcı: ${recipient}\nTutar: ${formatTl(amount)}\nİşlem No: ${txId}\n\nPara alıcının hesabına saniyeler içinde aktarılmıştır.`);
    }
    window.submitFastTransfer = submitFastTransfer;

    // ── 2. QR İŞLEMLERİ ──
    function openQrModal() {
      openBankingModal('modal-qr-ops');
      switchQrTab('pay');
    }
    window.openQrModal = openQrModal;

    function switchQrTab(tab) {
      document.getElementById('btn-qr-tab-pay').classList.toggle('active', tab === 'pay');
      document.getElementById('btn-qr-tab-receive').classList.toggle('active', tab === 'receive');
      document.getElementById('qr-tab-content-pay').style.display = tab === 'pay' ? 'block' : 'none';
      document.getElementById('qr-tab-content-receive').style.display = tab === 'receive' ? 'block' : 'none';
    }
    window.switchQrTab = switchQrTab;

    function executeQrAction(type, amount) {
      if (amount > userBankingState.checkingBalance) {
        alert('Yetersiz hesap bakiyesi!');
        return;
      }

      userBankingState.checkingBalance -= amount;
      const typeLabel = (type === 'atm_withdraw') ? 'ATM Kartsız Para Çekme' : ((type === 'pos_pay') ? 'POS Karekod Ödeme' : 'Fatura Karekod');
      const nowStr = new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
      userBankingState.accountTransactions.unshift({
        date: nowStr,
        type: 'giden',
        title: `QR İşlemi (${typeLabel})`,
        desc: 'Liman Karekod Gateway',
        amount: -amount
      });
      saveBankingState();

      const txId = 'tx_qr_' + Date.now();
      const now = new Date().toTimeString().split(' ')[0];
      const db = (typeof LimanDB !== 'undefined') ? LimanDB : window.LimanDB;
      if (db && db.recordTransaction) {
        db.recordTransaction(txId, selectedCustKey, 'QR_ÖDEME', amount, 'Mobil QR', typeLabel);
      }
      refreshDatabaseIframe();

      eventLogs.unshift({
        time: now,
        topic: 'payment.qr.completed',
        desc: `QR İŞLEMİ: ${typeLabel} (${formatTl(amount)}) başarıyla tamamlandı.`
      });
      renderEvents();

      closeBankingModal('modal-qr-ops');
      alert(`✓ QR Kod İşlemi Başarılı!\n\nİşlem: ${typeLabel}\nTutar: ${formatTl(amount)}\nİşlem No: ${txId}\n\nKalan Bakiye: ${formatTl(userBankingState.checkingBalance)}`);
    }
    window.executeQrAction = executeQrAction;

    // ── 3. HESAP ÖZETİ ──
    function openAccountSummaryModal() {
      const c = CUSTOMERS[selectedCustKey] || {};
      const ownerEl = document.getElementById('summary-owner-name');
      if (ownerEl) ownerEl.innerText = c.name || 'Hatice Hanım';

      renderAccountSummaryTable();
      openBankingModal('modal-account-summary');
    }
    window.openAccountSummaryModal = openAccountSummaryModal;

    function renderAccountSummaryTable() {
      const tbody = document.getElementById('account-summary-tbody');
      if (!tbody) return;

      tbody.innerHTML = userBankingState.accountTransactions.map(t => {
        const isGelen = t.amount > 0;
        const color = isGelen ? 'var(--status-green)' : 'var(--text-main)';
        const sign = isGelen ? '+' : '';
        return `
          <tr>
            <td style="font-family:'JetBrains Mono';color:var(--text-dim);font-size:11px">${t.date}</td>
            <td>
              <div style="font-weight:600">${t.title}</div>
              <div style="font-size:10.5px;color:var(--text-muted)">${t.desc}</div>
            </td>
            <td align="right" style="font-weight:700;color:${color}">${sign}${formatTl(t.amount)}</td>
          </tr>
        `;
      }).join('');
    }

    function downloadAccountSummaryPdf() {
      alert(`📑 Hesap Özeti Dekontu Hazırlandı!\n\nHesap: Vadesiz TL Hesabım (TR33...001)\nBakiye: ${formatTl(userBankingState.checkingBalance)}\n\nDekont PDF formatında cihazınıza indirildi.`);
    }
    window.downloadAccountSummaryPdf = downloadAccountSummaryPdf;

    // ── 4. BORÇ ÖDE ──
    function openPayDebtModal() {
      openBankingModal('modal-pay-debt');
    }
    window.openPayDebtModal = openPayDebtModal;

    function togglePayDebtInput() {
      const isCustom = document.querySelector('input[name="paydebt_option"]:checked').value === 'custom';
      const wrap = document.getElementById('paydebt-custom-wrap');
      if (wrap) wrap.style.display = isCustom ? 'block' : 'none';
    }
    window.togglePayDebtInput = togglePayDebtInput;

    function submitPayDebt(e) {
      e.preventDefault();
      if (userBankingState.cardDebt <= 0) {
        alert('Tebrikler, kredi kartı borcunuz bulunmamaktadır (0,00 ₺).');
        closeBankingModal('modal-pay-debt');
        return;
      }

      const opt = document.querySelector('input[name="paydebt_option"]:checked').value;
      let amount = 0;
      if (opt === 'total') {
        amount = userBankingState.cardDebt;
      } else if (opt === 'min') {
        amount = Math.min(userBankingState.cardDebt, userBankingState.cardDebt * userBankingState.minDebtRate);
      } else {
        amount = parseFloat(document.getElementById('paydebt-custom-amount').value);
      }

      if (isNaN(amount) || amount <= 0) {
        alert('Lütfen geçerli bir ödeme tutarı girin.');
        return;
      }

      if (amount > userBankingState.checkingBalance) {
        alert(`Yetersiz bakiye!\nVadesiz hesabınızda ${formatTl(userBankingState.checkingBalance)} bulunmaktadır.`);
        return;
      }

      userBankingState.checkingBalance -= amount;
      userBankingState.cardDebt = Math.max(0, userBankingState.cardDebt - amount);
      const nowStr = new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
      userBankingState.accountTransactions.unshift({
        date: nowStr,
        type: 'giden',
        title: 'Kredi Kartı Borç Ödeme',
        desc: 'Liman Bonus Kart (•••• 4182)',
        amount: -amount
      });
      saveBankingState();

      const txId = 'tx_card_' + Date.now();
      const now = new Date().toTimeString().split(' ')[0];
      const db = (typeof LimanDB !== 'undefined') ? LimanDB : window.LimanDB;
      if (db && db.recordTransaction) {
        db.recordTransaction(txId, selectedCustKey, 'KART_BORÇ_ÖDEME', amount, 'Mobil Şube', `Kart Borç Ödemesi (${formatTl(amount)})`);
      }
      refreshDatabaseIframe();

      eventLogs.unshift({
        time: now,
        topic: 'card.debt.paid',
        desc: `BORÇ ÖDENDİ: Kredi kartına ${formatTl(amount)} ödendi. Kalan borç: ${formatTl(userBankingState.cardDebt)}.`
      });
      renderEvents();

      closeBankingModal('modal-pay-debt');
      alert(`✓ Kredi Kartı Borç Ödemesi Alındı!\n\nÖdenen Tutar: ${formatTl(amount)}\nKalan Kart Borcu: ${formatTl(userBankingState.cardDebt)}\nKullanılabilir Limit: ${formatTl(userBankingState.cardLimit - userBankingState.cardDebt)}\n\nKart limitiniz anında geri yüklenmiştir.`);
    }
    window.submitPayDebt = submitPayDebt;

    // ── 5. LİMİT İŞLEMLERİ ──
    function openLimitModal() {
      openBankingModal('modal-card-limit');
    }
    window.openLimitModal = openLimitModal;

    function submitLimitUpdate(e) {
      e.preventDefault();
      const newLimit = parseFloat(document.getElementById('limit-requested-input').value);
      if (isNaN(newLimit) || newLimit < userBankingState.cardLimit) {
        alert(`Yeni limit mevcut limitten (${formatTl(userBankingState.cardLimit)}) yüksek olmalıdır.`);
        return;
      }

      userBankingState.cardLimit = newLimit;
      saveBankingState();

      const now = new Date().toTimeString().split(' ')[0];
      eventLogs.unshift({
        time: now,
        topic: 'card.limit.updated',
        desc: `LİMİT ARTTIRILDI: Kredi kartı limiti ${formatTl(newLimit)} seviyesine güncellendi (Afet Modu Onayı).`
      });
      renderEvents();

      const auditBox = document.getElementById('audit-log-box');
      if (auditBox) {
        auditBox.innerHTML = `<div>[${now}] <strong style="color:var(--status-blue)">card.limit.increased</strong> → Yeni limit ${formatTl(newLimit)}</div>` + auditBox.innerHTML;
      }

      closeBankingModal('modal-card-limit');
      alert(`✓ Tebrikler!\n\nKart limitiniz Afet Modu kolaylaştırıcı değerlendirmesi kapsamında anında ${formatTl(newLimit)} seviyesine yükseltilmiştir.`);
    }
    window.submitLimitUpdate = submitLimitUpdate;

    // ── 6. EKSTRE GÖRÜNTÜLE ──
    function openStatementModal() {
      openBankingModal('modal-statement');
    }
    window.openStatementModal = openStatementModal;

    // ── 7. FATURA & DÖVİZ ──
    function openBillModal() {
      openBankingModal('modal-bill-pay');
    }
    window.openBillModal = openBillModal;

    function updateBillSample() {
      const type = document.getElementById('bill-type').value;
      const disp = document.getElementById('bill-amount-disp');
      if (!disp) return;
      if (type === 'elektrik') disp.innerText = '340,00 ₺';
      else if (type === 'su') disp.innerText = '185,00 ₺';
      else if (type === 'dogalgaz') disp.innerText = '620,00 ₺';
      else disp.innerText = '245,00 ₺';
    }
    window.updateBillSample = updateBillSample;

    function submitBillPay(e) {
      e.preventDefault();
      const amount = parseFloat(document.getElementById('bill-amount-disp').innerText.replace(',', '.'));
      if (amount > userBankingState.checkingBalance) {
        alert('Yetersiz hesap bakiyesi!');
        return;
      }

      userBankingState.checkingBalance -= amount;
      const billType = document.getElementById('bill-type').selectedOptions[0].text;
      const nowStr = new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
      userBankingState.accountTransactions.unshift({
        date: nowStr,
        type: 'giden',
        title: `Fatura: ${billType.split('(')[0]}`,
        desc: 'Otomatik Kurum Tahsilatı',
        amount: -amount
      });
      saveBankingState();

      closeBankingModal('modal-bill-pay');
      alert(`✓ Fatura Ödemesi Tamamlandı!\n\nKurum: ${billType}\nTutar: ${formatTl(amount)}\n\nMakbuzunuz e-posta adresinize gönderilmiştir.`);
    }
    window.submitBillPay = submitBillPay;

    function openFxModal() {
      openBankingModal('modal-fx-ops');
    }
    window.openFxModal = openFxModal;

    // İLK YÜKLEME
    if (window.LimanDB) LimanDB.init();
    loadSavedCustomCustomers();
    loadBankingState();
    renderEvents();
    switchTab('customer');
    pickCustomer('hatice');
    loadAgentStepsFor('hatice');
    setTimeout(() => fetchCustomersFromAPI(), 500);