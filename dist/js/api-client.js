// ════════════════════════════════════════════════════════════════
// LİMAN BANKASI — AFET MODU API İSTEMCİSİ VE CANLI SSE VERİ AKIŞI
// (FastAPI :8000 <-> afet-modu-app.html & database.html)
// ════════════════════════════════════════════════════════════════

(function(window) {
  'use strict';

  const DEFAULT_API_URL = 'http://localhost:8000';
  let apiBase = localStorage.getItem('liman_api_url') || DEFAULT_API_URL;
  let isApiOnline = false;
  let eventSource = null;
  let reconnectTimer = null;
  let healthCheckTimer = null;

  const LimanAPI = {
    getBaseUrl() {
      return apiBase;
    },

    setBaseUrl(url) {
      apiBase = url.replace(/\/+$/, '');
      localStorage.setItem('liman_api_url', apiBase);
      this.reconnect();
    },

    isOnline() {
      return isApiOnline;
    },

    // ── 1. SAĞLIK VE DURUM KONTROLÜ ─────────────────────────────────
    async checkHealth() {
      try {
        const res = await fetch(`${apiBase}/api/health`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(2500)
        });
        if (res.ok) {
          const data = await res.json();
          this.setOnlineStatus(true, data);
          return data;
        }
      } catch (err) {
        // Çevrimdışı
      }
      this.setOnlineStatus(false);
      return null;
    },

    setOnlineStatus(online, info = null) {
      const prev = isApiOnline;
      isApiOnline = online;

      // Rozetleri ve göstergeleri güncelle
      const pill = document.getElementById('api-status-pill');
      if (pill) {
        if (online) {
          pill.className = 'api-status-pill online';
          pill.innerHTML = `● 🟢 API: BAĞLI (:8000 · SSE Canlı)`;
          pill.title = `FastAPI servisi aktif (${apiBase}) · Canlı veri akışı açık.`;
        } else {
          pill.className = 'api-status-pill offline';
          pill.innerHTML = `● ⚪ API: ÇEVRİMDIŞI (Yerel Mod)`;
          pill.title = `FastAPI bağlantısı kurulamadı. Uygulama yerel bellek ile çalışıyor.`;
        }
      }

      // Veritabanı sekmesindeki gösterge
      const dbIframeStatus = document.getElementById('api-status-hint');
      if (dbIframeStatus) {
        dbIframeStatus.innerText = online ? '🟢 API & SQLite Canlı' : '⚪ Yerel Veritabanı Modu';
      }

      // Durum değiştiyse olay yayınla
      if (prev !== online) {
        window.dispatchEvent(new CustomEvent('liman:api-status', { detail: { online, info } }));
      }
    },

    // ── 2. GERÇEK ZAMANLI SSE VERİ AKIŞI ────────────────────────────
    startEventStream() {
      if (eventSource) {
        try { eventSource.close(); } catch (e) {}
      }

      try {
        eventSource = new EventSource(`${apiBase}/api/agent/stream`);

        eventSource.onopen = () => {
          this.setOnlineStatus(true);
          console.log('📡 [LimanAPI] Canlı SSE Olay Akışına Bağlanıldı (:8000/api/agent/stream)');
        };

        eventSource.onmessage = (event) => {
          if (!event.data || event.data.startsWith(':')) return; // Ping mesajlarını yut
          try {
            const payload = JSON.parse(event.data);
            this.handleRemoteEvent(payload);
          } catch (e) {
            console.warn('[LimanAPI] SSE Parse Hatası:', e);
          }
        };

        eventSource.onerror = (err) => {
          this.setOnlineStatus(false);
          if (eventSource) eventSource.close();
          eventSource = null;
          // 4 saniye sonra otomatik yeniden bağlan
          clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(() => {
            if (isApiOnline || !eventSource) this.startEventStream();
          }, 4000);
        };
      } catch (err) {
        this.setOnlineStatus(false);
      }
    },

    reconnect() {
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      this.checkHealth().then((ok) => {
        if (ok) this.startEventStream();
      });
    },

    handleRemoteEvent(payload) {
      const topic = payload.topic || 'bilinmeyen_olay';
      const data = payload.data || {};
      const time = payload.time || new Date().toTimeString().split(' ')[0];

      console.log(`⚡ [LimanAPI Canlı Akış] ${topic}:`, data);

      // 1. Ana Event Feed (Olay Akışı Paneli)
      if (window.eventLogs && typeof window.renderEvents === 'function') {
        const desc = data.desc || data.message || JSON.stringify(data);
        // Mükerrer engelleme
        if (!window.eventLogs.some(e => e.topic === topic && e.time === time && e.desc === desc)) {
          window.eventLogs.unshift({ time, topic, desc });
          if (window.eventLogs.length > 50) window.eventLogs.pop();
          window.renderEvents();
        }
      }

      // 2. Özel Olay Türlerine Göre Arayüzü Güncelle
      if (topic === 'disaster.declared') {
        // Yeni afet ilanı geldiğinde banner'ı aç
        const banner = document.getElementById('disaster-drop-banner');
        if (banner) banner.style.display = 'block';
        if (typeof window.showToast === 'function') {
          window.showToast(`🚨 AFET İLANI: ${data.tur || 'Afet'} bildirimi sisteme düştü!`);
        }
      } else if (topic === 'customer.registered' && data.customer_id) {
        // Yeni müşteri kaydoldu, listeye ekle
        if (typeof window.fetchCustomersFromAPI === 'function') {
          window.fetchCustomersFromAPI();
        }
      } else if (topic === 'plan.approved') {
        // Plan onaylandı bildirimi
        if (data.customer_id && window.CUSTOMERS && window.CUSTOMERS[data.customer_id]) {
          window.CUSTOMERS[data.customer_id].planStatus = 'onaylandi';
        }
        if (typeof window.refreshDatabaseIframe === 'function') {
          window.refreshDatabaseIframe();
        }
      } else if (topic === 'plan.escalated') {
        if (data.customer_id && window.CUSTOMERS && window.CUSTOMERS[data.customer_id]) {
          window.CUSTOMERS[data.customer_id].planStatus = 'devredildi';
        }
        if (typeof window.refreshDatabaseIframe === 'function') {
          window.refreshDatabaseIframe();
        }
      }

      // Genel CustomEvent yayınla (database.html ve diğer dinleyiciler için)
      window.dispatchEvent(new CustomEvent('liman:remote-event', { detail: payload }));
    },

    // ── 3. REST METOTLARI (API ÇAĞRILARI) ───────────────────────────
    async register(customerData) {
      if (!isApiOnline) {
        console.warn('[LimanAPI] API çevrimdışı, yerel mod işletiliyor.');
        return null;
      }
      try {
        const res = await fetch(`${apiBase}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(customerData)
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } catch (e) {
        console.error('[LimanAPI] register error:', e);
        return null;
      }
    },

    async login(identifier, password) {
      if (!isApiOnline) return null;
      try {
        const res = await fetch(`${apiBase}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier, password })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } catch (e) {
        console.error('[LimanAPI] login error:', e);
        return null;
      }
    },

    async getCustomers() {
      if (!isApiOnline) return null;
      try {
        const res = await fetch(`${apiBase}/api/core/customers`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } catch (e) {
        console.error('[LimanAPI] getCustomers error:', e);
        return null;
      }
    },

    async triggerDisaster(disasterPayload) {
      if (!isApiOnline) return null;
      try {
        const res = await fetch(`${apiBase}/api/disaster/trigger`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(disasterPayload)
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } catch (e) {
        console.error('[LimanAPI] triggerDisaster error:', e);
        return null;
      }
    },

    async runAgent(customerId) {
      if (!isApiOnline) return null;
      try {
        const res = await fetch(`${apiBase}/api/agent/run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customer_id: customerId })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } catch (e) {
        console.error('[LimanAPI] runAgent error:', e);
        return null;
      }
    },

    async approvePlan(planId) {
      if (!isApiOnline) return null;
      try {
        const res = await fetch(`${apiBase}/api/plans/${planId}/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } catch (e) {
        console.error('[LimanAPI] approvePlan error:', e);
        return null;
      }
    },

    async escalatePlan(planId, reason, notes) {
      if (!isApiOnline) return null;
      try {
        const res = await fetch(`${apiBase}/api/plans/${planId}/escalate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason, notes })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } catch (e) {
        console.error('[LimanAPI] escalatePlan error:', e);
        return null;
      }
    },

    async query(sql) {
      if (!isApiOnline) return null;
      try {
        const res = await fetch(`${apiBase}/api/db/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: sql })
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail || `HTTP ${res.status}`);
        }
        return await res.json();
      } catch (e) {
        throw e;
      }
    },

    // ── 4. BAŞLATICI ────────────────────────────────────────────────
    init() {
      this.checkHealth().then((ok) => {
        if (ok) {
          this.startEventStream();
        }
      });

      // 5 saniyede bir hafif sağlık kontrolü (heartbeat)
      clearInterval(healthCheckTimer);
      healthCheckTimer = setInterval(() => {
        this.checkHealth().then((ok) => {
          if (ok && !eventSource) {
            this.startEventStream();
          }
        });
      }, 5000);
    }
  };

  // Otomatik başlat
  if (typeof window !== 'undefined') {
    window.LimanAPI = LimanAPI;
    window.addEventListener('DOMContentLoaded', () => {
      LimanAPI.init();
    });
  }

})(window);
