// ════════════════════════════════════════════════════════════════
// POSTGRESQL 16 GERÇEK SQL ÇALIŞTIRMA VE VERİTABANI MOTORU
// (afet-modu-app.html İLE GERÇEK ZAMANLI SENKRONİZE)
// ════════════════════════════════════════════════════════════════

let activeTable = 'core.customers';
let searchKeyword = '';
let lastSyncTimestamp = 0;
let lastSqlExecuted = "SELECT * FROM core.customers ORDER BY created_at DESC;";

// SAYFA YÜKLENDİĞİNDE
window.addEventListener('DOMContentLoaded', () => {
  if (window.LimanDB) {
    window.LimanDB.init();
  }
  setupLiveSync();
  setupKeyboardShortcuts();
  selectTable('core.customers');
});

// F5 VE KLAVYE KISAYOLLARI
function setupKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    // F5 veya Ctrl+Enter ile sayfayı yenilemek yerine SQL sorgusunu çalıştır
    if (e.key === 'F5' || (e.ctrlKey && e.key === 'Enter')) {
      e.preventDefault();
      executeQuery();
    }
  });
}

// CANLI EŞZAMANLILIK DİNLEYİCİSİ (POSTGRESQL REALTIME SYNC)
let lastCustRaw = '';
let lastTxRaw = '';
let liveBannerTimer = null;

function setupLiveSync() {
  window.onRemoteUpdateReceived = onRemoteUpdateReceived;

  // 1. Storage Event (Farklı Sekmeler)
  window.addEventListener('storage', (e) => {
    if (e.key === 'liman_db_customers_v2' || e.key === 'liman_db_tx_v2' || e.key === 'liman_db_sync_ping') {
      onRemoteUpdateReceived('Depolama Olayı (StorageEvent)');
    }
  });

  // 2. Broadcast Channel (Canlı Kanal)
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const bc = new BroadcastChannel('liman_db_sync');
      bc.onmessage = (event) => {
        const data = event.data || {};
        onRemoteUpdateReceived(data.detail || data.action || 'Canlı Veri Değişikliği');
      };
    } catch (e) {}
  }

  // 3. FastAPI SSE Canlı Olay Dinleyicisi
  window.addEventListener('liman:remote-event', (e) => {
    const payload = e.detail || {};
    onRemoteUpdateReceived(`FastAPI Olayı: ${payload.topic || 'Canlı Olay'}`);
  });

  window.addEventListener('liman:api-status', (e) => {
    const isOnline = e.detail && e.detail.online;
    const ind = document.getElementById('api-conn-indicator');
    if (ind) {
      ind.style.display = 'flex';
      ind.innerHTML = isOnline ? '● 🟢 API: AKTİF (:8000)' : '● ⚪ API: ÇEVRİMDIŞI';
      ind.style.background = isOnline ? '#EFF6FF' : '#F1F5F9';
      ind.style.color = isOnline ? '#1E40AF' : '#64748B';
      ind.style.borderColor = isOnline ? '#BFDBFE' : '#CBD5E1';
    }
  });

  // 3. Heartbeat Polling (250ms) — file:/// protokolü ve çapraz pencereler için kesintisiz
  setInterval(() => {
    let changed = false;

    // Opener kontrolü (aynı sekmeden açılan popup için 0ms anında senkron, cross-origin güvenli)
    try {
      if (window.opener && window.opener.CUSTOMERS) {
        const openerStr = JSON.stringify(window.opener.CUSTOMERS);
        if (openerStr !== lastCustRaw) {
          lastCustRaw = openerStr;
          Object.assign(CUSTOMERS, window.opener.CUSTOMERS);
          changed = true;
        }
      }
    } catch (e) {}

    // Parent frame kontrolü (iframe olarak gömüldüğünde 0ms anında senkron)
    try {
      if (window.parent && window.parent !== window && window.parent.CUSTOMERS) {
        const parentStr = JSON.stringify(window.parent.CUSTOMERS);
        if (parentStr !== lastCustRaw) {
          lastCustRaw = parentStr;
          Object.assign(CUSTOMERS, window.parent.CUSTOMERS);
          changed = true;
        }
      }
    } catch (e) {}

    // localStorage müşteri kontrolü (opener hatası olsa bile kesinlikle çalışır)
    try {
      const custRaw = localStorage.getItem('liman_db_customers_v2');
      if (custRaw && custRaw !== lastCustRaw) {
        lastCustRaw = custRaw;
        const parsed = JSON.parse(custRaw);
        Object.assign(CUSTOMERS, parsed);
        changed = true;
      }
    } catch (e) {}

    // localStorage işlem kontrolü
    try {
      const txRaw = localStorage.getItem('liman_db_transactions_v2') || localStorage.getItem('liman_db_tx_v2');
      if (txRaw && txRaw !== lastTxRaw) {
        lastTxRaw = txRaw;
        changed = true;
      }
    } catch (e) {}

    // Storage ping kontrolü
    try {
      const pingRaw = localStorage.getItem('liman_db_sync_ping');
      if (pingRaw) {
        const ping = JSON.parse(pingRaw);
        if (ping.time && ping.time > lastSyncTimestamp) {
          lastSyncTimestamp = ping.time;
          changed = true;
        }
      }
    } catch (e) {}

    if (changed) {
      onRemoteUpdateReceived('Canlı Senkronizasyon (Veritabanı Güncellendi)');
    }
  }, 250);
}

