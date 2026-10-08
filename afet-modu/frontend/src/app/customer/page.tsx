'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost/api'
const SSE_URL = process.env.NEXT_PUBLIC_SSE_URL || 'http://localhost/api/agent/stream'

type CustomerPlan = {
  plan_id: string
  event_id: string
  customer_id: string
  oncelik: 'yuksek' | 'normal'
  erteleme_ay: number
  belgeler: string[]
  mesaj: string
  durum: 'taslak' | 'onaylandi' | 'devredildi'
  neden_devir?: string
  created_at: string
}

type CustomerInfo = {
  id: string
  ad: string
  soyad: string
  il: string
  ilce: string
  yas: number
  hassas_durum: boolean
  engelli: boolean
  telefon_maskeli?: string
}

type LoanInfo = {
  id: string
  tur: string
  kalan_borc: number
  aylik_taksit: number
  dask_var?: boolean
  dask_police_no?: string
}

export default function CustomerPortal() {
  const router = useRouter()
  const [customer, setCustomer] = useState<CustomerInfo | null>(null)
  const [plans, setPlans] = useState<CustomerPlan[]>([])
  const [loans, setLoans] = useState<LoanInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null)
  const [showEscalateModal, setShowEscalateModal] = useState(false)
  const [escalateReason, setEscalateReason] = useState('sure_asimi')
  const [escalateNote, setEscalateNote] = useState('')
  const [activePlanId, setActivePlanId] = useState<string | null>(null)

  const sseRef = useRef<EventSource | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/')
      return
    }
    loadData()
    startSSE()
    return () => sseRef.current?.close()
  }, [])

  async function authFetch(url: string, opts?: RequestInit) {
    const token = localStorage.getItem('token')
    return fetch(url, {
      ...opts,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...opts?.headers },
    })
  }

  async function loadData() {
    setLoading(true)
    try {
      // 1. Profil ve customer_id
      const meRes = await authFetch(`${API}/auth/me`)
      let customerId = localStorage.getItem('customer_id')
      if (meRes.ok) {
        const me = await meRes.json()
        if (me.customer_id) customerId = me.customer_id
      }

      if (!customerId) {
        customerId = 'cust_hatice_001' // Varsayılan demo müşterisi
      }

      // 2. Müşteri bilgisi getir
      try {
        const cRes = await authFetch(`${API}/core/customers/${customerId}`)
        if (cRes.ok) {
          const cData = await cRes.json()
          setCustomer(cData)
        } else {
          // Mock müşteri görünümü
          setCustomer({
            id: customerId,
            ad: 'Hatice',
            soyad: 'Y.',
            il: 'Hatay',
            ilce: 'Antakya',
            yas: 72,
            hassas_durum: true,
            engelli: false,
            telefon_maskeli: '05**_***_**12',
          })
        }
      } catch {
        setCustomer({
          id: customerId,
          ad: 'Hatice',
          soyad: 'Y.',
          il: 'Hatay',
          ilce: 'Antakya',
          yas: 72,
          hassas_durum: true,
          engelli: false,
          telefon_maskeli: '05**_***_**12',
        })
      }

      // 3. Kredi bilgileri
      try {
        const lRes = await authFetch(`${API}/core/loans?customer_id=${customerId}`)
        if (lRes.ok) {
          const lData = await lRes.json()
          setLoans(lData.items || [])
        }
      } catch { }

      // 4. Müşteriye ait planları getir
      const pRes = await authFetch(`${API}/agent/plans?customer_id=${customerId}`)
      if (pRes.ok) {
        const pData = await pRes.json()
        setPlans(pData.items || [])
      }
    } catch (err: any) {
      console.error('Veri yükleme hatası:', err)
    } finally {
      setLoading(false)
    }
  }

  function startSSE() {
    try {
      const sse = new EventSource(SSE_URL)
      sseRef.current = sse

      sse.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data)
          if (event.type === 'plan.drafted' || event.type === 'plan.approved' || event.type === 'plan.escalated') {
            loadData()
          }
        } catch { }
      }
    } catch { }
  }

  async function handleApprove(planId: string) {
    if (!confirm('Erteleme talebinizi onaylayarak banka değerlendirme havuzuna iletmek istiyor musunuz?')) return
    setActionLoading(true)
    try {
      const res = await authFetch(`${API}/agent/plans/${planId}/approve`, { method: 'POST' })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.detail || 'Onay iletilemedi')
      }
      setActionNotice({
        type: 'success',
        text: 'Talebiniz başarıyla alındı. İnceleme için banka yetkilisine iletildi. Nihai sonuç SMS ile bildirilecektir.',
      })
      await loadData()
    } catch (err: any) {
      setActionNotice({ type: 'error', text: err.message })
    } finally {
      setActionLoading(false)
    }
  }

  async function handleEscalateSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!activePlanId) return
    setActionLoading(true)
    try {
      const res = await authFetch(`${API}/agent/plans/${activePlanId}/escalate`, {
        method: 'POST',
        body: JSON.stringify({ neden: escalateReason }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.detail || 'Devir işlemi iletilemedi')
      }
      setShowEscalateModal(false)
      setActionNotice({
        type: 'info',
        text: 'Talebiniz müşteri temsilcimize öncelikli olarak aktarıldı. En kısa sürede telefon ile aranacaksınız.',
      })
      await loadData()
    } catch (err: any) {
      setActionNotice({ type: 'error', text: err.message })
    } finally {
      setActionLoading(false)
    }
  }

  function handleLogout() {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    localStorage.removeItem('customer_id')
    router.push('/')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#090B0F', color: '#F1F3F7', fontFamily: "'Inter', sans-serif" }}>
      {/* Üst Bar */}
      <header style={{
        background: '#111318', borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 40,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            background: 'rgba(255,98,0,0.15)', border: '1px solid rgba(255,98,0,0.3)',
            borderRadius: '8px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <span style={{ fontSize: '18px' }}>🚨</span>
            <span style={{ fontWeight: 700, color: '#FF6200', fontSize: '15px' }}>ING Afet Destek Portalı</span>
          </div>
          <span style={{
            fontSize: '11px', background: 'rgba(52,211,153,0.1)', color: '#34D399',
            padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(52,211,153,0.2)',
          }}>
            ● Canlı Hat
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {customer && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '13px', fontWeight: 600 }}>Sayın {customer.ad} {customer.soyad}</div>
              <div style={{ fontSize: '11px', color: '#8B9AB1' }}>{customer.il} / {customer.ilce}</div>
            </div>
          )}
          <button
            onClick={handleLogout}
            style={{
              padding: '6px 14px', background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px',
              color: '#8B9AB1', fontSize: '12px', cursor: 'pointer',
            }}
          >
            Çıkış Yap
          </button>
        </div>
      </header>

      {/* Ana İçerik */}
      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '24px 16px' }}>
        {/* Karşılama ve Durum Kartı */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(255,98,0,0.08) 0%, rgba(17,19,24,0.95) 100%)',
          border: '1px solid rgba(255,98,0,0.25)', borderRadius: '16px', padding: '24px', marginBottom: '24px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#FF6200', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                Öncelikli Müşteri Bilgilendirmesi
              </div>
              <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0, color: '#FFFFFF' }}>
                Geçmiş Olsun, Sayın {customer?.ad || 'Müşterimiz'}
              </h1>
            </div>
            {customer?.hassas_durum && (
              <span style={{
                background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                color: '#FCA5A5', fontSize: '12px', padding: '4px 10px', borderRadius: '20px', fontWeight: 600,
              }}>
                ⭐ Hassas Durum · Öncelikli Takip
              </span>
            )}
          </div>

          <p style={{ fontSize: '14px', lineHeight: '1.6', color: '#CBD5E1', margin: 0 }}>
            Yaşadığınız afetten dolayı derin üzüntü duyuyoruz. Banka olarak yanınızdayız; şubeye gitmenize veya başvuru formlarıyla uğraşmanıza gerek kalmadan kredileriniz için kolaylaştırıcı çözümler hazırladık.
          </p>
        </div>

        {/* Aksiyon Bildirimi */}
        {actionNotice && (
          <div style={{
            padding: '14px 18px', borderRadius: '10px', marginBottom: '20px',
            background: actionNotice.type === 'success' ? 'rgba(52,211,153,0.12)' : actionNotice.type === 'info' ? 'rgba(59,130,246,0.12)' : 'rgba(239,68,68,0.12)',
            border: `1px solid ${actionNotice.type === 'success' ? '#34D399' : actionNotice.type === 'info' ? '#60A5FA' : '#F87171'}`,
            color: actionNotice.type === 'success' ? '#A7F3D0' : actionNotice.type === 'info' ? '#BFDBFE' : '#FECACA',
            fontSize: '13px', lineHeight: '1.5', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span>{actionNotice.text}</span>
            <button onClick={() => setActionNotice(null)} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '16px' }}>×</button>
          </div>
        )}

        {/* Plan Listesi / Plan Kartı */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#8B9AB1' }}>
            <div style={{ fontSize: '24px', marginBottom: '12px' }}>⏳</div>
            <div>Müşteri ve kredi verileriniz getiriliyor...</div>
          </div>
        ) : plans.length === 0 ? (
          /* Henüz plan yoksa */
          <div style={{
            background: '#111318', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '14px', padding: '32px 24px', textAlign: 'center', marginBottom: '24px',
          }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>🛡️</div>
            <h2 style={{ fontSize: '17px', fontWeight: 600, marginBottom: '8px' }}>
              Şu Anda Bekleyen Bir Erteleme Taslağı Bulunmuyor
            </h2>
            <p style={{ fontSize: '13px', color: '#8B9AB1', maxWidth: '480px', margin: '0 auto 20px', lineHeight: '1.6' }}>
              Bölgenizdeki resmi afet ilanları sistemimizce otomatik olarak taranmaktadır. Bir afet tespiti halinde erteleme planınız otomatik olarak buraya yansıyacaktır.
            </p>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: 'rgba(255,98,0,0.08)', border: '1px solid rgba(255,98,0,0.2)',
              borderRadius: '8px', padding: '10px 18px', color: '#FF6200', fontSize: '13px',
            }}>
              📞 7/24 Afet Destek Hattı: <strong>0850 222 0 600</strong>
            </div>
          </div>
        ) : (
          /* Hazırlanan Planlar */
          plans.map((p) => {
            const isPending = p.durum === 'taslak'
            const isApproved = p.durum === 'onaylandi'
            const isEscalated = p.durum === 'devredildi'

            return (
              <div
                key={p.plan_id}
                style={{
                  background: '#111318', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '16px', padding: '24px', marginBottom: '24px',
                }}
              >
                {/* Başlık ve Durum */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '20px' }}>📋</span>
                    <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>
                      Kredi Erteleme Taslağınız
                    </h2>
                  </div>
                  <div>
                    {isPending && (
                      <span style={{
                        background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)',
                        color: '#FCD34D', fontSize: '12px', padding: '4px 12px', borderRadius: '20px', fontWeight: 600,
                      }}>
                        Onayınızı Bekliyor
                      </span>
                    )}
                    {isApproved && (
                      <span style={{
                        background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)',
                        color: '#6EE7B7', fontSize: '12px', padding: '4px 12px', borderRadius: '20px', fontWeight: 600,
                      }}>
                        ✓ Onaylandı (Banka İncelemesinde)
                      </span>
                    )}
                    {isEscalated && (
                      <span style={{
                        background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
                        color: '#A5B4FC', fontSize: '12px', padding: '4px 12px', borderRadius: '20px', fontWeight: 600,
                      }}>
                        ☎ Temsilciye Devredildi
                      </span>
                    )}
                  </div>
                </div>

                {/* Ajan Tarafından Üretilen Kişiselleştirilmiş Mesaj */}
                <div style={{
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '12px', padding: '18px', marginBottom: '20px',
                  fontStyle: 'italic', color: '#E2E8F0', fontSize: '14px', lineHeight: '1.7',
                }}>
                  "{p.mesaj}"
                </div>

                {/* Plan Özet Tablosu */}
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '12px', marginBottom: '22px',
                }}>
                  <div style={{ background: '#0A0C10', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '11px', color: '#8B9AB1', marginBottom: '4px' }}>ÖNERİLEN ERTELEME</div>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: '#FF6200' }}>
                      {p.erteleme_ay} Ay
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>Faizsiz ve cezasız öteleme</div>
                  </div>

                  <div style={{ background: '#0A0C10', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '11px', color: '#8B9AB1', marginBottom: '4px' }}>İŞLEM TÜRÜ</div>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: '#F1F3F7' }}>
                      Anapara & Faiz Ötelemesi
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>Taksitler vade sonuna eklenir</div>
                  </div>

                  <div style={{ background: '#0A0C10', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '11px', color: '#8B9AB1', marginBottom: '4px' }}>DEĞERLENDİRME</div>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: p.oncelik === 'yuksek' ? '#F87171' : '#60A5FA' }}>
                      {p.oncelik === 'yuksek' ? '🔴 Yüksek Öncelikli' : '🔵 Standart'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>İnsan onayı zorunludur</div>
                  </div>
                </div>

                {/* Gerekli Belgeler Bölümü */}
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#8B9AB1', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Gerekli Belgeler & Teslimat Kolaylığı
                  </div>
                  <div style={{ background: '#0A0C10', borderRadius: '10px', padding: '14px 18px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    {p.belgeler && p.belgeler.length > 0 ? (
                      <ul style={{ margin: 0, paddingLeft: '20px', color: '#CBD5E1', fontSize: '13px', lineHeight: '1.8' }}>
                        {p.belgeler.map((b, idx) => (
                          <li key={idx}>
                            <strong>{b}</strong>
                            {b.toLowerCase().includes('kimlik') && <span style={{ color: '#34D399', fontSize: '11px', marginLeft: '8px' }}>✓ Sistemde kayıtlı</span>}
                            {b.toLowerCase().includes('dask') && <span style={{ color: '#60A5FA', fontSize: '11px', marginLeft: '8px' }}>ℹ DASK kaydınız sorgulanacak</span>}
                            {b.toLowerCase().includes('hasar') && <span style={{ color: '#FBBF24', fontSize: '11px', marginLeft: '8px' }}>⏱ 60 gün içinde iletilebilir</span>}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div style={{ color: '#8B9AB1', fontSize: '13px' }}>Ek belge talep edilmemektedir.</div>
                    )}
                    <div style={{ fontSize: '11px', color: '#64748B', marginTop: '10px' }}>
                      * Belgelerinizi şubeye gitmeden mobil uygulama üzerinden veya e-Devlet barkodu ile daha sonra da yükleyebilirsiniz.
                    </div>
                  </div>
                </div>

                {/* Müşteri Butonları */}
                {isPending && (
                  <div style={{
                    display: 'flex', gap: '12px', flexWrap: 'wrap',
                    paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)',
                  }}>
                    <button
                      id="approve-plan-btn"
                      onClick={() => handleApprove(p.plan_id)}
                      disabled={actionLoading}
                      style={{
                        flex: '1 1 200px', padding: '12px 20px', background: '#FF6200',
                        color: '#FFFFFF', border: 'none', borderRadius: '8px',
                        fontSize: '14px', fontWeight: 700, cursor: 'pointer',
                        boxShadow: '0 4px 15px rgba(255,98,0,0.3)',
                        transition: 'opacity 0.2s',
                        opacity: actionLoading ? 0.7 : 1,
                      }}
                    >
                      ✓ Planı Uygun Buluyorum, Onayla
                    </button>

                    <button
                      id="escalate-modal-btn"
                      onClick={() => {
                        setActivePlanId(p.plan_id)
                        setShowEscalateModal(true)
                      }}
                      disabled={actionLoading}
                      style={{
                        flex: '1 1 180px', padding: '12px 18px', background: 'rgba(255,255,255,0.07)',
                        color: '#F1F3F7', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px',
                        fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      ☎ Temsilci Beni Arasın / İtiraz Et
                    </button>
                  </div>
                )}

                {isApproved && (
                  <div style={{
                    padding: '14px 18px', background: 'rgba(52,211,153,0.08)',
                    borderRadius: '8px', border: '1px solid rgba(52,211,153,0.2)',
                    fontSize: '13px', color: '#A7F3D0',
                  }}>
                    📌 <strong>Onayınız Alındı:</strong> Talebiniz banka görevlisine iletilmiştir. Bankacılık Kanunu gereği son onay yetkili personel tarafından verilerek tarafınıza SMS ve e-posta ile bildirim sağlanacaktır.
                  </div>
                )}

                {isEscalated && (
                  <div style={{
                    padding: '14px 18px', background: 'rgba(99,102,241,0.08)',
                    borderRadius: '8px', border: '1px solid rgba(99,102,241,0.2)',
                    fontSize: '13px', color: '#C7D2FE',
                  }}>
                    📞 <strong>Temsilciye Yönlendirildi:</strong> Özel durumunuz veya süreyi değiştirme talebiniz kaydedildi. Afet Öncelik Masası temsilcimiz en kısa sürede sizi arayacaktır.
                  </div>
                )}
              </div>
            )
          })
        )}

        {/* Müşterinin Mevcut Kredileri */}
        {loans.length > 0 && (
          <div style={{
            background: '#111318', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '14px', padding: '20px', marginBottom: '24px',
          }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '14px', color: '#E2E8F0' }}>
              💳 Mevcut Kredi Durumunuz
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              {loans.map((l) => (
                <div key={l.id} style={{ background: '#0A0C10', padding: '14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'capitalize', color: '#FF6200' }}>
                      {l.tur} Kredisi
                    </span>
                    <span style={{ fontSize: '11px', color: '#8B9AB1' }}>#{l.id.slice(0, 10)}</span>
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>
                    {l.kalan_borc.toLocaleString('tr-TR')} ₺
                  </div>
                  <div style={{ fontSize: '12px', color: '#8B9AB1' }}>
                    Aylık taksit: <strong>{l.aylik_taksit.toLocaleString('tr-TR')} ₺</strong>
                  </div>
                  {l.dask_var !== undefined && (
                    <div style={{ fontSize: '11px', marginTop: '6px', color: l.dask_var ? '#34D399' : '#F87171' }}>
                      {l.dask_var ? `✓ DASK Poliçesi: ${l.dask_police_no || 'Aktif'}` : '⚠ DASK Kaydı Bulunamadı'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Acil Durum & Afet Destek Bilgileri */}
        <div style={{
          background: '#111318', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '14px', padding: '20px',
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#94A3B8' }}>
            ℹ️ Acil Yardım & Destek İletişim Kanalları
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', fontSize: '12px' }}>
            <div style={{ background: '#0A0C10', padding: '10px 14px', borderRadius: '6px' }}>
              <div style={{ color: '#8B9AB1' }}>AFAD Acil</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#F1F3F7' }}>122</div>
            </div>
            <div style={{ background: '#0A0C10', padding: '10px 14px', borderRadius: '6px' }}>
              <div style={{ color: '#8B9AB1' }}>Türk Kızılay</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#F1F3F7' }}>168</div>
            </div>
            <div style={{ background: '#0A0C10', padding: '10px 14px', borderRadius: '6px' }}>
              <div style={{ color: '#8B9AB1' }}>ING Afet Masası</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#FF6200' }}>0850 222 0 600</div>
            </div>
            <div style={{ background: '#0A0C10', padding: '10px 14px', borderRadius: '6px' }}>
              <div style={{ color: '#8B9AB1' }}>DASK Çağrı</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#F1F3F7' }}>125</div>
            </div>
          </div>
        </div>
      </main>

      {/* Temsilci Devir / İtiraz Modalı */}
      {showEscalateModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 50,
        }}>
          <div style={{
            background: '#161A23', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '16px', maxWidth: '460px', width: '100%', padding: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
              Temsilci Talebi ve Geri Bildirim
            </h3>
            <p style={{ fontSize: '13px', color: '#8B9AB1', marginBottom: '18px', lineHeight: '1.5' }}>
              Hazırlanan taslak durumunuza uymuyorsa veya farklı bir erteleme talep ediyorsanız temsilcimiz sizi arasın.
            </p>

            <form onSubmit={handleEscalateSubmit}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#CBD5E1', marginBottom: '6px', fontWeight: 600 }}>
                  Talep / İtiraz Nedeni
                </label>
                <select
                  value={escalateReason}
                  onChange={(e) => setEscalateReason(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px', background: '#0A0C10',
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
                    color: '#F1F3F7', fontSize: '13px', outline: 'none',
                  }}
                >
                  <option value="sure_asimi">Daha uzun süre erteleme talep ediyorum</option>
                  <option value="musteri_talebi">Temsilci ile sesli görüşmek istiyorum</option>
                  <option value="belge_eksikligi">Belgeleri temin edemiyorum</option>
                  <option value="red">Erteleme istemiyorum, normal ödemek istiyorum</option>
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#CBD5E1', marginBottom: '6px', fontWeight: 600 }}>
                  Eklemek İstediğiniz Not (Opsiyonel)
                </label>
                <textarea
                  value={escalateNote}
                  onChange={(e) => setEscalateNote(e.target.value)}
                  placeholder="Durumunuzu kısaca belirtebilirsiniz..."
                  rows={3}
                  style={{
                    width: '100%', padding: '10px 12px', background: '#0A0C10',
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
                    color: '#F1F3F7', fontSize: '13px', outline: 'none', resize: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowEscalateModal(false)}
                  style={{
                    padding: '10px 16px', background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px',
                    color: '#8B9AB1', fontSize: '13px', cursor: 'pointer',
                  }}
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{
                    padding: '10px 18px', background: '#3B82F6',
                    border: 'none', borderRadius: '8px', color: 'white',
                    fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  {actionLoading ? 'İletiliyor...' : 'Temsilciye Aktar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
