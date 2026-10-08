'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost/api'
const SSE_URL = process.env.NEXT_PUBLIC_SSE_URL || 'http://localhost/api/agent/stream'

type Plan = {
  plan_id: string
  customer_id: string
  oncelik: 'yuksek' | 'normal'
  erteleme_ay: number
  belgeler: string[]
  mesaj: string
  durum: 'taslak' | 'onaylandi' | 'devredildi'
  created_at: string
}

type DisasterEvent = {
  id: string
  tur: string
  buyukluk: number
  iller: string[]
  zaman: string
  kaynak: string
}

type LiveEvent = { type: string; plan_id?: string; customer_id?: string; step?: any }

export default function DashboardPage() {
  const router = useRouter()
  const [plans, setPlans] = useState<Plan[]>([])
  const [events, setEvents] = useState<DisasterEvent[]>([])
  const [liveLog, setLiveLog] = useState<LiveEvent[]>([])
  const [stats, setStats] = useState({ etkilenen: 0, taslak: 0, onaylandi: 0, devredildi: 0 })
  const [simulLoading, setSimulLoading] = useState(false)
  const [activeEventId, setActiveEventId] = useState<string | null>(null)
  const sseRef = useRef<EventSource | null>(null)
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const role = localStorage.getItem('role')
    if (!token || (role !== 'staff' && role !== 'admin')) {
      router.push('/')
      return
    }
    loadEvents()
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

  async function loadEvents() {
    try {
      const res = await authFetch(`${API}/disaster/events`)
      if (res.ok) {
        const data = await res.json()
        setEvents(data.items || [])
      }
    } catch {}
  }

  async function loadPlans(eventId?: string) {
    try {
      const url = eventId ? `${API}/agent/plans?event_id=${eventId}&size=100` : `${API}/agent/plans?size=100`
      const res = await authFetch(url)
      if (res.ok) {
        const data = await res.json()
        const items: Plan[] = data.items || []
        setPlans(items)
        setStats({
          etkilenen: data.total || 0,
          taslak: items.filter(p => p.durum === 'taslak').length,
          onaylandi: items.filter(p => p.durum === 'onaylandi').length,
          devredildi: items.filter(p => p.durum === 'devredildi').length,
        })
      }
    } catch {}
  }

  function startSSE() {
    const token = localStorage.getItem('token')
    const es = new EventSource(`${SSE_URL}?token=${token}`)
    sseRef.current = es
    es.onmessage = (e) => {
      try {
        const payload: LiveEvent = JSON.parse(e.data)
        setLiveLog(prev => [payload, ...prev].slice(0, 50))
        if (payload.type === 'plan.drafted' || payload.type === 'plan.approved' || payload.type === 'plan.escalated') {
          loadPlans(activeEventId || undefined)
        }
        // Scroll log
        setTimeout(() => logRef.current?.scrollTo(0, 0), 50)
      } catch {}
    }
  }

  async function simulateDisaster() {
    setSimulLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await authFetch(`${API}/disaster/trigger`, {
        method: 'POST',
        body: JSON.stringify({
          tur: 'deprem', buyukluk: 7.4,
          iller: ['Hatay', 'Kahramanmaraş', 'Malatya', 'Adıyaman', 'Gaziantep'],
          kaynak: 'SIMULASYON',
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setActiveEventId(data.event_id)
        await loadEvents()
        await loadPlans(data.event_id)
      }
    } catch {}
    setSimulLoading(false)
  }

  const role = typeof window !== 'undefined' ? localStorage.getItem('role') : ''

  return (
    <div style={{ minHeight: '100vh', background: '#090B0F' }}>
      {/* Header */}
      <header style={{
        borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '0 32px',
        height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(10,12,16,0.95)', backdropFilter: 'blur(8px)',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '18px' }}>🚨</span>
          <span style={{ fontWeight: 700, color: '#FF6200' }}>Afet Modu</span>
          <span style={{ color: '#4A5568', fontSize: '13px' }}>· Çalışan Konsolu</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div className="live-dot" />
            <span style={{ fontSize: '12px', color: '#22C55E' }}>Canlı</span>
          </div>
          {role === 'admin' && (
            <button
              id="simulate-disaster-btn"
              onClick={simulateDisaster}
              disabled={simulLoading}
              style={{
                padding: '8px 18px', background: simulLoading ? '#374151' : '#FF6200',
                color: 'white', border: 'none', borderRadius: '8px',
                fontSize: '13px', fontWeight: 700, cursor: simulLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.18s',
              }}
            >
              {simulLoading ? '⏳ Simüle ediliyor...' : '🌍 Afet Simüle Et'}
            </button>
          )}
          <button
            onClick={() => { localStorage.clear(); router.push('/') }}
            style={{
              padding: '8px 14px', background: 'transparent', color: '#8B9AB1',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px', cursor: 'pointer',
            }}
          >Çıkış</button>
        </div>
      </header>

      <div style={{ display: 'flex', height: 'calc(100vh - 56px)' }}>
        {/* Sidebar */}
        <aside style={{
          width: '240px', borderRight: '1px solid rgba(255,255,255,0.07)',
          padding: '20px 16px', overflowY: 'auto',
        }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#4A5568', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>
            Afet Olayları
          </div>
          {events.length === 0 && (
            <div style={{ fontSize: '12px', color: '#4A5568' }}>Henüz afet simülasyonu yok.</div>
          )}
          {events.map(ev => (
            <div
              key={ev.id}
              onClick={() => { setActiveEventId(ev.id); loadPlans(ev.id) }}
              style={{
                padding: '10px 12px', borderRadius: '8px', cursor: 'pointer',
                background: activeEventId === ev.id ? 'rgba(255,98,0,0.1)' : 'transparent',
                border: `1px solid ${activeEventId === ev.id ? 'rgba(255,98,0,0.3)' : 'transparent'}`,
                marginBottom: '8px', transition: 'all 0.15s',
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: 600, color: activeEventId === ev.id ? '#FF6200' : '#F1F3F7' }}>
                M{ev.buyukluk} {ev.tur}
              </div>
              <div style={{ fontSize: '11px', color: '#4A5568', marginTop: '2px' }}>
                {ev.etkilenen_sayisi || '?'} etkilenen
              </div>
            </div>
          ))}
        </aside>

        {/* Main */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
          {/* Sayaçlar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
            {[
              { label: 'Toplam Plan', val: stats.etkilenen, color: '#FF6200' },
              { label: 'Onay Bekliyor', val: stats.taslak, color: '#EAB308' },
              { label: 'Onaylandı', val: stats.onaylandi, color: '#22C55E' },
              { label: 'Devredildi', val: stats.devredildi, color: '#3B82F6' },
            ].map(s => (
              <div key={s.label} style={{
                background: '#111318', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '12px', padding: '16px 20px',
              }}>
                <div style={{ fontSize: '28px', fontWeight: 700, color: s.color, fontFamily: 'JetBrains Mono, monospace' }}>
                  {s.val}
                </div>
                <div style={{ fontSize: '12px', color: '#8B9AB1', marginTop: '4px' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Plan Listesi */}
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#4A5568', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
            Öncelik Sırasına Göre Planlar
          </div>

          {plans.length === 0 && (
            <div style={{
              background: '#111318', border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '12px', padding: '40px', textAlign: 'center',
              color: '#4A5568', fontSize: '14px',
            }}>
              {activeEventId ? 'Plan yükleniyor...' : 'Afet simülasyonu başlatın'}
            </div>
          )}

          {plans.map((plan, i) => (
            <PlanRow key={plan.plan_id} plan={plan} onAction={loadPlans} />
          ))}
        </main>

        {/* SSE Log */}
        <aside style={{
          width: '280px', borderLeft: '1px solid rgba(255,255,255,0.07)',
          padding: '20px 16px', overflowY: 'auto',
        }} ref={logRef}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#4A5568', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div className="live-dot" style={{ width: '6px', height: '6px' }} />
            Canlı Ajan Günlüğü
          </div>
          {liveLog.map((ev, i) => (
            <div key={i} style={{
              padding: '8px 10px', background: 'rgba(255,98,0,0.05)',
              border: '1px solid rgba(255,98,0,0.1)', borderRadius: '6px',
              marginBottom: '6px', fontSize: '11px',
              animation: 'fadeIn 0.2s ease',
            }}>
              <span style={{ color: '#FF6200', fontWeight: 600 }}>{ev.type}</span>
              {ev.customer_id && <div style={{ color: '#4A5568', marginTop: '2px' }}>müşteri: {ev.customer_id.slice(0, 12)}</div>}
              {ev.step?.arac && <div style={{ color: '#8B9AB1' }}>araç: {ev.step.arac}</div>}
            </div>
          ))}
        </aside>
      </div>
    </div>
  )
}

type DisasterEvent = { id: string; tur: string; buyukluk: number; etkilenen_sayisi?: number }

function PlanRow({ plan, onAction }: { plan: Plan; onAction: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)

  async function approve() {
    setLoading(true)
    const token = localStorage.getItem('token')
    await fetch(`${API}/agent/plans/${plan.plan_id}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    })
    setLoading(false)
    onAction()
  }

  async function escalate() {
    setLoading(true)
    const token = localStorage.getItem('token')
    await fetch(`${API}/agent/plans/${plan.plan_id}/escalate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ neden: 'musteri_talebi' }),
    })
    setLoading(false)
    onAction()
  }

  const priorityColor = plan.oncelik === 'yuksek' ? '#EF4444' : '#EAB308'
  const statusColors: Record<string, string> = {
    taslak: '#EAB308', onaylandi: '#22C55E', devredildi: '#3B82F6'
  }

  return (
    <div style={{
      background: '#111318', border: '1px solid rgba(255,255,255,0.07)',
      borderLeft: `3px solid ${priorityColor}`,
      borderRadius: '10px', marginBottom: '10px', overflow: 'hidden',
      transition: 'border-color 0.2s',
    }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{ padding: '14px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}
      >
        <span style={{ fontSize: '16px', flexShrink: 0 }}>{plan.oncelik === 'yuksek' ? '🔴' : '🟡'}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '13px', fontFamily: 'JetBrains Mono, monospace', color: '#8B9AB1' }}>
            {plan.customer_id.slice(0, 16)}
          </div>
          <div style={{ fontSize: '12px', color: '#4A5568' }}>
            {plan.erteleme_ay} ay erteleme · {plan.belgeler.length} belge
          </div>
        </div>
        <span style={{
          fontSize: '11px', padding: '3px 8px', borderRadius: '100px', border: '1px solid',
          color: statusColors[plan.durum] || '#8B9AB1',
          borderColor: (statusColors[plan.durum] || '#8B9AB1').replace(')', ',0.3)').replace('rgb', 'rgba'),
          background: (statusColors[plan.durum] || '#8B9AB1').replace(')', ',0.1)').replace('rgb', 'rgba'),
        }}>
          {plan.durum}
        </span>
        <span style={{ color: '#4A5568', fontSize: '12px' }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div style={{ padding: '0 18px 16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{
            background: 'rgba(255,98,0,0.06)', border: '1px solid rgba(255,98,0,0.15)',
            borderRadius: '8px', padding: '12px', margin: '12px 0',
            fontSize: '13px', color: '#F1F3F7', lineHeight: '1.7',
          }}>
            {plan.mesaj || '—'}
          </div>
          <div style={{ fontSize: '11px', color: '#8B9AB1', marginBottom: '10px' }}>
            Belgeler: {plan.belgeler.join(', ')}
          </div>
          {plan.durum === 'taslak' && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                id={`approve-btn-${plan.plan_id.slice(0,8)}`}
                onClick={approve}
                disabled={loading}
                style={{
                  padding: '8px 16px', background: '#22C55E', color: 'white',
                  border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                }}
              >✓ Onayla</button>
              <button
                id={`escalate-btn-${plan.plan_id.slice(0,8)}`}
                onClick={escalate}
                disabled={loading}
                style={{
                  padding: '8px 16px', background: 'transparent', color: '#8B9AB1',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
                }}
              >↗ Temsilciye Devret</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