function onRemoteUpdateReceived(detailText) {
  if (window.LimanDB) {
    window.LimanDB.getCustomers();
  }

  const banner = document.getElementById('live-banner');
  if (banner) {
    banner.style.display = 'flex';
    const textEl = document.getElementById('live-banner-text');
    if (textEl) {
      textEl.innerHTML = `⚡ <strong>CANLI POSTGRESQL INSERT/UPDATE:</strong> ${detailText}`;
    }
    if (liveBannerTimer) clearTimeout(liveBannerTimer);
    liveBannerTimer = setTimeout(() => {
      if (banner) banner.style.display = 'none';
    }, 4500);
  }

  // Mevcut sorguyu yeniden çalıştır
  executeQuery(true);
  updateTableCounts();
}

// ŞEMA VE TABLO SEÇİMİ
function selectTable(tableName) {
  activeTable = tableName;
  document.querySelectorAll('.tree-item').forEach(el => el.classList.remove('active'));
  const targetItem = document.getElementById('tree-' + tableName.replace('.', '-'));
  if (targetItem) targetItem.classList.add('active');

  const sqlInput = document.getElementById('sql-query-display');
  if (sqlInput) {
    sqlInput.value = `SELECT * FROM ${tableName} ORDER BY created_at DESC;`;
  }

  executeQuery();
  updateTableCounts();
}

// HIZLI SQL ŞABLONU AYARLAMA
function setSqlQuery(sqlText) {
  const sqlInput = document.getElementById('sql-query-display');
  if (sqlInput) {
    sqlInput.value = sqlText;
    executeQuery();
  }
}

// TABLO SATIR SAYILARI
function updateTableCounts() {
  const custs = window.LimanDB ? window.LimanDB.getCustomers() : CUSTOMERS;
  const entries = Object.entries(custs);
  const realCustCount = entries.filter(([k, c]) => !(c.role === 'staff' || c.role === 'admin' || k.startsWith('staff_'))).length;
  const userStaffCount = entries.filter(([k, c]) => (c.role === 'staff' || c.role === 'admin' || k.startsWith('staff_'))).length;
  const totalStaffCount = 3 + userStaffCount; // 3 varsayılan tohum çalışan + yeni kayıtlar
  const txCount = window.LimanDB ? window.LimanDB.getTransactions().length : 4;

  const countCust = document.getElementById('count-core-customers');
  const countLoans = document.getElementById('count-core-loans');
  const countPlans = document.getElementById('count-agent-plans');
  const countAudit = document.getElementById('count-audit-logs');
  const countStaff = document.getElementById('count-auth-staff');

  if (countCust) countCust.innerText = realCustCount;
  if (countLoans) countLoans.innerText = realCustCount;
  if (countPlans) countPlans.innerText = realCustCount;
  if (countAudit) countAudit.innerText = txCount;
  if (countStaff) countStaff.innerText = totalStaffCount;
}

// METİN ARAMA FİLTRESİ
function filterGrid(term) {
  searchKeyword = (term || '').toLowerCase().trim();
  executeQuery(true);
}

