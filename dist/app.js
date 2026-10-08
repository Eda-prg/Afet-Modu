    let selectedCustKey = 'selma';
    let currentRole = 'customer';
    let isDisasterActive = false; // Başlangıçta Normal Bankacılık Modu
    window.isDisasterActive = false;

    // ════════════════════════════════════════════════════════════════
    // ÇOKLU SEKME VE ROLLER ARASI CANLI AFET SENKRONİZASYONU
    // (BroadcastChannel + LocalStorage Event Fallback)
    // ════════════════════════════════════════════════════════════════
    const disasterSyncChannel = (typeof BroadcastChannel !== 'undefined') ? new BroadcastChannel('liman_afet_sync') : null;

    function broadcastDisasterState(active, payload = {}) {
      const data = {
        type: active ? 'DISASTER_TRIGGERED' : 'DISASTER_RESET',
        active: !!active,
        custKey: payload.custKey || selectedCustKey || 'selma',
        isFlood: !!payload.isFlood,
        tur: payload.tur || (payload.isFlood ? 'sel' : 'deprem'),
        timestamp: Date.now(),
        ...payload
      };
      try {
        localStorage.setItem('liman_disaster_sync', JSON.stringify(data));
      } catch (e) {}
      if (disasterSyncChannel) {
        try {
          disasterSyncChannel.postMessage(data);
        } catch (e) {}
      }
    }
    window.broadcastDisasterState = broadcastDisasterState;

    function handleDisasterSyncMessage(data) {
      if (!data) return;
      if (data.type === 'DISASTER_TRIGGERED' || data.active === true) {
        if (!isDisasterActive) {
          setDisasterMode(true, { showAlert: true, isBroadcastOrigin: false });
        }
        showSmsNotification({
          custKey: data.custKey || selectedCustKey || 'selma',
          isFlood: !!data.isFlood
        });
      } else if (data.type === 'DISASTER_RESET' || data.active === false) {
        if (isDisasterActive) {
          setDisasterMode(false, { isBroadcastOrigin: false });
          dismissSmsToast();
        }
      }
    }

    if (disasterSyncChannel) {
      disasterSyncChannel.onmessage = (e) => handleDisasterSyncMessage(e.data);
    }
    window.addEventListener('storage', (e) => {
      if (e.key === 'liman_disaster_sync' && e.newValue) {
        try {
          handleDisasterSyncMessage(JSON.parse(e.newValue));
        } catch (err) {}
      }
    });

    // ════════════════════════════════════════════════════════════════
    // OTONOM AFET MODU / NORMAL BANKACILIK MODU GEÇİŞ MOTORU
    // ════════════════════════════════════════════════════════════════
    function setDisasterMode(active, options = {}) {
      isDisasterActive = !!active;
      window.isDisasterActive = isDisasterActive;

      // 1. Üst Navbar & Başlıklar
      const portalSub = document.getElementById('brand-portal-sub');
      if (portalSub) {
        portalSub.innerText = isDisasterActive ? '🚨 Afet Destek Modu Aktif' : 'Bireysel Bankacılık Portalı';
      }

      const modeBadge = document.getElementById('header-mode-badge');
      const modeDot = document.getElementById('header-mode-dot');
      const modeText = document.getElementById('header-mode-text');
      if (modeBadge) {
        modeBadge.className = `mode-badge-indicator ${isDisasterActive ? 'disaster' : 'normal'}`;
        modeBadge.title = isDisasterActive ? 'Afet Modu devrede (Normal moda dönmek için tıklayın)' : 'Normal bankacılık işletimi aktif (Simülatör için tıklayın)';
      }
      if (modeDot) {
        modeDot.className = `mode-dot ${isDisasterActive ? 'disaster' : 'normal'}`;
      }
      if (modeText) {
        modeText.innerText = isDisasterActive ? '🚨 Afet Modu' : 'Normal Mod';
      }

      const btnTrigger = document.getElementById('btn-header-trigger');
      if (btnTrigger) {
        if (isDisasterActive) {
          btnTrigger.innerHTML = '<span>🔄</span> Normal Moda Dön';
          btnTrigger.title = 'Afet modunu kapat ve normal bankacılığa dön';
          btnTrigger.classList.add('active-disaster');
        } else {
          btnTrigger.innerHTML = '<span>🚨</span> Afet Tetikle ⚡';
          btnTrigger.title = 'M7.4 Deprem Bildirimini Tetikle ve Afet Modu\'na Geç';
          btnTrigger.classList.remove('active-disaster');
        }
      }

      // 2. Acil Durum Bildirim Toast'ı
      const alertEl = document.getElementById('disaster-emergency-alert');
      if (alertEl) {
        if (isDisasterActive && options.showAlert !== false) {
          alertEl.style.display = 'flex';
        } else {
          alertEl.style.display = 'none';
        }
      }

      // 3. Müşteri Ekranı Bileşenleri
      const normalBanner = document.getElementById('bank-normal-banner');
      const afetRibbon = document.getElementById('bank-afet-ribbon');
      const custSmsBanner = document.getElementById('customer-sms-received-banner');
      if (normalBanner) normalBanner.style.display = isDisasterActive ? 'none' : 'flex';
      if (afetRibbon) afetRibbon.style.display = isDisasterActive ? 'flex' : 'none';
      if (custSmsBanner) custSmsBanner.style.display = isDisasterActive ? 'block' : 'none';

      const loanNormalBox = document.getElementById('bank-loan-normal-box');
      const loanAfetBox = document.getElementById('bank-loan-afet-box');
      if (loanNormalBox) loanNormalBox.style.display = isDisasterActive ? 'none' : 'block';
      if (loanAfetBox) loanAfetBox.style.display = isDisasterActive ? 'block' : 'none';

      const quickAfetBtn = document.getElementById('btn-quick-afet-flow');
      if (quickAfetBtn) quickAfetBtn.style.display = isDisasterActive ? 'flex' : 'none';

      const supportDesc = document.getElementById('bank-support-desc');
      if (supportDesc) {
        if (isDisasterActive) {
          supportDesc.innerHTML = '<strong>🚨 Afet Masası & Otonom Danışman:</strong> Afet bölgesi öncelikli destek hattımız (0850 222 0 600) ve Liman Asistan 7/24 hizmetinizdedir.';
        } else {
          supportDesc.innerHTML = '<strong>7/24 Müşteri İletişim Merkezi:</strong> 0850 222 0 600 numaralı hattan müşteri temsilcimize dilediğiniz an bağlanabilirsiniz.';
        }
      }

      // 4. Operasyon Konsolu
      const standbyBanner = document.getElementById('op-normal-standby-banner');
      if (standbyBanner) standbyBanner.style.display = isDisasterActive ? 'none' : 'flex';

      const statEtk = document.getElementById('stat-etkilenen');
      const statOnc = document.getElementById('stat-oncelik');
      const statTas = document.getElementById('stat-taslak');
      const statHac = document.getElementById('stat-hacim');

      if (!isDisasterActive) {
        if (statEtk) statEtk.innerText = '0 (Beklemede)';
        if (statOnc) statOnc.innerText = '0';
        if (statTas) statTas.innerText = '0';
        if (statHac) statHac.innerText = '₺0';
      } else {
        if (statEtk && (statEtk.innerText === '0' || statEtk.innerText.includes('Beklemede'))) statEtk.innerText = '258';
        if (statOnc && statOnc.innerText === '0') statOnc.innerText = '76';
        if (statTas && statTas.innerText === '0') statTas.innerText = '258';
        if (statHac && (statHac.innerText === '₺0' || statHac.innerText === '0')) statHac.innerText = '₺8.54M';
      }

      // Müşteri kartını ve görünümünü tazele
      if (typeof updateCustomerView === 'function') {
        updateCustomerView();
      }
    }
    window.setDisasterMode = setDisasterMode;

    function triggerDisasterMode() {
      setDisasterMode(true, { showAlert: true });
      const now = new Date().toTimeString().split(' ')[0];
      eventLogs.unshift({
        time: now,
        topic: 'disaster.declared',
        desc: 'AFAD / Kandilli M7.4 Deprem uyarısı ile sistem otonom AFET MODU\'na geçirildi.'
      });
      renderEvents();

      // Telefona geçmiş olsun SMS'i gelsin (400ms telekom ağ simülasyonu)
      setTimeout(() => {
        showSmsNotification();
      }, 400);

      // Çoklu sekme ve diğer pencerelere canlı yayınla
      broadcastDisasterState(true, {
        tur: 'deprem',
        buyukluk: 7.4,
        custKey: selectedCustKey || 'selma'
      });

      // FastAPI API Servisi ile Canlı Olay Tetikle (:8000/api/disaster/trigger)
      if (window.LimanAPI && LimanAPI.isOnline()) {
        LimanAPI.triggerDisaster({
          tur: 'deprem',
          buyukluk: 7.4,
          seviye: '4. Seviye',
          iller: 'Hatay, Kahramanmaraş, Malatya, Adıyaman, Gaziantep'
        }).catch(() => {});
      }
    }
    window.triggerDisasterMode = triggerDisasterMode;

    function resetToNormalMode() {
      setDisasterMode(false);
      dismissSmsToast();
      closePhoneModal();
      const custSmsBanner = document.getElementById('customer-sms-received-banner');
      if (custSmsBanner) custSmsBanner.style.display = 'none';

      const now = new Date().toTimeString().split(' ')[0];
      eventLogs.unshift({
        time: now,
        topic: 'system.normal',
        desc: 'Olağan bankacılık işletimine dönüldü. Afet alarmı sıfırlandı.'
      });
      renderEvents();

      // Diğer sekmelere sıfırlama yayınla
      broadcastDisasterState(false);
    }
    window.resetToNormalMode = resetToNormalMode;

    function toggleDisasterMode() {
      if (isDisasterActive) {
        resetToNormalMode();
      } else {
        triggerDisasterMode();
      }
    }
    window.toggleDisasterMode = toggleDisasterMode;

    function dismissEmergencyAlert() {
      const el = document.getElementById('disaster-emergency-alert');
      if (el) el.style.display = 'none';
    }
    window.dismissEmergencyAlert = dismissEmergencyAlert;
    window.dismissEmergencyAlert = dismissEmergencyAlert;

    // ════════════════════════════════════════════════════════════════
    // AKILLI TELEFON GELEN SMS BİLDİRİMİ & SES SİMÜLATÖRÜ
    // ════════════════════════════════════════════════════════════════
    function playSmsChime() {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const now = ctx.currentTime;

        // Melodik çift tonlu bildirim sesi (A5 880Hz -> E6 1318.5Hz)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(880, now);
        gain1.gain.setValueAtTime(0.18, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.35);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1318.5, now + 0.12);
        gain2.gain.setValueAtTime(0.22, now + 0.12);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.12);
        osc2.stop(now + 0.65);
      } catch (e) {
        // Otomatik ses kısıtı varsa güvenle yutulur
      }
    }
    window.playSmsChime = playSmsChime;

    function getCustomerPhone(custKey) {
      const phones = {
        selma: '0532 *** 12 84',
        hatice: '0542 *** 39 12',
        emre: '0555 *** 88 41',
        dursun: '0533 *** 53 61',
        fadime: '0534 *** 61 28',
        temel: '0535 *** 10 53',
        asiye: '0536 *** 44 61',
        idris: '0537 *** 99 61'
      };
      return phones[custKey] || '0532 *** 77 90';
    }

    let smsToastTimer = null;

    function showSmsNotification(options = {}) {
      const custKey = options.custKey || selectedCustKey || 'selma';
      const c = CUSTOMERS[custKey] || CUSTOMERS['selma'];
      if (!c) return;

      const phone = getCustomerPhone(custKey);
      const isFlood = options.isFlood || (document.getElementById('current-disaster-tag')?.innerText || '').includes('SEL');
      const disasterWord = isFlood ? 'sel ve heyelan felaketi' : 'deprem felaketi';

      const smsText = `Sayın ${c.name}, bölgenizde meydana gelen ${disasterWord} sebebiyle geçmiş olsun dileklerimizi iletiyoruz. Liman Bankası olarak yanınızdayız. Mevcut ${c.loanType} borcunuz için ${c.months} faizsiz erteleme planınız hazırlanmıştır. Onay için Liman Mobil uygulamasını açın. Uygulamayı açamıyorsanız bu mesaja EVET yazarak yanıtlayabilir veya 0850 222 0 600 Afet Destek Hattımızı arayabilirsiniz. Liman Bank B002`;

      // 1. Yüzen SMS Bildirim Toast'ını Güncelle
      const toastEl = document.getElementById('phone-sms-toast');
      const textEl = document.getElementById('sms-toast-text');
      const phoneEl = document.getElementById('sms-toast-phone');
      if (textEl) textEl.innerText = smsText;
      if (phoneEl) phoneEl.innerText = `${c.name} (${phone})`;

      // 1.1. Müşteri Bankacılık Portalı İçi SMS Bildirim Kartını Güncelle
      const custSmsBanner = document.getElementById('customer-sms-received-banner');
      const custSmsContent = document.getElementById('customer-sms-content-text');
      const custSmsSender = document.getElementById('customer-sms-sender-info');
      if (custSmsContent) custSmsContent.innerText = smsText;
      if (custSmsSender) custSmsSender.innerText = `Liman Bankası (B002) · ${c.name} (${phone})`;
      if (custSmsBanner && isDisasterActive) custSmsBanner.style.display = 'block';

      // 2. Tam Telefon Cihaz Ekranındaki Baloncuğu Güncelle (Sıfır Link / Anti-Phishing)
      const deviceBubble = document.getElementById('phone-device-bubble');
      if (deviceBubble) {
        deviceBubble.innerHTML = `
          Sayın ${c.name}, bölgenizde yaşanan ${disasterWord} sebebiyle geçmiş olsun dileklerimizi iletiyoruz. Liman Bankası olarak yanınızdayız. Mevcut ${c.loanType} borcunuz için <strong>${c.months} faizsiz erteleme planınız</strong> hazırlanmıştır.<br><br>
          <div style="background:rgba(255,255,255,0.08);padding:7px 10px;border-radius:8px;border-left:3px solid #F59E0B;font-size:11px;margin:4px 0">
            <strong>🛡️ Onay için Liman Mobil uygulamasını açın.</strong>
          </div>
          <div style="font-size:10.5px;color:#94A3B8;margin-top:6px;line-height:1.4">
            Uygulamayı açamıyorsanız bu mesaja <strong>EVET</strong> yazarak yanıtlayabilir veya <strong>0850 222 0 600</strong> Afet Destek Masamızı arayabilirsiniz.
          </div>
          <div style="font-size:9.5px;color:rgba(255,255,255,0.6);margin-top:8px;text-align:right">
            Liman Bank B002
          </div>
        `;
      }

      // Telefon saati
      const clockEl = document.getElementById('phone-clock');
      if (clockEl) {
        const d = new Date();
        clockEl.innerText = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      }

      // 3. Bildirimi göster ve ses çal
      if (toastEl) {
        toastEl.style.display = 'block';
        playSmsChime();
      }

      // 4. Operasyon Event Feed'ine SMS logu ekle (Sıfır Link vurgulu)
      const now = new Date().toTimeString().split(' ')[0];
      eventLogs.unshift({
        time: now,
        topic: 'sms.dispatched',
        desc: `SMS İLETİLDİ (Sıfır Link / Anti-Phishing) ➔ Sayın ${c.name} (${phone}): "Onay için Liman Mobil uygulamasını açın veya EVET yazarak yanıtlayın..."`
      });
      renderEvents();

      // Otomatik kapanma zamanlayıcısı (15 saniye)
      if (smsToastTimer) clearTimeout(smsToastTimer);
      smsToastTimer = setTimeout(() => {
        dismissSmsToast();
      }, 15000);
    }
    window.showSmsNotification = showSmsNotification;

    function dismissSmsToast() {
      const toastEl = document.getElementById('phone-sms-toast');
      if (toastEl) toastEl.style.display = 'none';
      if (smsToastTimer) {
        clearTimeout(smsToastTimer);
        smsToastTimer = null;
      }
    }
    window.dismissSmsToast = dismissSmsToast;

    function openPhoneModal() {
      const m = document.getElementById('modal-phone-device');
      if (m) {
        m.style.display = 'flex';
        const clockEl = document.getElementById('phone-clock');
        if (clockEl) {
          const d = new Date();
          clockEl.innerText = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        }
        const inputEl = document.getElementById('phone-sms-reply-input');
        if (inputEl) {
          setTimeout(() => inputEl.focus(), 200);
        }
      }
    }
    window.openPhoneModal = openPhoneModal;

    function closePhoneModal() {
      const m = document.getElementById('modal-phone-device');
      if (m) m.style.display = 'none';
    }
    window.closePhoneModal = closePhoneModal;

    // ── İKİ YÖNLÜ SMS YANIT MOTORU (UYGULAMAYI AÇAMAYAN MÜŞTERİ İÇİN EVET ONAYI) ──
    function sendSmsReply(customText = null) {
      const inputEl = document.getElementById('phone-sms-reply-input');
      const text = (customText !== null ? customText : (inputEl ? inputEl.value : '')).trim();
      if (!text) {
        if (inputEl) inputEl.focus();
        return;
      }

      if (inputEl) inputEl.value = '';

      const custKey = selectedCustKey || 'selma';
      const c = CUSTOMERS[custKey] || CUSTOMERS['selma'];
      const stream = document.getElementById('phone-msg-stream');
      const nowTime = new Date().toTimeString().split(' ')[0].substring(0, 5);

      // 1. Müşterinin Giden SMS Baloncuğu
      if (stream) {
        const outDiv = document.createElement('div');
        outDiv.className = 'phone-bubble outgoing';
        outDiv.innerHTML = `
          ${text}
          <div style="font-size:9px;color:rgba(255,255,255,0.7);text-align:right;margin-top:2px">${nowTime} ✓✓</div>
        `;
        stream.appendChild(outDiv);
        stream.scrollTop = stream.scrollHeight;
      }

      const upper = text.toUpperCase();

      // 2. Müşteri "EVET" / "ONAY" yanıtı verdiyse ➔ ANINDA ERTELEME ONAYI
      if (upper.includes('EVET') || upper.includes('ONAY') || upper.includes('KABUL') || upper === 'E') {
        setTimeout(() => {
          if (stream) {
            const replyDiv = document.createElement('div');
            replyDiv.className = 'phone-bubble confirmed';
            replyDiv.innerHTML = `
              <div style="display:flex;align-items:center;gap:5px;font-weight:700;margin-bottom:4px">
                <span>✓</span> LIMAN BANK ONAY MERKEZİ
              </div>
              Sayın ${c.name}, <strong>"EVET"</strong> SMS onayınız sistemimize başarıyla ulaşmıştır.<br><br>
              Mevcut ${c.loanType} borcunuz için <strong>${c.months} faizsiz kredi ertelemeniz</strong> onaylanmış ve yürürlüğe girmiştir.<br><br>
              <div style="font-size:9.5px;color:#A7F3D0;line-height:1.4">
                Yeni ödeme planınızı ve dekontunuzu dilediğiniz zaman <strong>Liman Mobil</strong> uygulamasından görüntüleyebilirsiniz. Geçmiş olsun dileklerimizle. B002
              </div>
            `;
            stream.appendChild(replyDiv);
            stream.scrollTop = stream.scrollHeight;
          }

          // Veritabanı ve Müşteri Durumunu Güncelle
          c.approved = true;
          c.loanStatus = 'ONAYLANDI';
          c.updatedAt = new Date().toISOString().replace('T', ' ').substring(0, 19);

          const db = (typeof LimanDB !== 'undefined') ? LimanDB : window.LimanDB;
          if (db) {
            db.recordNewCustomer(custKey, c);
            db.recordTransaction({
              type: 'SMS_İKİ_YÖNLÜ_ONAY',
              customerId: c.id || ('cust_' + custKey),
              customerName: c.name,
              amount: c.total || '0 ₺',
              channel: 'SMS Gateway (İki Yönlü "EVET" Yanıtı)',
              note: `Müşteri SMS bağlantısı olmaksızın doğrudan "EVET" SMS yanıtı vererek ${c.months} ertelemeyi onayladı.`
            });
          }

          // FastAPI Backend Varsa Bildir
          if (window.LimanAPI && LimanAPI.isOnline()) {
            LimanAPI.approvePlan(c.id || ('cust_' + custKey));
          }

          // Canlı Operasyon Logu
          const nowFull = new Date().toTimeString().split(' ')[0];
          eventLogs.unshift({
            time: nowFull,
            topic: 'sms.two_way.approved',
            desc: `İKİ YÖNLÜ SMS İLE ONAYLANDI ➔ Sayın ${c.name} "EVET" yazarak yanıtladı. ${c.months} faizsiz erteleme anında yürürlüğe girdi.`
          });
          renderEvents();

          if (typeof refreshDatabaseIframe === 'function') refreshDatabaseIframe();
          if (typeof renderCustomerLoanCards === 'function') renderCustomerLoanCards();
          playSmsChime();

          if (typeof showToast === 'function') {
            showToast(`✅ SMS İLE ONAYLANDI: Sayın ${c.name} "EVET" yanıtıyla ertelemeyi başlattı!`);
          }
        }, 650);

      } else {
        // Müşteri soru veya farklı bir talep ilettiyse ➔ Temsilciye Devir
        setTimeout(() => {
          if (stream) {
            const replyDiv = document.createElement('div');
            replyDiv.className = 'phone-bubble new';
            replyDiv.style.background = '#1E293B';
            replyDiv.style.borderLeft = '3px solid #38BDF8';
            replyDiv.innerHTML = `
              <div style="font-weight:700;margin-bottom:4px;color:#38BDF8">LIMAN BANK DESTEK</div>
              Sayın ${c.name}, mesajınız (<em>"${escapeHtml(text)}"</em>) Afet Masamıza iletilmiştir. Özel durumunuz nedeniyle müşteri temsilcimiz sizi en kısa sürede arayacaktır.<br><br>
              <span style="font-size:10px;color:#94A3B8">Acil Afet Masası: <strong>0850 222 0 600</strong> B002</span>
            `;
            stream.appendChild(replyDiv);
            stream.scrollTop = stream.scrollHeight;
          }

          c.escalated = true;
          c.loanStatus = 'TEMSİLCİDE';
          const db = (typeof LimanDB !== 'undefined') ? LimanDB : window.LimanDB;
          if (db) db.recordNewCustomer(custKey, c);

          const nowFull = new Date().toTimeString().split(' ')[0];
          eventLogs.unshift({
            time: nowFull,
            topic: 'sms.inbound.escalated',
            desc: `GELEN SMS TEMSİLCİYE DEVREDİLDİ ➔ Sayın ${c.name} ("${text}") ➔ Afet Çağrı Masasına aktarıldı.`
          });
          renderEvents();
        }, 650);
      }
    }
    window.sendSmsReply = sendSmsReply;

    function quickSendSmsReply(word) {
      sendSmsReply(word);
    }
    window.quickSendSmsReply = quickSendSmsReply;

    function quickCallAfetDesk() {
      const custKey = selectedCustKey || 'selma';
      const c = CUSTOMERS[custKey] || CUSTOMERS['selma'];
      closePhoneModal();

      if (typeof showToast === 'function') {
        showToast('📞 0850 222 0 600 Liman Bankası Afet Çağrı Masası aranıyor...');
      }

      setTimeout(() => {
        alert(`📞 LİMAN BANKASI AFET KRİZ MASASI (0850 222 0 600)\n\nSayın ${c.name},\nÇağrınız öncelikli afet hattımıza bağlanmıştır. Müşteri temsilcimiz kimlik doğrulamanızı tamamlayarak ${c.months} erteleme işleminizi telefon üzerinden güvenle onaylayacaktır.`);
        openEscalateFromChat();
      }, 400);
    }
    window.quickCallAfetDesk = quickCallAfetDesk;

    function escapeHtml(str) {
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    window.escapeHtml = escapeHtml;

    function handleSmsOpenAction() {
      dismissSmsToast();
      closePhoneModal();
      switchTab('customer');
      const loanCard = document.getElementById('bank-loan-card');
      if (loanCard) {
        loanCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        loanCard.style.outline = '2px solid var(--ing-primary)';
        setTimeout(() => { loanCard.style.outline = 'none'; }, 2000);
      }
      setTimeout(() => {
        openAfetFlowModal(1);
      }, 300);
    }
    window.handleSmsOpenAction = handleSmsOpenAction;

    // CANLI EVENT LOGLARI
    const eventLogs = [
      { time: '04:17:01', topic: 'disaster.declared', desc: 'M7.4 Kahramanmaraş Depremi AFAD/Kandilli akışından alındı (simülasyon)' },
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
    function switchLoginMode(mode, targetRole) {
      const isStaffReg = (mode === 'register' && targetRole === 'staff');
      const isCustReg = (mode === 'register' && targetRole !== 'staff');

      document.getElementById('btn-login-tab')?.classList.toggle('active', mode === 'login');
      document.getElementById('btn-register-tab')?.classList.toggle('active', isCustReg);
      document.getElementById('btn-staff-reg-tab')?.classList.toggle('active', isStaffReg);

      document.getElementById('form-login-box').style.display = mode === 'login' ? 'block' : 'none';
      document.getElementById('form-register-box').style.display = mode === 'register' ? 'block' : 'none';
      document.getElementById('login-error-msg').style.display = 'none';

      if (mode === 'register') {
        const roleToSelect = targetRole || 'customer';
        const radio = document.querySelector(`input[name="reg-account-role"][value="${roleToSelect}"]`);
        if (radio) {
          radio.checked = true;
          toggleRegRoleFields(roleToSelect);
        }
        setTimeout(() => {
          const container = document.getElementById('reg-scroll-container');
          if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
        }, 50);
      }
    }
    window.switchLoginMode = switchLoginMode;

    // KAYIT ROL DEĞİŞİMİ (MÜŞTERİ / ÇALIŞAN / ADMİN)
    function toggleRegRoleFields(role) {
      const staffFields = document.getElementById('reg-staff-admin-fields');
      const custFields = document.getElementById('reg-customer-specific-fields');
      const submitBtn = document.getElementById('btn-submit-register');
      const staffIdInput = document.getElementById('reg-staff-id');

      if (role === 'customer') {
        if (staffFields) staffFields.style.display = 'none';
        if (custFields) custFields.style.display = 'block';
        if (submitBtn) submitBtn.innerHTML = '🧡 Limanlı Ol ve Hesabı Başlat';
        if (staffIdInput) staffIdInput.required = false;
      } else if (role === 'staff') {
        if (staffFields) staffFields.style.display = 'block';
        if (custFields) custFields.style.display = 'none';
        if (submitBtn) submitBtn.innerHTML = '🏦 Çalışan Hesabı Oluştur ve Operasyona Başla';
        if (staffIdInput) staffIdInput.required = true;
      } else if (role === 'admin') {
        if (staffFields) staffFields.style.display = 'block';
        if (custFields) custFields.style.display = 'none';
        if (submitBtn) submitBtn.innerHTML = '⚙️ Sistem Admin Hesabı Oluştur';
        if (staffIdInput) staffIdInput.required = true;
      }
    }
    window.toggleRegRoleFields = toggleRegRoleFields;

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

    // LİMANLI OL (KAYIT OL) FORMU (MÜŞTERİ, ÇALIŞAN VEYA ADMİN)
    function handleFormRegister(e) {
      e.preventDefault();
      const roleRadio = document.querySelector('input[name="reg-account-role"]:checked');
      const regRole = roleRadio ? roleRadio.value : 'customer';

      const name = document.getElementById('reg-name').value.trim();
      const surname = document.getElementById('reg-surname').value.trim();
      const tckn = document.getElementById('reg-tckn').value.trim();
      const age = parseInt(document.getElementById('reg-age').value) || 35;
      const city = document.getElementById('reg-city').value;
      const email = document.getElementById('reg-email').value.trim();
      const password = document.getElementById('reg-password').value;
      const fullName = `${name} ${surname}`;
      const now = new Date().toTimeString().split(' ')[0];

      // 1. BANKA ÇALIŞANI VEYA SİSTEM ADMİN KAYDI
      if (regRole === 'staff' || regRole === 'admin') {
        const staffId = document.getElementById('reg-staff-id')?.value.trim() || ('LB-' + Math.floor(1000 + Math.random() * 9000));
        const staffDept = document.getElementById('reg-staff-dept')?.value || 'Operasyon';
        const roleLabel = (regRole === 'admin') ? 'Sistem Yöneticisi (Admin)' : 'Banka Operasyon Çalışanı';

        eventLogs.unshift({
          time: now,
          topic: regRole === 'admin' ? 'admin.registered' : 'staff.registered',
          desc: `YENİ ${regRole.toUpperCase()}: ${fullName} (Sicil: ${staffId}, Birim: ${staffDept}) sisteme yetkilendirildi.`
        });
        renderEvents();

        const auditBox = document.getElementById('audit-log-box');
        if (auditBox) {
          auditBox.innerHTML = `<div>[${now}] <strong style="color:var(--status-blue)">auth.register.${regRole}</strong> → ${fullName} (Sicil: ${staffId}, Birim: ${staffDept}, 2FA: Aktif)</div>` + auditBox.innerHTML;
        }

        // FastAPI Backend'e Kaydet (SQLite staff_users tablosu)
        if (window.LimanAPI && LimanAPI.isOnline()) {
          LimanAPI.registerStaff({
            name: name,
            surname: surname,
            tckn: tckn,
            age: age,
            city: city,
            email: email,
            role: regRole,
            staff_id: staffId,
            department: staffDept
          }).then(res => {
            if (res) console.log(`✅ [FastAPI :8000] ${regRole.toUpperCase()} kaydı SQLite veritabanına (staff_users) yazıldı:`, res);
          });
        }

        // Yerel LimanDB'ye de kaydet (localStorage senkronizasyonu için)
        const db = (typeof LimanDB !== 'undefined') ? LimanDB : window.LimanDB;
        if (db) {
          const staffKey = `staff_${Date.now()}`;
          const staffRecord = {
            id: `staff_${tckn.slice(0, 4)}_${Math.floor(100 + Math.random() * 900)}`,
            name: fullName,
            email: email,
            age: age,
            city: city,
            loanType: 'N/A (Çalışan)',
            installment: '—',
            total: '—',
            months: '—',
            dask: 'N/A',
            priority: regRole === 'admin' ? 'Sistem Admin' : 'Banka Çalışanı',
            role: regRole,
            staffId: staffId,
            department: staffDept,
            msg: `${roleLabel} olarak sisteme yetkilendirildi.`
          };
          CUSTOMERS[staffKey] = staffRecord;
          db.recordNewCustomer(staffKey, staffRecord);
        }
        refreshDatabaseIframe();

        alert(`Tebrikler Sayın ${fullName}!\n\n${roleLabel} kaydınız başarıyla oluşturuldu.\nSicil No: ${staffId}\nBirim: ${staffDept}\n\nOperasyon Konsolu ve Yönetim Paneline yönlendiriliyorsunuz.`);
        loginAs(regRole, null);
        return;
      }

      // 2. MÜŞTERİ (AFETZEDE / VATANDAŞ) KAYDI
      const loanType = document.getElementById('reg-loan').value;
      const daskVal = document.getElementById('reg-dask').value === 'true';
      const isHassas = document.getElementById('reg-hassas').checked || age >= 65;

      const custKey = 'user_' + Date.now();

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
      const custList = typeof CUSTOMERS !== 'undefined' ? CUSTOMERS : (window.CUSTOMERS || {});
      Object.keys(custList).forEach(k => {
        if (k.startsWith('user_')) {
          injectCustomerCard(k, custList[k]);
        }
      });
    }

    // GİRİŞ / ROL SEÇİMİ
    function loginAs(role, custKey) {
      currentRole = role;
      document.getElementById('login-view').style.display = 'none';

      applyRoleUIVisibility(role);

      const adminWelcomeTitle = document.getElementById('admin-welcome-title');
      const adminWelcomeSub = document.getElementById('admin-welcome-sub');
      const adminWelcomeIcon = document.getElementById('admin-welcome-icon');

      if (role === 'customer') {
        selectedCustKey = custKey || 'selma';
        const c = CUSTOMERS[selectedCustKey] || CUSTOMERS['selma'];
        document.getElementById('active-user-badge').innerText = `👤 ${c.name}`;
        updateCustomerView();
        switchTab('customer');
      } else if (role === 'admin') {
        document.getElementById('active-user-badge').innerText = '⚙️ Sistem Admin';
        if (adminWelcomeTitle) adminWelcomeTitle.innerHTML = 'Hoş Geldiniz, Sistem Yöneticisi ⚙️';
        if (adminWelcomeSub) adminWelcomeSub.innerText = 'Liman Bankası Otonom Afet Koordinasyonu & Karar Konsolu (Root / Tam Yetki)';
        if (adminWelcomeIcon) adminWelcomeIcon.innerText = '⚙️';
        updateCustomerView();
        switchTab('dashboard');
      } else {
        document.getElementById('active-user-badge').innerText = '🏦 Banka Çalışanı';
        if (adminWelcomeTitle) adminWelcomeTitle.innerHTML = 'Hoş Geldiniz, Banka Yetkilisi 🏦';
        if (adminWelcomeSub) adminWelcomeSub.innerText = 'Liman Bankası Afet Masası Operasyon & İnceleme Konsolu';
        if (adminWelcomeIcon) adminWelcomeIcon.innerText = '🏦';
        updateCustomerView();
        switchTab('dashboard');
      }
    }

    function applyRoleUIVisibility(role) {
      const isCust = (role === 'customer');

      // 1. Operatör sekmelerini müşteri rolünde gizle
      const dashTab = document.getElementById('tab-dash-btn');
      const agentTab = document.getElementById('tab-agent-btn');
      const auditTab = document.getElementById('tab-audit-btn');
      const dbTab = document.getElementById('tab-database-btn');
      if (dashTab) dashTab.style.display = isCust ? 'none' : 'inline-block';
      if (agentTab) agentTab.style.display = isCust ? 'none' : 'inline-block';
      if (auditTab) auditTab.style.display = isCust ? 'none' : 'inline-block';
      if (dbTab) dbTab.style.display = isCust ? 'none' : 'inline-block';

      // 2. Sağ üstteki DB Aç ve Simülatör butonlarını müşteri rolünde gizle
      const btnHeaderDb = document.getElementById('btn-header-db');
      const btnHeaderSim = document.getElementById('btn-header-sim');
      if (btnHeaderDb) btnHeaderDb.style.display = isCust ? 'none' : 'inline-flex';
      if (btnHeaderSim) btnHeaderSim.style.display = isCust ? 'none' : 'inline-flex';

      // 3. Simülatör barı açıksa müşteri rolünde kapat
      const simBar = document.getElementById('disaster-ctrl-bar');
      if (simBar && isCust) simBar.style.display = 'none';

      // 4. Afet düşen banner'ını müşteri ekranında sade tut veya gerekirse gizle
      const dropBanner = document.getElementById('disaster-drop-banner');
      if (dropBanner && isCust) dropBanner.style.display = 'none';
    }
    window.applyRoleUIVisibility = applyRoleUIVisibility;

    function openLogin() {
      document.getElementById('login-view').style.display = 'flex';
    }

    // SEKME DEĞİŞTİRME
    function switchTab(tab) {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      if (tab === 'dashboard') document.getElementById('tab-dash-btn')?.classList.add('active');
      if (tab === 'customer') document.getElementById('tab-cust-btn')?.classList.add('active');
      if (tab === 'donation') document.getElementById('tab-donation-btn')?.classList.add('active');
      if (tab === 'agent') document.getElementById('tab-agent-btn')?.classList.add('active');
      if (tab === 'audit') document.getElementById('tab-audit-btn')?.classList.add('active');
      if (tab === 'database') document.getElementById('tab-database-btn')?.classList.add('active');

      const vDash = document.getElementById('view-dashboard');
      if (vDash) vDash.style.display = tab === 'dashboard' ? 'block' : 'none';
      const vCust = document.getElementById('view-customer');
      if (vCust) vCust.style.display = tab === 'customer' ? 'block' : 'none';
      const vDonation = document.getElementById('view-donation');
      if (vDonation) {
        vDonation.style.display = tab === 'donation' ? 'block' : 'none';
        if (tab === 'donation') {
          const balEl = document.getElementById('donation-tab-balance');
          if (balEl && typeof userBankingState !== 'undefined') {
            balEl.innerText = formatTl(userBankingState.checkingBalance);
          }
        }
      }
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

      // Rol bazlı karşılama metni ve önizleme rozeti güncellemesi
      const greetingTitleEl = document.getElementById('banking-greeting-title');
      const rolePreviewBadge = document.getElementById('bank-role-preview-badge');

      if (currentRole === 'admin') {
        if (greetingTitleEl) {
          greetingTitleEl.innerHTML = `⚙️ Sistem Admin · Müşteri Önizleme: <span id="bank-cust-name">${c.name}</span>`;
        }
        if (rolePreviewBadge) {
          rolePreviewBadge.style.display = 'inline-block';
          rolePreviewBadge.innerText = '⚙️ Yönetici Önizleme Modu';
          rolePreviewBadge.style.color = '#60A5FA';
          rolePreviewBadge.style.borderColor = 'rgba(59,130,246,0.3)';
          rolePreviewBadge.style.background = 'rgba(59,130,246,0.15)';
        }
      } else if (currentRole === 'staff') {
        if (greetingTitleEl) {
          greetingTitleEl.innerHTML = `🏦 Banka Çalışanı · Müşteri Dosyası: <span id="bank-cust-name">${c.name}</span>`;
        }
        if (rolePreviewBadge) {
          rolePreviewBadge.style.display = 'inline-block';
          rolePreviewBadge.innerText = '🏦 Yetkili İnceleme Modu';
          rolePreviewBadge.style.color = '#34D399';
          rolePreviewBadge.style.borderColor = 'rgba(16,185,129,0.3)';
          rolePreviewBadge.style.background = 'rgba(16,185,129,0.15)';
        }
      } else {
        if (greetingTitleEl) {
          greetingTitleEl.innerHTML = `İyi Günler, Sayın <span id="bank-cust-name">${c.name}</span> 👋`;
        }
        if (rolePreviewBadge) {
          rolePreviewBadge.style.display = 'none';
        }
      }

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

      const normalInstEl = document.getElementById('loan-normal-inst');
      if (normalInstEl) normalInstEl.innerText = c.installment;

      const normalBanner = document.getElementById('bank-normal-banner');
      const ribbon = document.getElementById('bank-afet-ribbon');
      const loanNormalBox = document.getElementById('bank-loan-normal-box');
      const loanAfetBox = document.getElementById('bank-loan-afet-box');
      const quickAfetBtn = document.getElementById('btn-quick-afet-flow');
      const loanDefEl = document.getElementById('bank-loan-total-deferred');
      const loanFooterLeft = document.getElementById('bank-loan-footer-left');

      if (!isDisasterActive) {
        if (normalBanner) normalBanner.style.display = 'flex';
        if (ribbon) ribbon.style.display = 'none';
        if (loanNormalBox) loanNormalBox.style.display = 'block';
        if (loanAfetBox) loanAfetBox.style.display = 'none';
        if (quickAfetBtn) quickAfetBtn.style.display = 'none';
        if (loanFooterLeft) loanFooterLeft.innerText = 'Sonraki Taksit: 15 Kasım 2026';
        if (loanDefEl) loanDefEl.innerText = 'Otomatik Ödeme Aktif ✓';
      } else {
        if (normalBanner) normalBanner.style.display = 'none';
        if (ribbon) ribbon.style.display = 'flex';
        if (loanNormalBox) loanNormalBox.style.display = 'none';
        if (loanAfetBox) loanAfetBox.style.display = 'block';
        if (quickAfetBtn) quickAfetBtn.style.display = 'flex';
        if (loanDefEl) loanDefEl.innerText = `Ötelenen: ${c.total}`;
        if (loanFooterLeft) loanFooterLeft.innerText = `Afet Kapsamı: ${c.city}`;

        const loanMonthsDesc = document.getElementById('bank-loan-months-desc');
        if (loanMonthsDesc) loanMonthsDesc.innerText = `${c.months} erteleme talebi seçeneği`;

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
            ribbonMsg.innerHTML = `<strong>${c.loanType}</strong> için <strong>${c.months} erteleme talebiniz</strong> alındı. Banka personeli nihai kontrolü sonrası SMS ile bilgilendirileceksiniz.`;
          }
          if (btnRibbon) btnRibbon.innerText = '📋 Detayları Görüntüle';
          if (btnStartFlow) btnStartFlow.innerText = '📋 Erteleme Detaylarını İncele';

          if (ribbonActions) {
            ribbonActions.innerHTML = `
              <span style="font-size:12px;color:var(--status-green);font-weight:600;padding:6px 12px;background:rgba(46,158,104,0.15);border-radius:6px;border:1px solid rgba(46,158,104,0.3)">
                ✓ Onaylandı (Personel İncelemesinde)
              </span>
              <button class="btn-decision-optout" style="padding:7px 12px;font-size:11.5px" onclick="revokeApproval()" title="Onayı geri alıp normal takvime geç">
                ↩ Onayı Geri Al
              </button>
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
                ✓ Onaylandı
              </span>
              <button class="btn-decision-optout" style="padding:6px 8px;font-size:11px" onclick="revokeApproval()">
                ↩ Geri Al
              </button>
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
            ribbonMsg.innerHTML = `Erteleme hakkınızı şimdilik kullanmadınız. Afet Destek Paketi haklarınız afet süresince saklıdır; dilediğiniz an tekrar erteleme talebinde bulunabilirsiniz.`;
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
            ribbonMsg.innerHTML = `Bölgenizde yaşanan afet sebebiyle <strong id="ribbon-loan-type">${c.loanType}</strong> için <strong><span id="ribbon-months">${c.months}</span> erteleme talebi taslağınız</strong> hazırlandı.`;
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
      if (pBelgeler) pBelgeler.innerHTML = (c.docs || []).map(d => `<li>${d}</li>`).join('');

      const pPriority = document.getElementById('cust-priority-tag');
      if (pPriority) pPriority.innerText = c.priority || '';
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
        subHdr.innerText = `Bağlam Yüklendi: ${c.name} · ${c.loanType} · ${c.months} Erteleme Talebi (${c.installment}/ay)`;
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
            text: `Merhaba Sayın <strong>${c.name}</strong>, geçmiş olsun. ${c.city} bölgesindeki afet sebebiyle adınıza hazırlanan <strong>${c.loanType}</strong> için <strong>${c.months} erteleme talebi taslağınız</strong> (aylık ${c.installment} taksit, toplam ötelenen ${c.total}) ve DASK/hasar durumunuz önümde açık.<br><br>Sizi tekrar soruya boğmadan yardımcı olmak için buradayım. Erteleme koşulları, evrak teslim süreci veya ödeme takviminiz hakkında aklınıza takılan her şeyi sorabilirsiniz.`
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
      syncChatBottomActions();
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
          desc: `Ajan C (Sohbet): "${text.slice(0, 28)}..." sorusunu politika sınırları (varsayım) ve yumuşatılmış dille yanıtladı.`
        });
        renderEvents();

        c.steps.push({
          tool: 'soru_cevapla',
          agent: 'Ajan C (Sohbet Ajanı)',
          in: `{"soru": "${text.replace(/"/g, '')}", "baglam": "${c.loanType} - ${c.months}"}`,
          out: `{"yanit_durumu": "VALIDATED", "guardrail": "ERTELEME_TALEBI_VE_SEFFAF"}`,
          ms: 45,
          desc: `Müşteri sorusu kurum afet ilkeleri ve politika sınırlarıyla (varsayım) yanıtlandı.`
        });

        renderChatMessages();
      }, 400);
    }

    function generateAgentChatReply(query, c) {
      const q = query.toLowerCase();

      if (q.includes('faiz') || q.includes('masraf') || q.includes('ceza') || q.includes('maliyet') || q.includes('ekstra')) {
        return `Bankamızın afet politikası (varsayım) kapsamında hazırlanan bu <strong>erteleme talebi</strong> taslağında taksitlerinizin vade sonuna ötelenmesi hedeflenmektedir.<br><br>Süreç boyunca olağan dışı ek komisyon veya ceza yansıtılmaması esastır. Başvurunuz personel nihai kontrolünden geçerken detaylı geri ödeme planı ve olası maliyet dökümü SMS/Mobil onayınıza sunulacaktır.`;
      }

      if (q.includes('dask') || q.includes('sigorta') || q.includes('poliçe') || q.includes('hasar')) {
        if (c.loanType === 'Konut Kredisi' || c.loanType.includes('Konut')) {
          if (c.dask && c.dask.includes('Var')) {
            return `Konut kredinize bağlı <strong>DASK poliçeniz sistemimizde kayıtlı görünmektedir</strong>. Erteleme talebi oluşturmanız için ek bir sigorta işlemi şartı aranmaz. Banka yetkilimiz onay aşamasında poliçe geçerliliğini teyit edecektir.`;
          } else {
            return `Konutunuz için aktif bir DASK poliçesi sistemimizde otomatik olarak doğrulanamamıştır. Ancak bu durum <strong>erteleme talebi oluşturmanıza genellikle engel teşkil etmez</strong>; banka personeli nihai kontrolde durumunuzu ve afet şartlarını özel olarak değerlendirir. Dilerseniz aşağıdaki <strong>[☎ Temsilci Arasın]</strong> butonuna tıklayarak uzmanımızla doğrudan görüşebilirsiniz.`;
          }
        } else {
          return `Kullandığınız <strong>${c.loanType}</strong> için DASK zorunluluğu bulunmamaktadır. Afet bölgesi teyidi yeterlidir.`;
        }
      }

      if (q.includes('evrak') || q.includes('belge') || q.includes('zaman') || q.includes('teslim') || q.includes('son gün')) {
        return `Afet şartlarında mağduriyet yaşamamanız için evrak tamamlama süreniz <strong>60 gün</strong> olarak tanımlanmıştır.<br><br>Gerekli evraklar: <em>${c.docs.map(d => d.replace(/<[^>]*>?/gm, '')).join(', ')}</em>.<br>Evrakları bugün hemen teslim etmek zorunda değilsiniz. Talebinizi şimdi ilettiğinizde inceleme süreci başlar; belgelerinizi 60 gün içinde Liman Mobil veya şubelerimiz üzerinden ulaştırabilirsiniz.`;
      }

      if (q.includes('kredi not') || q.includes('sicil') || q.includes('puan') || q.includes('kkb') || q.includes('findeks') || q.includes('yasal takip')) {
        return `Afet kapsamında onaylanan erteleme talepleri BDDK ve KKB sistemlerine "Afet Sebebiyle Yapılandırma/Erteleme" koduyla bildirilir; bu sebeple olağan gecikme veya yasal takip muamelesi görmemesi esastır.`;
      }

      if (q.includes('uzat') || q.includes('6 ay') || q.includes('sure') || q.includes('daha fazla')) {
        return `Hazırlanan taslak <strong>${c.months}</strong> erteleme talebi içermektedir. Politika üst sınırı (varsayım) azami 6 aydır. Bölgedeki durum ve ihtiyacınıza göre <strong>[☎ Temsilci Arasın]</strong> butonunu kullanarak sürenin uzatılmasını uzmanımıza iletebilirsiniz.`;
      }

      if (q.includes('istemiyorum') || q.includes('vazgeç') || q.includes('normal') || q.includes('ödemek')) {
        return `Erteleme tamamen sizin takdirinizdedir, hiçbir zorunluluk yoktur. Mevcut ödeme takviminize devam etmek isterseniz hemen aşağıdaki <strong>[✕ Vazgeç (Normal Öde)]</strong> butonuna basabilirsiniz. Afet destek haklarınız afet süresince saklı kalır.`;
      }

      if (q.includes('temsilci') || q.includes('ara') || q.includes('telefon') || q.includes('insan')) {
        return `Özel durumunuzu bir bankacıyla detaylandırmak isterseniz aşağıdaki <strong>[☎ Temsilci Arasın]</strong> butonuna tıklayabilirsiniz. Afet Masası temsilcimiz kayıtlı telefonunuzdan sizi arayacaktır.`;
      }

      // Genel / Varsayılan Bağlamsal Yanıt
      return `Sayın <strong>${c.name}</strong>, ${c.loanType} borcunuz (aylık ${c.installment}, ötelenen toplam ${c.total}) afet destek paketi kapsamındadır.<br><br><strong>Karar tamamen sizdedir:</strong><br>• Dilerseniz <strong>[✓ Planı Onayla]</strong> ile erteleme talebini hemen iletebilirsiniz,<br>• <strong>[☎ Temsilci Arasın]</strong> ile özel durumunuzu uzmanımızla görüşebilirsiniz,<br>• Ya da <strong>[✕ Vazgeç (Normal Öde)]</strong> seçerek mevcut takviminizde kalabilirsiniz.`;
    }

    // SOHBETTEN KARARA BAĞLAMA FONKSİYONLARI (3 SEÇENEK)
    function approvePlanFromChat() {
      closeChatAgent();
      approvePlan();
    }

    function syncChatBottomActions() {
      const c = CUSTOMERS[selectedCustKey];
      const box = document.getElementById('chat-bottom-actions-box');
      if (!box || !c) return;

      if (c.approved) {
        box.innerHTML = `
          <button class="btn-decision-approve" style="padding:7px 12px;font-size:12px;background:#15803d;cursor:default;opacity:0.9" disabled>
            ✓ Onaylandı
          </button>
          <button class="btn-decision-optout" style="padding:7px 12px;font-size:11.5px" onclick="revokeApprovalFromChat()">
            ↩ Onayı Geri Al
          </button>
          <button class="btn-decision-escalate" style="padding:7px 12px;font-size:12px" onclick="openEscalateFromChat()">
            ☎ Temsilci Arasın
          </button>
        `;
      } else {
        box.innerHTML = `
          <button class="btn-decision-approve" id="btn-chat-approve" style="padding:7px 14px;font-size:12px" onclick="approvePlanFromChat()">
            ✓ Planı Onayla
          </button>
          <button class="btn-decision-escalate" style="padding:7px 12px;font-size:12px" onclick="openEscalateFromChat()">
            ☎ Temsilci Arasın
          </button>
          <button class="btn-decision-optout" style="padding:7px 12px;font-size:11.5px" onclick="optOutPlanFromChat()">
            ✕ Vazgeç (Normal Öde)
          </button>
        `;
      }
    }

    function revokeApprovalFromChat() {
      revokeApproval();
      syncChatBottomActions();
    }

    function revokeApproval() {
      const c = CUSTOMERS[selectedCustKey];
      if (!c) return;
      c.approved = false;
      c.declined = false;
      c.escalated = false;

      const now = new Date().toTimeString().split(' ')[0];
      eventLogs.unshift({
        time: now,
        topic: 'plan.approval_revoked',
        desc: `${c.name} (${c.id}) verdiği onayı geri aldı → Taslak bekleme durumuna döndü.`
      });
      renderEvents();

      const auditBox = document.getElementById('audit-log-box');
      if (auditBox) {
        auditBox.innerHTML = `<div>[${now}] <strong style="color:var(--status-amber)">plan.approval_revoked</strong> → ${c.name} onayı geri aldı</div>` + auditBox.innerHTML;
      }

      updateCustomerView();
      syncChatBottomActions();
      refreshDatabaseIframe();

      alert(`Sayın ${c.name}, erteleme onayınız geri alınmıştır. Talebinizi dilediğiniz zaman yeniden onaylayabilir veya temsilci talep edebilirsiniz.`);
    }
    window.revokeApproval = revokeApproval;
    window.revokeApprovalFromChat = revokeApprovalFromChat;
    function openEscalateFromChat() {
      closeChatAgent();
      openEscalate();
    }

    function optOutPlanFromChat() {
      closeChatAgent();
      optOutPlan();
    }

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
      syncChatBottomActions();

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
      if (!isDisasterActive) {
        setDisasterMode(true, { showAlert: false });
      }

      // Telefona geçmiş olsun ve erteleme SMS'i gönder
      setTimeout(() => {
        showSmsNotification({ isFlood: true, custKey: 'dursun' });
      }, 500);

      // Çoklu sekme ve diğer pencerelere canlı yayınla
      broadcastDisasterState(true, {
        tur: 'sel',
        isFlood: true,
        custKey: 'dursun'
      });

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

    // ════════════════════════════════════════════════════════════════
    // KURAL TABANLI MESAJ DENETİMİ MOTORU (DETERMİNİSTİK KELİME TARAMASI)
    // ════════════════════════════════════════════════════════════════
    const AUDIT_FORBIDDEN_RULES = ['faizsiz', 'ücretsiz', 'garanti', 'kesin', 'mutlaka'];

    function runRuleBasedMessageAudit() {
      let totalCount = 258;
      const countEl = document.getElementById('stat-etkilenen');
      if (countEl && parseInt(countEl.innerText)) {
        totalCount = parseInt(countEl.innerText);
      }

      const textsToScan = [];
      if (typeof CUSTOMERS !== 'undefined') {
        Object.entries(CUSTOMERS).forEach(([k, c]) => {
          if (c.msg) textsToScan.push({ src: `${c.name} Mesajı`, text: c.msg });
          if (c.steps) {
            c.steps.forEach(st => {
              if (st.out) textsToScan.push({ src: `${c.name} ${st.tool} Çıktısı`, text: String(st.out) });
              if (st.desc) textsToScan.push({ src: `${c.name} Açıklaması`, text: String(st.desc) });
            });
          }
        });
      }

      const violations = [];
      textsToScan.forEach(item => {
        AUDIT_FORBIDDEN_RULES.forEach(word => {
          const rx = new RegExp(`\\b${word}\\b|${word}`, 'i');
          if (rx.test(item.text)) {
            violations.push({ word, src: item.src });
          }
        });
      });

      const cleanCount = Math.max(0, totalCount - violations.length);
      const valEl = document.getElementById('stat-msg-audit-val');
      const descEl = document.getElementById('stat-msg-audit-desc');

      if (valEl) {
        valEl.innerText = `${cleanCount} / ${totalCount} Temiz`;
        valEl.style.color = violations.length === 0 ? 'var(--status-green)' : 'var(--status-amber)';
      }
      if (descEl) {
        if (violations.length === 0) {
          descEl.innerText = 'faizsiz, ücretsiz, garanti, kesin, mutlaka tarandı → 0 ihlal';
        } else {
          descEl.innerText = `${violations.length} ihlal yakalandı (${violations.map(v => v.word).join(', ')})`;
        }
      }

      return { totalCount, cleanCount, violations };
    }
    window.runRuleBasedMessageAudit = runRuleBasedMessageAudit;

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

      const latDesc = document.getElementById('stat-latency-desc');
      if (latDesc) {
        if (window.LimanAPI && LimanAPI.isOnline() && window.lastApiLatencyMs) {
          latDesc.innerText = `Gerçek FastAPI ölçümü: ${window.lastApiLatencyMs} ms`;
        } else {
          latDesc.innerText = '4 Tool (kod) + 1 LLM (1.2 sn simüle gecikme)';
        }
      }

      // Kural Tabanlı Mesaj Denetimini Çalıştır
      runRuleBasedMessageAudit();

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

        // Kod süresi vs LLM süresi ayrımı
        const isLlmStep = s.tool.includes('iletisimci') || s.tool.includes('soru');
        let durationDisplay = `⏱️ ${s.ms} ms (Kod/DB)`;
        if (isLlmStep) {
          const modelName = s.model || 'OpenAI gpt-4o-mini';
          const tokens = s.tokens || Math.round((s.ms || 1200) * 0.26);
          durationDisplay = `🤖 ${modelName} · ${(s.ms / 1000).toFixed(1)} sn · ~${tokens} token`;
        }

        // Guardrail sadece erteleme_taslagi_olustur veya kural adımlarında anlamlıdır
        let guardrailBadgeHtml = '';
        if (s.tool.includes('erteleme_taslagi')) {
          const isIntervened = s.guardrail_intervened || false;
          if (isIntervened) {
            guardrailBadgeHtml = `
              <div class="step-guardrail-tag" style="background:rgba(239,68,68,0.15);color:#EF4444;border-color:rgba(239,68,68,0.4)">
                🛡️ <strong>GUARDRAIL MÜDAHALESİ:</strong> Talep: ${s.requested_months || '8'} ay → Kod Üst Sınırı Nedeniyle <strong>${s.applied_months || '6'} aya sınırlandı</strong> (Politika Tavan Sınırı: 6 Ay - Varsayım)
              </div>
            `;
          } else {
            guardrailBadgeHtml = `
              <div class="step-guardrail-tag" style="background:rgba(46,158,104,0.12);color:var(--status-green);border-color:rgba(46,158,104,0.3)">
                🛡️ <strong>Guardrail Denetimi:</strong> İstenen: ${c.months} · Uygulanan: ${c.months} (Politika Tavan Sınırı: 6 Ay · Güvenli Aralıkta)
              </div>
            `;
          }
        } else if (s.tool.includes('iletisimci')) {
          guardrailBadgeHtml = `
            <div class="step-guardrail-tag" style="background:rgba(59,130,246,0.1);color:#60A5FA;border-color:rgba(59,130,246,0.3)">
              🛡️ <strong>Kural Tabanlı Mesaj Denetimi:</strong> Kesin vaat ve garanti kelimesi filtresi uygulandı (faizsiz, ücretsiz, garanti, kesin, mutlaka tarandı → 0 ihlal).
            </div>
          `;
        }

        // Adım Açıklaması ve Araç Seçim Gerekçesi (Dürüst etiket)
        let stepReasoningText = '';
        if (s.tool === 'musteri_bilgisi_getir') {
          stepReasoningText = `Çekirdek bankacılık sisteminden (Core Banking) ${c.name} için yaş, kredi türü ve DASK verileri çekilerek sonraki kurallara deterministik girdi sağlandı.`;
        } else if (s.tool === 'oncelik_belirle') {
          stepReasoningText = `Müşteri yaşı (${c.age || 58}) ve hassas durum kural motoruna verildi. Yaş ${c.age >= 65 ? '>= 65 olduğundan Yüksek Öncelik' : '< 65 olduğundan Normal Öncelik'} olarak işaretlendi.`;
        } else if (s.tool === 'erteleme_taslagi_olustur') {
          stepReasoningText = `Kredi türü (${c.loanType}) ve öncelik durumuna göre kural tablosundan ${c.months} erteleme formülü seçildi. Kod tabanlı 6 ay tavan sınırı kontrol edildi.`;
        } else if (s.tool === 'belge_listesi_getir') {
          stepReasoningText = `Mevcut poliçe durumu (${c.dask || 'DASK'}) ve kredi sözleşmesine göre banka afet politikasının (varsayım) öngördüğü asgari evrak listesi şablonlandı.`;
        } else if (s.tool === 'iletisimci_ajan_yaz') {
          stepReasoningText = `LLM (${s.model || 'gpt-4o-mini'}) sadece empati ve saygılı Türkçe metin üretmek üzere çağrıldı; süre ve tutarlar prompt içerisine doğrudan araç çıktılarından kilitlendi.`;
        } else if (s.tool === 'sohbet_baglam_yukle') {
          stepReasoningText = `Müşteri verileri sıfır sorguyla Ajan C sohbet oturumunun sistem hafızasına bağlam olarak enjekte edildi.`;
        } else {
          stepReasoningText = s.desc || `Bu adımda ${s.tool} aracı yürütüldü.`;
        }

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
                  ● 200 OK
                </span>
                <span style="font-family:'JetBrains Mono';font-size:11.5px;color:var(--text-muted);font-weight:600">
                  ${durationDisplay}
                </span>
              </div>
            </div>

            <!-- ADIM AÇIKLAMASI VE ARAÇ SEÇİM GEREKÇESİ (DÜRÜST ETİKET) -->
            <div class="step-cot-box">
              <strong style="color:var(--status-blue)">🔍 Araç Seçim Gerekçesi & Adım Açıklaması:</strong> ${stepReasoningText}
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

            <!-- GUARDRAIL DOĞRULAMASI (SADECE İLGİLİ ADIMLARDA) -->
            ${guardrailBadgeHtml}
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

    // GUARDRAIL MÜDAHALE DEMO TESTİ (8 AY İSTENİR -> 6 AYA DÜŞÜRÜLÜR)
    function triggerGuardrailDemo() {
      const c = CUSTOMERS[selectedCustKey] || CUSTOMERS.selma;
      const stepIdx = c.steps.findIndex(s => s.tool.includes('erteleme_taslagi'));
      if (stepIdx !== -1) {
        c.steps[stepIdx].guardrail_intervened = true;
        c.steps[stepIdx].requested_months = '8';
        c.steps[stepIdx].applied_months = '6';
        c.steps[stepIdx].in = '{"kredi": "' + c.loanType + '", "talep_edilen_ay": 8, "hassasiyet": "ekstrem"}';
        c.steps[stepIdx].out = '{"erteleme_ay": 6, "guardrail_tetiklendi": true, "orijinal_talep": 8, "uygulanan": 6, "kural_tavan": 6}';
      }

      const valEl = document.getElementById('stat-guardrail-val');
      const descEl = document.getElementById('stat-guardrail-desc');
      if (valEl) {
        valEl.innerText = 'MÜDAHALE (8→6 Ay)';
        valEl.style.color = '#EF4444';
      }
      if (descEl) descEl.innerText = 'Kod tavanı 8 ayı 6 aya kesti!';

      loadAgentStepsFor(selectedCustKey);

      alert(
        `🛡️ GUARDRAIL MÜDAHALESİ GERÇEKLEŞTİ!\n\n` +
        `Simüle Edilen Girdi: 8 Ay Erteleme Talebi\n` +
        `Politika/Kod Tavan Sınırı (Varsayım): Azami 6 Ay (Banka Afet Tavan Kuralı)\n\n` +
        `Sonuç: LLM veya talep ne isterse istesin, deterministik kural kodu devreye girdi ve sonucu doğrudan 6 Ay'a sabitledi.`
      );
    }
    window.triggerGuardrailDemo = triggerGuardrailDemo;

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
        resPlan.innerHTML = `🎯 Sonuç: ${months} Ay Erteleme Talebi (Politika Tavan Sınırı: 6 Ay)`;
        resMsg.innerHTML = `"Sayın ${name}, geçmiş olsun. Afet bölgesi kapsamında ${loan === 'konut' ? 'konut' : (loan === 'ihtiyac' ? 'ihtiyaç' : 'kredi kartı')} borcunuz için ${months} aylık kolaylaştırıcı erteleme taslağınız hazırlanmıştır. ${loan === 'konut' && !dask ? 'Konutunuzun sigorta kaydına ulaşılamadığından temsilcimiz danışmanlık amacıyla sizi arayacaktır.' : 'Siz uygun görürseniz onayınızla ilerleyebiliriz.'}"`;
      }, 600);
    }

    // ⚡ YENİ AFET SİMÜLASYONU TETİKLEME (DİNAMİK GÜNCELLEME)
    function runDisasterSimulation() {
      if (!isDisasterActive) {
        setDisasterMode(true, { showAlert: false });
      }

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

      // Telefona geçmiş olsun ve erteleme SMS'i gönder
      setTimeout(() => {
        showSmsNotification();
      }, 450);

      // Çoklu sekme ve diğer pencerelere canlı yayınla
      broadcastDisasterState(true, {
        tur: 'deprem',
        buyukluk: 7.4,
        custKey: selectedCustKey || 'selma'
      });

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
      syncChatBottomActions();

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
      if (modalId === 'modal-qr-ops' && typeof stopQrScanner === 'function') {
        stopQrScanner();
      }
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

    // ── 2. QR İŞLEMLERİ & CANLI KAMERA ──
    let qrMediaStream = null;
    let qrScanInterval = null;
    let qrFacingMode = 'environment'; // Arka kamera öncelikli
    let html5QrScannerInstance = null;

    function openQrModal() {
      openBankingModal('modal-qr-ops');
      switchQrTab('pay');
      resetQrScanner();
    }
    window.openQrModal = openQrModal;

    function switchQrTab(tab) {
      const btnPay = document.getElementById('btn-qr-tab-pay');
      const btnRec = document.getElementById('btn-qr-tab-receive');
      const contentPay = document.getElementById('qr-tab-content-pay');
      const contentRec = document.getElementById('qr-tab-content-receive');
      if (btnPay) btnPay.classList.toggle('active', tab === 'pay');
      if (btnRec) btnRec.classList.toggle('active', tab === 'receive');
      if (contentPay) contentPay.style.display = tab === 'pay' ? 'block' : 'none';
      if (contentRec) contentRec.style.display = tab === 'receive' ? 'block' : 'none';
      if (tab !== 'pay') {
        stopQrScanner();
      }
    }
    window.switchQrTab = switchQrTab;

    async function startQrScanner() {
      const placeholder = document.getElementById('qr-camera-placeholder');
      const controls = document.getElementById('qr-camera-controls');
      const overlay = document.getElementById('qr-scan-overlay');
      const resultBox = document.getElementById('qr-scan-result');
      const video = document.getElementById('qr-video');

      if (resultBox) resultBox.style.display = 'none';

      // 1. Önce Html5Qrcode kütüphanesi yüklü mü kontrol et
      if (typeof Html5Qrcode !== 'undefined') {
        try {
          if (html5QrScannerInstance) {
            try { await html5QrScannerInstance.stop(); } catch(e){}
            html5QrScannerInstance = null;
          }
          const container = document.getElementById('qr-camera-container');
          if (placeholder) placeholder.style.display = 'none';
          if (controls) controls.style.display = 'flex';
          if (overlay) overlay.style.display = 'flex';

          html5QrScannerInstance = new Html5Qrcode('qr-camera-container');
          await html5QrScannerInstance.start(
            { facingMode: qrFacingMode },
            {
              fps: 10,
              qrbox: { width: 220, height: 220 },
              aspectRatio: 1.333333
            },
            (decodedText) => {
              onQrCodeScanned(decodedText);
            },
            () => { /* karede kod yokken sessiz kal */ }
          );
          return;
        } catch (err) {
          console.warn('Html5Qrcode başlatılamadı, doğrudan getUserMedia deneniyor:', err);
        }
      }

      // 2. Doğrudan getUserMedia Fallback
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Tarayıcınız kamera erişimini desteklemiyor veya izin verilmedi.');
        return;
      }

      try {
        if (qrMediaStream) {
          qrMediaStream.getTracks().forEach(t => t.stop());
        }

        const constraints = {
          video: {
            facingMode: qrFacingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        qrMediaStream = stream;

        if (video) {
          video.srcObject = stream;
          video.setAttribute('playsinline', 'true');
          await video.play();
        }

        if (placeholder) placeholder.style.display = 'none';
        if (controls) controls.style.display = 'flex';
        if (overlay) overlay.style.display = 'flex';

        // Barkod Dedektörü API varsa arka planda canlı algıla
        if ('BarcodeDetector' in window) {
          try {
            const barcodeDetector = new BarcodeDetector({ formats: ['qr_code'] });
            qrScanInterval = setInterval(async () => {
              if (!video || video.readyState < 2) return;
              try {
                const barcodes = await barcodeDetector.detect(video);
                if (barcodes.length > 0) {
                  onQrCodeScanned(barcodes[0].rawValue);
                }
              } catch (e) {}
            }, 500);
          } catch(e) {}
        }
      } catch (err) {
        console.error('Kamera açma hatası:', err);
        let msg = 'Kamera açılamadı: ' + (err.message || 'Lütfen kamera iznini kontrol edin.');
        if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
          msg += '\n\nNot: Canlı kamera erişimi için tarayıcılar HTTPS (güvenli bağlantı) veya localhost gerektirir.';
        }
        alert(msg);
        resetQrScanner();
      }
    }
    window.startQrScanner = startQrScanner;

    async function stopQrScanner() {
      if (html5QrScannerInstance) {
        try {
          await html5QrScannerInstance.stop();
          html5QrScannerInstance.clear();
        } catch(e){}
        html5QrScannerInstance = null;
      }
      if (qrScanInterval) {
        clearInterval(qrScanInterval);
        qrScanInterval = null;
      }
      if (qrMediaStream) {
        qrMediaStream.getTracks().forEach(track => track.stop());
        qrMediaStream = null;
      }
      const video = document.getElementById('qr-video');
      if (video) {
        video.srcObject = null;
      }
      const controls = document.getElementById('qr-camera-controls');
      if (controls) controls.style.display = 'none';
    }
    window.stopQrScanner = stopQrScanner;

    function resetQrScanner() {
      stopQrScanner();
      const placeholder = document.getElementById('qr-camera-placeholder');
      const controls = document.getElementById('qr-camera-controls');
      const resultBox = document.getElementById('qr-scan-result');
      const overlay = document.getElementById('qr-scan-overlay');
      if (placeholder) placeholder.style.display = 'flex';
      if (controls) controls.style.display = 'none';
      if (resultBox) resultBox.style.display = 'none';
      if (overlay) overlay.style.display = 'flex';
    }
    window.resetQrScanner = resetQrScanner;

    function switchQrCamera() {
      qrFacingMode = (qrFacingMode === 'environment') ? 'user' : 'environment';
      startQrScanner();
    }
    window.switchQrCamera = switchQrCamera;

    function onQrCodeScanned(qrData) {
      stopQrScanner();

      const resultBox = document.getElementById('qr-scan-result');
      const resultText = document.getElementById('qr-result-text');
      const placeholder = document.getElementById('qr-camera-placeholder');
      const overlay = document.getElementById('qr-scan-overlay');

      if (placeholder) placeholder.style.display = 'none';
      if (overlay) overlay.style.display = 'none';
      if (resultBox) resultBox.style.display = 'flex';
      if (resultText) resultText.innerText = qrData || 'Karekod okundu';

      // Titreşim desteği varsa
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }

      // Veriyi analiz et ve onay sor
      setTimeout(() => {
        handleQrPayload(qrData);
      }, 700);
    }
    window.onQrCodeScanned = onQrCodeScanned;

    function handleQrPayload(raw) {
      let type = 'pos_pay';
      let amount = 250;
      let label = 'Karekod Ödemesi';

      if (/atm/i.test(raw)) {
        type = 'atm_withdraw';
        amount = 500;
        label = 'ATM Kartsız Para Çekme';
      } else if (/fatura|bill|su|elektrik|gaz/i.test(raw)) {
        type = 'bill_qr';
        amount = 340;
        label = 'Fatura Karekod Tahsilatı';
      } else if (/iban|tr\d{2}/i.test(raw)) {
        type = 'pos_pay';
        amount = 150;
        label = 'Kişiye Karekod Transferi';
      }

      const matchAmount = raw && raw.match(/(\d+([.,]\d{1,2})?)\s*(tl|try|₺)/i);
      if (matchAmount) {
        const parsed = parseFloat(matchAmount[1].replace(',', '.'));
        if (!isNaN(parsed) && parsed > 0) amount = parsed;
      }

      const confirmed = confirm(
        `Karekod Başarıyla Algılandı!\n\n` +
        `İçerik: ${raw.slice(0, 80)}${raw.length > 80 ? '...' : ''}\n` +
        `İşlem Tipi: ${label}\n` +
        `Tutar: ${formatTl(amount)}\n\n` +
        `Bu işlemi onaylıyor musunuz?`
      );

      if (confirmed) {
        executeQrAction(type, amount);
      } else {
        resetQrScanner();
      }
    }
    window.handleQrPayload = handleQrPayload;

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

    // ── 8. AFET BAĞIŞI İŞLEMLERİ (AFAD, AKUT, KIZILAY, RİZE VALİLİĞİ) ──
    const DONATION_ACCOUNTS = {
      afad: {
        name: 'AFAD Afet ve Acil Durum Yönetimi Başkanlığı',
        iban: 'TR73 0001 0017 4555 5555 5550 01 (T.C. Ziraat Bankası)',
        note: 'T.C. İçişleri Bakanlığı Resmi Afet Fonu'
      },
      akut: {
        name: 'AKUT Arama Kurtarma Derneği',
        iban: 'TR44 0006 4000 0011 2233 1996 01 (Türkiye İş Bankası)',
        note: 'Arama Kurtarma, Enkaz & Sel Tahliye Operasyonları'
      },
      kizilay: {
        name: 'Türk Kızılay Derneği Genel Başkanlığı',
        iban: 'TR22 0001 5001 5800 7293 8415 01 (Vakıfbank)',
        note: 'Afet Beslenme & Aşevi Mobil Mutfak Hizmeti'
      },
      rize_sel: {
        name: 'Rize Valiliği İl Afet ve Acil Durum Koordinasyonu',
        iban: 'TR19 0001 0002 1400 0019 2300 01 (Halkbank)',
        note: 'Karadeniz Bölgesi Sel & Heyelan Acil İmar Fonu'
      }
    };

    function openDonationModal() {
      const balDisp = document.getElementById('donation-balance-disp');
      if (balDisp) balDisp.innerText = formatTl(userBankingState.checkingBalance);
      updateDonationDetails();
      openBankingModal('modal-donation');
    }
    window.openDonationModal = openDonationModal;

    function setDonationAmount(val) {
      const input = document.getElementById('donation-amount');
      if (input) input.value = val;
    }
    window.setDonationAmount = setDonationAmount;

    function updateDonationDetails() {
      const orgKey = document.getElementById('donation-org')?.value || 'afad';
      const info = DONATION_ACCOUNTS[orgKey] || DONATION_ACCOUNTS.afad;
      const nameEl = document.getElementById('donation-org-name');
      const ibanEl = document.getElementById('donation-org-iban');
      if (nameEl) nameEl.innerText = `${info.name} — ${info.note}`;
      if (ibanEl) ibanEl.innerText = info.iban;
    }
    window.updateDonationDetails = updateDonationDetails;

    function submitDonation(e) {
      e.preventDefault();
      const amount = parseFloat(document.getElementById('donation-amount')?.value);
      if (isNaN(amount) || amount <= 0) {
        alert('Lütfen geçerli bir bağış tutarı girin.');
        return;
      }

      if (amount > userBankingState.checkingBalance) {
        alert(`Yetersiz bakiye!\nVadesiz hesabınızda ${formatTl(userBankingState.checkingBalance)} bulunmaktadır.`);
        return;
      }

      const orgKey = document.getElementById('donation-org')?.value || 'afad';
      const orgInfo = DONATION_ACCOUNTS[orgKey] || DONATION_ACCOUNTS.afad;
      const note = document.getElementById('donation-note')?.value.trim() || 'Afet Bölgesi İnsani Yardım Bağışı';

      userBankingState.checkingBalance -= amount;
      const nowStr = new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
      userBankingState.accountTransactions.unshift({
        date: nowStr,
        type: 'giden',
        title: `Afet Bağışı: ${orgKey.toUpperCase()}`,
        desc: `${orgInfo.name} (${note})`,
        amount: -amount
      });
      saveBankingState();

      const txId = 'tx_bagis_' + Date.now();
      const now = new Date().toTimeString().split(' ')[0];
      const db = (typeof LimanDB !== 'undefined') ? LimanDB : window.LimanDB;
      if (db && db.recordTransaction) {
        db.recordTransaction(txId, selectedCustKey, 'AFET_BAĞIŞI', amount, 'Mobil Bağış', `${orgInfo.name} - ${note}`);
      }
      refreshDatabaseIframe();

      eventLogs.unshift({
        time: now,
        topic: 'charity.donation.completed',
        desc: `AFET BAĞIŞI: ${orgInfo.name} kurumuna ${formatTl(amount)} bağış aktarıldı (0 TL Masraf, Ref: ${txId}).`
      });
      renderEvents();

      const auditBox = document.getElementById('audit-log-box');
      if (auditBox) {
        auditBox.innerHTML = `<div>[${now}] <strong style="color:var(--ing-primary)">charity.donation</strong> → ${formatTl(amount)} ${orgKey.toUpperCase()} (Afet Fonu Masrafsız EFT Onaylandı)</div>` + auditBox.innerHTML;
      }

      closeBankingModal('modal-donation');
      e.target.reset();

      // Bağış panosu toplamını güncelle
      const totCollectedEl = document.getElementById('total-donation-collected');
      if (totCollectedEl) {
        totCollectedEl.innerText = '₺1.429.500';
      }
      const balEl = document.getElementById('donation-tab-balance');
      if (balEl) {
        balEl.innerText = formatTl(userBankingState.checkingBalance);
      }

      alert(`🧡 Teşekkür Ederiz!\n\nBağışınız afetzede vatandaşlarımıza ulaştırılmak üzere başarıyla iletildi.\n\nKurum: ${orgInfo.name}\nTutar: ${formatTl(amount)}\nİşlem No: ${txId}\nMasraf: 0 TL (Liman Bankası Afet Muafiyeti)\n\nDayanışmanız için minnettarız.`);
    }
    window.submitDonation = submitDonation;

    function quickDonateTo(orgKey) {
      openDonationModal();
      const orgSelect = document.getElementById('donation-org');
      if (orgSelect) {
        orgSelect.value = orgKey;
        updateDonationDetails();
      }
    }
    window.quickDonateTo = quickDonateTo;

    function setQuickDonationAmount(val) {
      const input = document.getElementById('quick-donation-amount');
      if (input) input.value = val;
    }
    window.setQuickDonationAmount = setQuickDonationAmount;

    function syncDonationOrgSelection(val) {
      const modalOrg = document.getElementById('donation-org');
      if (modalOrg) {
        modalOrg.value = val;
        updateDonationDetails();
      }
    }
    window.syncDonationOrgSelection = syncDonationOrgSelection;

    // İLK YÜKLEME
    if (window.LimanDB) window.LimanDB.init();
    loadSavedCustomCustomers();
    loadBankingState();
    renderEvents();
    setDisasterMode(false); // Başlangıçta tertemiz Normal Bankacılık Modu
    applyRoleUIVisibility('customer');
    switchTab('customer');
    pickCustomer('selma');
    loadAgentStepsFor('selma');
    setTimeout(() => fetchCustomersFromAPI(), 500);