'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost/api'

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.detail || 'Giriş başarısız')
      }
      const data = await res.json()
      localStorage.setItem('token', data.access_token)
      localStorage.setItem('role', data.role)
      if (data.customer_id) {
        localStorage.setItem('customer_id', data.customer_id)
      } else {
        localStorage.removeItem('customer_id')
      }

      if (data.role === 'admin' || data.role === 'staff') {
        window.location.href = '/dashboard'
      } else {
        window.location.href = '/customer'
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const quickLogin = (demoEmail: string) => {
    setEmail(demoEmail)
    setPassword('demo1234')
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at top, #0F1520 0%, #090B0F 70%)',
      padding: '24px',
    }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '10px',
            background: 'rgba(255,98,0,0.1)', border: '1px solid rgba(255,98,0,0.3)',
            borderRadius: '12px', padding: '10px 20px', marginBottom: '16px',
          }}>
            <span style={{ fontSize: '22px' }}>🚨</span>
            <span style={{ fontSize: '18px', fontWeight: 700, color: '#FF6200' }}>Afet Modu</span>
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '6px' }}>Sisteme Giriş</h1>
          <p style={{ fontSize: '13px', color: '#8B9AB1' }}>
            ING Hubs Türkiye · Sentetik Veri & Ajan Prototipi
          </p>
        </div>

        {/* Demo hesaplar hızlı seçim */}
        <div style={{
          background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.18)',
          borderRadius: '10px', padding: '14px', marginBottom: '20px', fontSize: '12px',
        }}>
          <div style={{ color: '#93C5FD', fontWeight: 600, marginBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
            <span>Hızlı Demo Girişi (Tıklayın)</span>
            <span style={{ fontSize: '11px', color: '#60A5FA' }}>Şifre: demo1234</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              type="button"
              onClick={() => quickLogin('hatice@demo.com')}
              style={{
                padding: '8px 10px', borderRadius: '6px', textAlign: 'left',
                background: '#1A2234', border: '1px solid rgba(255,255,255,0.08)',
                color: '#E2E8F0', cursor: 'pointer', fontSize: '11px',
              }}
            >
              👵 <strong>Hatice Hanım</strong>
              <div style={{ color: '#94A3B8', fontSize: '10px' }}>Afetzede Müşteri</div>
            </button>
            <button
              type="button"
              onClick={() => quickLogin('emre@demo.com')}
              style={{
                padding: '8px 10px', borderRadius: '6px', textAlign: 'left',
                background: '#1A2234', border: '1px solid rgba(255,255,255,0.08)',
                color: '#E2E8F0', cursor: 'pointer', fontSize: '11px',
              }}
            >
              👨 <strong>Emre Bey</strong>
              <div style={{ color: '#94A3B8', fontSize: '10px' }}>Genç Müşteri</div>
            </button>
            <button
              type="button"
              onClick={() => quickLogin('calisan@demo.com')}
              style={{
                padding: '8px 10px', borderRadius: '6px', textAlign: 'left',
                background: '#1A2234', border: '1px solid rgba(255,255,255,0.08)',
                color: '#E2E8F0', cursor: 'pointer', fontSize: '11px',
              }}
            >
              🏦 <strong>Banka Çalışanı</strong>
              <div style={{ color: '#94A3B8', fontSize: '10px' }}>Operasyon Konsolu</div>
            </button>
            <button
              type="button"
              onClick={() => quickLogin('admin@demo.com')}
              style={{
                padding: '8px 10px', borderRadius: '6px', textAlign: 'left',
                background: '#1A2234', border: '1px solid rgba(255,255,255,0.08)',
                color: '#E2E8F0', cursor: 'pointer', fontSize: '11px',
              }}
            >
              ⚙️ <strong>Sistem Admin</strong>
              <div style={{ color: '#94A3B8', fontSize: '10px' }}>Tam Yetki</div>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} style={{
          background: '#111318', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '12px', padding: '28px',
        }}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#8B9AB1', marginBottom: '6px', fontWeight: 600 }}>
              E-POSTA
            </label>
            <input
              id="email"
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              required placeholder="hatice@demo.com"
              style={{
                width: '100%', padding: '10px 14px',
                background: '#0A0C10', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px', color: '#F1F3F7', fontSize: '14px', outline: 'none',
              }}
            />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#8B9AB1', marginBottom: '6px', fontWeight: 600 }}>
              ŞİFRE
            </label>
            <input
              id="password"
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              required placeholder="••••••••"
              style={{
                width: '100%', padding: '10px 14px',
                background: '#0A0C10', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px', color: '#F1F3F7', fontSize: '14px', outline: 'none',
              }}
            />
          </div>

          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '6px', padding: '10px 14px', marginBottom: '16px',
              fontSize: '13px', color: '#FCA5A5',
            }}>
              {error}
            </div>
          )}

          <button
            id="login-btn"
            type="submit" disabled={loading}
            style={{
              width: '100%', padding: '12px',
              background: loading ? '#4A5568' : '#FF6200',
              color: 'white', border: 'none', borderRadius: '8px',
              fontSize: '14px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.18s',
            }}
          >
            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '11px', color: '#4A5568' }}>
          Sentetik veri ile hazırlanmış prototip · Tüm veriler kurgusaldır
        </p>
      </div>
    </div>
  )
}