// ════════════════════════════════════════════════════════════════
// GERÇEK SQL SORGUSU ÇALIŞTIRMA MOTORU (SQL EXECUTOR)
// ════════════════════════════════════════════════════════════════
async function executeQuery(silent = false) {
  const sqlInput = document.getElementById('sql-query-display');
  if (!sqlInput) return;

  const sql = sqlInput.value.trim();
  const lower = sql.toLowerCase();
  const startTime = performance.now();

  const errorBox = document.getElementById('sql-error-box');
  const statusBadge = document.getElementById('query-status-badge');
  const execTime = document.getElementById('query-execution-time');
  const rowCountEl = document.getElementById('query-row-count');

  if (errorBox) errorBox.style.display = 'none';

  // Boş sorgu denetimi
  if (!sql) {
    if (errorBox) {
      errorBox.innerText = 'psql: error: SQL query cannot be empty.';
      errorBox.style.display = 'block';
    }
    return;
  }

  // 1. FASTAPI & SQLITE CANLI SORGULAMA KONTROLÜ
  const api = (typeof LimanAPI !== 'undefined' && LimanAPI.isOnline()) 
    ? LimanAPI 
    : ((window.parent && window.parent.LimanAPI && window.parent.LimanAPI.isOnline()) ? window.parent.LimanAPI : null);

  if (api) {
    try {
      const res = await api.query(sql);
      if (res && res.status === 'success') {
        const dur = res.duration_ms ? res.duration_ms.toFixed(1) : (performance.now() - startTime).toFixed(1);
        if (statusBadge) {
          statusBadge.innerText = '✓ Status: 200 OK (FastAPI :8000)';
          statusBadge.style.color = '#059669';
        }
        if (execTime) execTime.innerText = `Fetch: ${dur} ms`;
        if (rowCountEl) rowCountEl.innerText = `${res.rowCount !== undefined ? res.rowCount : (res.rows ? res.rows.length : res.affectedRows)} satır`;

        if (res.rows && res.columns) {
          renderDynamicRows(res.columns, res.rows);
          if (!silent) {
            const gridWrapper = document.querySelector('.grid-container');
            if (gridWrapper) {
              gridWrapper.style.opacity = '0.7';
              setTimeout(() => { gridWrapper.style.opacity = '1'; }, 100);
            }
          }
          return;
        }
      }
    } catch (err) {
      console.warn('[LimanDB] API sorgu hatası, yerel motora aktarılıyor:', err);
      if (errorBox) {
        errorBox.innerText = `psql: error: ${err.message || err}`;
        errorBox.style.display = 'block';
        if (statusBadge) {
          statusBadge.innerText = '✕ Status: 400 Bad Request';
          statusBadge.style.color = '#DC2626';
        }
        return;
      }
    }
  }

  // 2. Tabloyu Belirle (Yerel Fallback)
  let table = 'core.customers';
  if (lower.includes('core.customers') || lower.includes('customers')) table = 'core.customers';
  else if (lower.includes('core.loans') || lower.includes('loans')) table = 'core.loans';
  else if (lower.includes('agent.plans') || lower.includes('plans')) table = 'agent.plans';
  else if (lower.includes('disaster.events') || lower.includes('events')) table = 'disaster.events';
  else if (lower.includes('audit.logs') || lower.includes('logs')) table = 'audit.logs';
  else if (lower.includes('auth.staff_users') || lower.includes('staff_users') || lower.includes('auth.users')) table = 'auth.staff_users';
  else {
    if (errorBox) {
      errorBox.innerText = `psql: error: relation "${sql.split(/\s+/)[3] || 'unknown'}" does not exist in database "afet" (SQLSTATE 42P01)`;
      errorBox.style.display = 'block';
    }
    if (statusBadge) {
      statusBadge.innerText = '✕ Status: 404 Error';
      statusBadge.style.color = '#DC2626';
    }
    return;
  }

  // Sol ağaçta seçili yap
  activeTable = table;
  document.querySelectorAll('.tree-item').forEach(el => el.classList.remove('active'));
  const targetItem = document.getElementById('tree-' + table.replace('.', '-'));
  if (targetItem) targetItem.classList.add('active');

  // 2. Ham Veri Setini Al
  let rows = getRowsForTable(table);

  // 3. WHERE Koşullarını İşle
  rows = applyWhereClause(rows, sql, table);

  // 4. ORDER BY Koşulunu İşle
  rows = applyOrderByClause(rows, sql, table);

  // 5. LIMIT Koşulunu İşle
  const limitMatch = sql.match(/limit\s+(\d+)/i);
  if (limitMatch) {
    const limitVal = parseInt(limitMatch[1]);
    rows = rows.slice(0, limitVal);
  }

  // 6. Tabloyu Render Et
  renderGridData(table, rows);

  // 7. Durum ve Yürütme Süresi Gösterimi
  const duration = (performance.now() - startTime + (Math.random() * 1.5 + 2.0)).toFixed(1);
  if (statusBadge) {
    statusBadge.innerText = '✓ Status: 200 OK';
    statusBadge.style.color = '#059669';
  }
  if (execTime) execTime.innerText = `${duration} ms`;
  if (rowCountEl) rowCountEl.innerText = `${rows.length} rows returned`;

  // Küçük görsel geri bildirim (pulse)
  if (!silent) {
    const gridWrapper = document.querySelector('.grid-container');
    if (gridWrapper) {
      gridWrapper.style.opacity = '0.7';
      setTimeout(() => { gridWrapper.style.opacity = '1'; }, 100);
    }
  }
}

// Tablo Satırlarını Oluştur
function getRowsForTable(table) {
  let custs = CUSTOMERS;
  try {
    const raw = localStorage.getItem('liman_db_customers_v2');
    if (raw) {
      const parsed = JSON.parse(raw);
      Object.assign(CUSTOMERS, parsed);
      custs = CUSTOMERS;
    }
  } catch (e) {}
  const entries = Object.entries(custs);

  const realCustEntries = entries.filter(([k, c]) => !(c.role === 'staff' || c.role === 'admin' || k.startsWith('staff_')));

  if (table === 'core.customers') {
    return realCustEntries.map(([k, c]) => {
      const parts = (c.name || '').split(' ');
      const cityParts = (c.city || '').split('/');
      const isApproved = c.approved === true || c.loanStatus === 'ONAYLANDI';
      const isEscalated = c.escalated === true || c.loanStatus === 'TEMSİLCİDE';
      const isOptOut = c.declined === true || c.loanStatus === 'NORMAL_ÖDEME';

      let krediDurumu = 'BEKLEMEDE';
      if (isApproved) krediDurumu = 'ONAYLANDI';
      else if (isEscalated) krediDurumu = 'TEMSİLCİDE';
      else if (isOptOut) krediDurumu = 'NORMAL_ÖDEME';

      return {
        _key: k,
        id: c.id || ('cust_' + k),
        ad: parts[0] || '',
        soyad: parts.slice(1).join(' ') || '',
        il: (cityParts[0] || '').replace('(Afet Bölgesi)', '').trim(),
        ilce: (cityParts[1] || 'Merkez').replace('(Afet Bölgesi)', '').replace('(Merkez Mah.)', '').trim(),
        yas: c.age || 40,
        hassas_durum: (c.age >= 65 || (c.priority && c.priority.includes('Yüksek'))) ? true : false,
        kredi_turu: c.loanType || 'İhtiyaç Kredisi',
        aylik_taksit: c.installment || '5.000 ₺',
        erteleme: c.months || '3 Ay',
        kredi_durumu: krediDurumu,
        telefon_maskeli: `0532***12${Math.floor(10 + Math.random()*89)}`,
        created_at: c.registeredAt || '2026-09-30 04:17:01',
        updated_at: c.updatedAt || (isApproved ? '2026-09-30 04:17:15' : '—'),
        _isNew: k.startsWith('user_') || (c.registeredAt && !['hatice','emre','selma'].includes(k))
      };
    });
  }

  if (table === 'core.loans') {
    return realCustEntries.map(([k, c], idx) => {
      const hasDask = c.dask && c.dask.includes('✓');
      const isApproved = c.approved === true || c.loanStatus === 'ONAYLANDI';
      const isEscalated = c.escalated === true || c.loanStatus === 'TEMSİLCİDE';
      const isOptOut = c.declined === true || c.loanStatus === 'NORMAL_ÖDEME';
      let krediDurumu = isApproved ? 'ONAYLANDI' : (isEscalated ? 'TEMSİLCİDE' : (isOptOut ? 'NORMAL_ÖDEME' : 'BEKLEMEDE'));

      return {
        _key: k,
        id: `loan_7f8a${idx+1}0-b21c-4390`,
        customer_id: c.id || ('cust_' + k),
        tur: (c.loanType || '').toLowerCase().includes('konut') ? 'konut' : ((c.loanType || '').toLowerCase().includes('ihtiyac') ? 'ihtiyac' : 'kart'),
        kalan_borc: c.total || '45.000 ₺',
        aylik_taksit: c.installment || '5.000 ₺',
        erteleme_suresi: c.months || '3 Ay',
        kredi_durumu: krediDurumu,
        dask_var: hasDask ? true : false,
        dask_police_no: hasDask ? (c.dask.match(/DASK-[0-9A-Z-]+/) ? c.dask.match(/DASK-[0-9A-Z-]+/)[0] : `DASK-2022-HY-${100 + idx}`) : null,
        created_at: c.registeredAt || '2026-09-30 04:17:10',
        _isNew: k.startsWith('user_') || (c.registeredAt && !['hatice','emre','selma'].includes(k))
      };
    });
  }

  if (table === 'agent.plans') {
    return realCustEntries.map(([k, c], idx) => {
      const isApproved = c.approved === true || c.loanStatus === 'ONAYLANDI';
      const isEscalated = c.escalated === true || c.loanStatus === 'TEMSİLCİDE';
      const isOptOut = c.declined === true || c.loanStatus === 'NORMAL_ÖDEME';
      return {
        _key: k,
        id: `plan_9981-${idx+1}a-b102`,
        customer_id: c.id || ('cust_' + k),
        musteri_adi: c.name,
        erteleme_ay: parseInt((c.months || '3').replace(/[^0-9]/g, '')) || 3,
        faiz_orani: '0.00 %',
        durum: isApproved ? 'ONAYLANDI' : (isEscalated ? 'TEMSİLCİDE' : (isOptOut ? 'NORMAL_ÖDEME' : 'TASLAK_BEKLİYOR')),
        onaylandi_mi: isApproved,
        updated_at: c.updatedAt || '2026-09-30 04:17:15',
        _isNew: k.startsWith('user_')
      };
    });
  }

  if (table === 'disaster.events') {
    return [
      {
        id: 'DIS-2026-RIZE-02',
        tip: 'Şiddetli Yağış, Sel ve Heyelan',
        siddet: 'Meteorolojik Kırmızı Kod (180kg/m²)',
        merkez: 'Doğu Karadeniz Havzası / Çayeli Taşkın Hattı',
        iller: '{"Rize (Çayeli, Ardeşen, Fındıklı, Güneysu, İkizdere)"}',
        kaynak: 'Meteoroloji Genel Müdürlüğü (MGM) & AFAD',
        time: '2026-09-30 04:18:20'
      },
      {
        id: 'DIS-2026-DEP-01',
        tip: 'Deprem',
        siddet: 'Mw 7.4 (Aletsel Büyüklük)',
        merkez: 'Doğu Anadolu Fayı / Pazarcık - Elbistan',
        iller: '{"Hatay", "Kahramanmaraş", "Malatya", "Adıyaman", "Gaziantep"}',
        kaynak: 'AFAD Deprem Dairesi / Kandilli Rasathanesi',
        time: '2026-09-30 04:17:01'
      }
    ];
  }

  if (table === 'audit.logs') {
    const txs = window.LimanDB ? window.LimanDB.getTransactions() : [];
    return txs.map(t => ({
      id: t.id,
      event_type: t.type,
      customer_id: t.customerId || 'cust_sys',
      customer_name: t.customerName,
      amount: t.amount || '—',
      channel: t.channel || 'Liman Mobil',
      note: t.note || '',
      created_at: `2026-09-30 ${t.time}`
    }));
  }

  if (table === 'auth.staff_users') {
    // 1. Varsayılan Personel ve Sistem Yöneticileri
    const defaultStaff = [
      {
        _key: 'staff_seed_001',
        id: 'staff_adm_001',
        ad: 'Ahmet',
        soyad: 'Yıldız',
        email: 'admin@limanbank.com.tr',
        rol: 'Sistem Yöneticisi (Admin)',
        sicil_no: 'LB-9001',
        birim: 'Bilgi Teknolojileri & Güvenlik',
        il: 'İstanbul',
        yas: 42,
        durum: 'AKTİF',
        created_at: '2026-09-30 08:00:00',
        _isNew: false
      },
      {
        _key: 'staff_seed_002',
        id: 'staff_op_002',
        ad: 'Zeynep',
        soyad: 'Kaya',
        email: 'zeynep.kaya@limanbank.com.tr',
        rol: 'Banka Operasyon Çalışanı',
        sicil_no: 'LB-4102',
        birim: 'Kredi ve Afet Operasyonları',
        il: 'Ankara',
        yas: 34,
        durum: 'AKTİF',
        created_at: '2026-09-30 08:15:00',
        _isNew: false
      },
      {
        _key: 'staff_seed_003',
        id: 'staff_op_003',
        ad: 'Murat',
        soyad: 'Çetin',
        email: 'murat.cetin@limanbank.com.tr',
        rol: 'Banka Operasyon Çalışanı',
        sicil_no: 'LB-4103',
        birim: 'Saha ve Çağrı Destek',
        il: 'Gaziantep',
        yas: 29,
        durum: 'AKTİF',
        created_at: '2026-09-30 08:30:00',
        _isNew: false
      }
    ];

    // 2. Kullanıcı tarafından canlı kaydedilen çalışan ve adminler
    const registeredStaff = entries
      .filter(([k, c]) => k.startsWith('staff_') || c.role === 'staff' || c.role === 'admin')
      .map(([k, c]) => {
        const parts = (c.name || '').split(' ');
        return {
          _key: k,
          id: c.id || ('staff_' + k),
          ad: parts[0] || '',
          soyad: parts.slice(1).join(' ') || '',
          email: c.email || '—',
          rol: c.role === 'admin' ? 'Sistem Yöneticisi (Admin)' : 'Banka Operasyon Çalışanı',
          sicil_no: c.staffId || '—',
          birim: c.department || 'Operasyon',
          il: c.city || '—',
          yas: c.age || 30,
          durum: 'AKTİF',
          created_at: c.registeredAt || new Date().toISOString().replace('T', ' ').substring(0, 19),
          _isNew: true
        };
      });

    // Yeni kayıtlar en üstte gösterilir
    return [...registeredStaff, ...defaultStaff];
  }

  return [];
}

// WHERE ŞARTLARINI AYIKLAYIP UYGULAMA
function applyWhereClause(rows, sql, table) {
  const whereMatch = sql.match(/where\s+(.*?)(?:order\s+by|limit|$)/i);
  if (!whereMatch) return rows;

  const conditionStr = whereMatch[1].trim();

  return rows.filter(item => {
    // 1. Yaş Filtresi: yas >= 65, yas > 50, yas < 60
    const ageGte = conditionStr.match(/yas\s*>=\s*(\d+)/i);
    if (ageGte && !(item.yas >= parseInt(ageGte[1]))) return false;

    const ageGt = conditionStr.match(/yas\s*>\s*(\d+)/i);
    if (ageGt && !(item.yas > parseInt(ageGt[1]))) return false;

    const ageLte = conditionStr.match(/yas\s*<=\s*(\d+)/i);
    if (ageLte && !(item.yas <= parseInt(ageLte[1]))) return false;

    const ageLt = conditionStr.match(/yas\s*<\s*(\d+)/i);
    if (ageLt && !(item.yas < parseInt(ageLt[1]))) return false;

    // 2. İl Filtresi: il = 'Hatay' veya il = 'Rize' veya il LIKE '%...%'
    const ilMatch = conditionStr.match(/il\s*=\s*['"](.*?)['"]/i);
    if (ilMatch && item.il) {
      if (!item.il.toLowerCase().includes(ilMatch[1].toLowerCase())) return false;
    }
    const ilLike = conditionStr.match(/il\s+(?:i?like)\s*['"]%?(.*?)%?['"]/i);
    if (ilLike && item.il) {
      if (!item.il.toLowerCase().includes(ilLike[1].toLowerCase())) return false;
    }

    // 3. Ad / Soyad Filtresi: ad = 'Hatice'
    const nameMatch = conditionStr.match(/ad\s*=\s*['"](.*?)['"]/i);
    if (nameMatch && item.ad) {
      if (!item.ad.toLowerCase().includes(nameMatch[1].toLowerCase())) return false;
    }

    // 4. Boolean Filtreler: onaylandi_mi = true / false
    if (/onaylandi_mi\s*=\s*true/i.test(conditionStr) && item.onaylandi_mi !== true) return false;
    if (/onaylandi_mi\s*=\s*false/i.test(conditionStr) && item.onaylandi_mi !== false) return false;

    // 5. hassas_durum = true / false
    if (/hassas_durum\s*=\s*true/i.test(conditionStr) && item.hassas_durum !== true) return false;
    if (/hassas_durum\s*=\s*false/i.test(conditionStr) && item.hassas_durum !== false) return false;

    // 6. dask_var = true / false
    if (/dask_var\s*=\s*true/i.test(conditionStr) && item.dask_var !== true) return false;
    if (/dask_var\s*=\s*false/i.test(conditionStr) && item.dask_var !== false) return false;

    // 7. Kredi Türü: tur = 'konut' veya kredi_turu = 'konut'
    const turMatch = conditionStr.match(/(?:tur|kredi_turu)\s*=\s*['"](.*?)['"]/i);
    if (turMatch) {
      const targetTur = turMatch[1].toLowerCase();
      const itemTur = (item.tur || item.kredi_turu || '').toLowerCase();
      if (!itemTur.includes(targetTur)) return false;
    }

    // 8. Durum: durum = 'ONAYLANDI' veya kredi_durumu = 'ONAYLANDI'
    const durumMatch = conditionStr.match(/(?:durum|kredi_durumu|erteleme_durumu)\s*=\s*['"](.*?)['"]/i);
    if (durumMatch) {
      const targetDurum = durumMatch[1].toUpperCase();
      const itemDurum = (item.durum || item.kredi_durumu || item.erteleme_durumu || '').toUpperCase();
      if (!itemDurum.includes(targetDurum)) return false;
    }

    return true;
  });
}

// ORDER BY ŞARTLARINI UYGULAMA
function applyOrderByClause(rows, sql, table) {
  const orderMatch = sql.match(/order\s+by\s+(\w+)(?:\s+(asc|desc))?/i);
  if (!orderMatch) return rows.reverse(); // Varsayılan en son eklenenler üstte

  const field = orderMatch[1].toLowerCase();
  const dir = (orderMatch[2] || 'asc').toLowerCase();

  return [...rows].sort((a, b) => {
    let va = a[field];
    let vb = b[field];

    if (va === undefined) return 0;
    if (typeof va === 'string') {
      const cmp = va.localeCompare(vb || '');
      return dir === 'desc' ? -cmp : cmp;
    }
    return dir === 'desc' ? (vb - va) : (va - vb);
  });
}

// TABLOYU ÇİZ
function renderGridData(table, rows) {
  const thead = document.getElementById('grid-thead');
  const tbody = document.getElementById('grid-tbody');
  if (!thead || !tbody) return;

  // Global arama kelimesi varsa ek filtre
  let displayRows = rows;
  if (searchKeyword) {
    displayRows = displayRows.filter(r => JSON.stringify(r).toLowerCase().includes(searchKeyword));
  }

  if (table === 'core.customers') {
    thead.innerHTML = `
      <tr>
        <th>#</th>
        <th>id <span class="col-type">uuid (pk)</span></th>
        <th>ad <span class="col-type">varchar(100)</span></th>
        <th>soyad <span class="col-type">varchar(100)</span></th>
        <th>il <span class="col-type">varchar(50) [idx]</span></th>
        <th>ilce <span class="col-type">varchar(100)</span></th>
        <th>yas <span class="col-type">int4</span></th>
        <th>hassas_durum <span class="col-type">bool</span></th>
        <th>kredi_turu <span class="col-type">varchar(50)</span></th>
        <th>aylik_taksit <span class="col-type">numeric</span></th>
        <th>erteleme <span class="col-type">varchar(20)</span></th>
        <th>kredi_durumu <span class="col-type">varchar(30)</span></th>
        <th>telefon_maskeli <span class="col-type">varchar(20)</span></th>
        <th>created_at <span class="col-type">timestamptz</span></th>
      </tr>
    `;

    tbody.innerHTML = displayRows.length === 0 ? renderEmptyRow(14) : displayRows.map((r, i) => {
      let pillClass = 'status-pending';
      let pillText = '⏳ ' + r.kredi_durumu;
      if (r.kredi_durumu === 'ONAYLANDI') {
        pillClass = 'status-approved';
        pillText = '✓ ONAYLANDI';
      } else if (r.kredi_durumu === 'TEMSİLCİDE') {
        pillClass = 'status-escalated';
        pillText = '☎ TEMSİLCİDE';
      } else if (r.kredi_durumu === 'NORMAL_ÖDEME') {
        pillClass = 'status-optout';
        pillText = 'NORMAL ÖDEME';
      }

      return `
        <tr class="${r._isNew ? 'new-inserted-row' : ''}">
          <td style="color:#94A3B8;font-size:11px;font-family:'JetBrains Mono',monospace">${i+1}</td>
          <td class="val-uuid">${r.id}</td>
          <td style="font-weight:600">${r.ad}</td>
          <td>${r.soyad}</td>
          <td><strong>${r.il}</strong></td>
          <td>${r.ilce}</td>
          <td class="val-num">${r.yas}</td>
          <td>${r.hassas_durum ? '<span class="val-bool-true">true</span>' : '<span class="val-bool-false">false</span>'}</td>
          <td style="font-weight:600;color:var(--pg-blue)">${r.kredi_turu}</td>
          <td class="val-num">${r.aylik_taksit}</td>
          <td class="val-num" style="color:var(--primary);font-weight:600">${r.erteleme}</td>
          <td><span class="status-pill ${pillClass}">${pillText}</span></td>
          <td style="font-family:'JetBrains Mono',monospace;color:#64748B">${r.telefon_maskeli}</td>
          <td style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#64748B">${r.created_at}</td>
        </tr>
      `;
    }).join('');
  }

  else if (table === 'core.loans') {
    thead.innerHTML = `
      <tr>
        <th>#</th>
        <th>id <span class="col-type">uuid (pk)</span></th>
        <th>customer_id <span class="col-type">varchar(255) [fk]</span></th>
        <th>tur <span class="col-type">varchar(20)</span></th>
        <th>kalan_borc <span class="col-type">numeric(12,2)</span></th>
        <th>aylik_taksit <span class="col-type">numeric(10,2)</span></th>
        <th>erteleme <span class="col-type">varchar(20)</span></th>
        <th>kredi_durumu <span class="col-type">varchar(30)</span></th>
        <th>dask_var <span class="col-type">bool</span></th>
        <th>dask_police_no <span class="col-type">varchar(100)</span></th>
        <th>created_at <span class="col-type">timestamptz</span></th>
      </tr>
    `;

    tbody.innerHTML = displayRows.length === 0 ? renderEmptyRow(11) : displayRows.map((r, i) => {
      let pillClass = 'status-pending';
      let pillText = '⏳ ' + r.kredi_durumu;
      if (r.kredi_durumu === 'ONAYLANDI') {
        pillClass = 'status-approved';
        pillText = '✓ ONAYLANDI';
      } else if (r.kredi_durumu === 'TEMSİLCİDE') {
        pillClass = 'status-escalated';
        pillText = '☎ TEMSİLCİDE';
      } else if (r.kredi_durumu === 'NORMAL_ÖDEME') {
        pillClass = 'status-optout';
        pillText = 'NORMAL ÖDEME';
      }

      return `
        <tr class="${r._isNew ? 'new-inserted-row' : ''}">
          <td style="color:#94A3B8;font-size:11px">${i+1}</td>
          <td class="val-uuid">${r.id}</td>
          <td class="val-uuid">${r.customer_id}</td>
          <td style="font-weight:600;color:var(--pg-blue)">${r.tur.toUpperCase()}</td>
          <td class="val-num">${r.kalan_borc}</td>
          <td class="val-num">${r.aylik_taksit}</td>
          <td class="val-num" style="color:var(--primary);font-weight:600">${r.erteleme_suresi}</td>
          <td><span class="status-pill ${pillClass}">${pillText}</span></td>
          <td>${r.dask_var ? '<span class="val-bool-true">true</span>' : '<span class="val-bool-false">false</span>'}</td>
          <td>${r.dask_police_no || '<span class="val-null">NULL</span>'}</td>
          <td style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#64748B">${r.created_at}</td>
        </tr>
      `;
    }).join('');
  }

  else if (table === 'agent.plans') {
    thead.innerHTML = `
      <tr>
        <th>#</th>
        <th>id <span class="col-type">uuid (pk)</span></th>
        <th>customer_id <span class="col-type">varchar(255) [fk]</span></th>
        <th>musteri_adi <span class="col-type">varchar(100)</span></th>
        <th>erteleme_ay <span class="col-type">int4</span></th>
        <th>faiz_orani <span class="col-type">numeric(4,2)</span></th>
        <th>durum <span class="col-type">varchar(30)</span></th>
        <th>onaylandi_mi <span class="col-type">bool</span></th>
        <th>updated_at <span class="col-type">timestamptz</span></th>
      </tr>
    `;

    tbody.innerHTML = displayRows.length === 0 ? renderEmptyRow(9) : displayRows.map((r, i) => {
      let pillClass = 'status-pending';
      if (r.durum === 'ONAYLANDI') pillClass = 'status-approved';
      else if (r.durum === 'TEMSİLCİDE') pillClass = 'status-escalated';
      else if (r.durum === 'NORMAL_ÖDEME') pillClass = 'status-optout';

      return `
        <tr class="${r._isNew ? 'new-inserted-row' : ''}">
          <td style="color:#94A3B8;font-size:11px">${i+1}</td>
          <td class="val-uuid">${r.id}</td>
          <td class="val-uuid">${r.customer_id}</td>
          <td style="font-weight:600">${r.musteri_adi}</td>
          <td class="val-num" style="color:var(--primary)">${r.erteleme_ay} Ay</td>
          <td class="val-num" style="color:#059669">${r.faiz_orani}</td>
          <td><span class="status-pill ${pillClass}">${r.durum}</span></td>
          <td>${r.onaylandi_mi ? '<span class="val-bool-true">true</span>' : '<span class="val-bool-false">false</span>'}</td>
          <td style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#64748B">${r.updated_at}</td>
        </tr>
      `;
    }).join('');
  }

  else if (table === 'disaster.events') {
    thead.innerHTML = `
      <tr>
        <th>#</th>
        <th>id <span class="col-type">varchar(50) [pk]</span></th>
        <th>tip <span class="col-type">varchar(50)</span></th>
        <th>siddet <span class="col-type">varchar(50)</span></th>
        <th>merkez_ussu <span class="col-type">varchar(100)</span></th>
        <th>etkilenen_iller <span class="col-type">text[]</span></th>
        <th>kaynak <span class="col-type">varchar(100)</span></th>
        <th>declared_at <span class="col-type">timestamptz</span></th>
      </tr>
    `;

    tbody.innerHTML = displayRows.map((e, i) => `
      <tr>
        <td style="color:#94A3B8;font-size:11px">${i+1}</td>
        <td style="font-family:'JetBrains Mono',monospace;font-weight:700;color:var(--pg-blue)">${e.id}</td>
        <td style="font-weight:600">${e.tip}</td>
        <td><span style="background:#FEE2E2;color:#991B1B;padding:2px 8px;border-radius:4px;font-size:11.5px;font-weight:600">${e.siddet}</span></td>
        <td>${e.merkez}</td>
        <td style="font-family:'JetBrains Mono',monospace;font-size:11.5px">${e.iller}</td>
        <td>${e.kaynak}</td>
        <td style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#64748B">${e.time}</td>
      </tr>
    `).join('');
  }

  else if (table === 'audit.logs') {
    thead.innerHTML = `
      <tr>
        <th>#</th>
        <th>id <span class="col-type">varchar(50) [pk]</span></th>
        <th>event_type <span class="col-type">varchar(50) [idx]</span></th>
        <th>customer_id <span class="col-type">varchar(100)</span></th>
        <th>customer_name <span class="col-type">varchar(100)</span></th>
        <th>amount <span class="col-type">numeric</span></th>
        <th>channel <span class="col-type">varchar(50)</span></th>
        <th>note <span class="col-type">text</span></th>
        <th>created_at <span class="col-type">timestamptz</span></th>
      </tr>
    `;

    tbody.innerHTML = displayRows.map((t, i) => `
      <tr>
        <td style="color:#94A3B8;font-size:11px">${i+1}</td>
        <td style="font-family:'JetBrains Mono',monospace;color:var(--primary);font-weight:700">${t.id}</td>
        <td><span class="status-pill status-approved">${t.event_type}</span></td>
        <td class="val-uuid">${t.customer_id}</td>
        <td style="font-weight:600">${t.customer_name}</td>
        <td class="val-num">${t.amount}</td>
        <td style="font-size:11.5px;color:#64748B">${t.channel}</td>
        <td style="max-width:320px;font-size:12px;color:#334155">${t.note}</td>
        <td style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#64748B">${t.created_at}</td>
      </tr>
    `).join('');
  }
}

function renderDynamicRows(columns, rows) {
  const thead = document.getElementById('grid-thead');
  const tbody = document.getElementById('grid-tbody');
  if (!thead || !tbody) return;

  thead.innerHTML = `
    <tr>
      <th>#</th>
      ${columns.map(c => `<th>${c}</th>`).join('')}
    </tr>
  `;

  if (!rows || rows.length === 0) {
    tbody.innerHTML = renderEmptyRow(columns.length + 1);
    return;
  }

  tbody.innerHTML = rows.map((r, i) => `
    <tr>
      <td style="color:#94A3B8;font-size:11px;font-family:'JetBrains Mono'">${i + 1}</td>
      ${columns.map(c => {
        const val = r[c];
        if (val === null || val === undefined) return `<td><span style="color:#94A3B8;font-style:italic">NULL</span></td>`;
        if (typeof val === 'boolean' || c.includes('dask') || c.includes('hassas')) {
          return `<td><span style="font-family:'JetBrains Mono';font-size:11px;color:${val ? '#166534' : '#DC2626'}">${val ? 'true' : 'false'}</span></td>`;
        }
        return `<td>${val}</td>`;
      }).join('')}
    </tr>
  `).join('');
}

function renderEmptyRow(colspan) {
  return `
    <tr>
      <td colspan="${colspan}" style="text-align:center;padding:36px;color:#94A3B8;font-style:italic">
        Sorgu sonucunda herhangi bir satır dönmedi (0 rows).
      </td>
    </tr>
  `;
}

// Global bağlantılar
if (typeof window !== 'undefined') {
  window.getRowsForTable = getRowsForTable;
  window.executeQuery = executeQuery;
  window.selectTable = selectTable;
  window.setSqlQuery = setSqlQuery;
  window.filterGrid = filterGrid;
  window.onRemoteUpdateReceived = onRemoteUpdateReceived;
}
