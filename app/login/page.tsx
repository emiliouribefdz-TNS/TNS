'use client'
import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
)

function TennisLogo({ variant = 'dark', width = 120 }: { variant?: 'dark' | 'white'; width?: number }) {
  const src = variant === 'white' ? '/tns-logo-white.svg' : '/tns-logo.svg'
  return <img src={src} alt="TNS" width={width} style={{ objectFit: 'contain' }} />
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email o contraseña incorrectos')
      setLoading(false)
    } else {
      window.location.href = '/dashboard'
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLogin()
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
      {/* Left panel - Login form */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem',
        background: '#FFFFFF',
      }}>
        <div style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
          <TennisLogo variant="dark" width={120} />
        </div>

        <div style={{
          width: '100%',
          maxWidth: '380px',
        }}>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#0D1B2A', margin: '0 0 6px', letterSpacing: '-0.3px' }}>
            Bienvenido
          </h1>
          <p style={{ fontSize: '14px', color: '#6C757D', margin: '0 0 2rem' }}>
            Ingresa tus credenciales para continuar
          </p>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '11px', fontWeight: '600', color: '#6C757D', display: 'block', marginBottom: '6px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              Email
            </label>
            <input
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={handleKey}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '8px',
                border: '1.5px solid #DEE2E6',
                fontSize: '14px',
                color: '#0D1B2A',
                background: '#F8F9FA',
                outline: 'none',
                boxSizing: 'border-box' as const,
                transition: 'border-color 0.2s',
              }}
              onFocus={e => e.target.style.borderColor = '#0D1B2A'}
              onBlur={e => e.target.style.borderColor = '#DEE2E6'}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ fontSize: '11px', fontWeight: '600', color: '#6C757D', display: 'block', marginBottom: '6px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              Contraseña
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={handleKey}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '8px',
                border: '1.5px solid #DEE2E6',
                fontSize: '14px',
                color: '#0D1B2A',
                background: '#F8F9FA',
                outline: 'none',
                boxSizing: 'border-box' as const,
                transition: 'border-color 0.2s',
              }}
              onFocus={e => e.target.style.borderColor = '#0D1B2A'}
              onBlur={e => e.target.style.borderColor = '#DEE2E6'}
            />
          </div>

          {error && (
            <div style={{
              background: '#FFF0F1',
              border: '1px solid #FFCDD2',
              borderRadius: '8px',
              padding: '10px 14px',
              fontSize: '13px',
              color: '#E63946',
              marginBottom: '16px',
            }}>
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              width: '100%',
              padding: '13px',
              background: '#0D1B2A',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              letterSpacing: '0.3px',
              transition: 'opacity 0.2s',
            }}
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </div>

        <p style={{ fontSize: '11px', color: '#ADB5BD', marginTop: '3rem' }}>
          Tennis S.A. &middot; FashionAI Dashboard
        </p>
      </div>

      {/* Right panel - Brand showcase */}
      <div style={{
        width: '42%',
        background: 'linear-gradient(160deg, #0D1B2A 0%, #1B2A4A 50%, #15233B 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative elements */}
        <div style={{
          position: 'absolute',
          top: '-80px',
          right: '-80px',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.05)',
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-120px',
          left: '-60px',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.03)',
        }} />

        <TennisLogo variant="white" width={140} />

        <div style={{ marginTop: '2rem', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{
            width: '40px',
            height: '2px',
            background: '#C9A84C',
            margin: '12px auto',
          }} />
          <p style={{
            color: 'rgba(255,255,255,0.85)',
            fontSize: '15px',
            fontWeight: '500',
            margin: '0 0 8px',
          }}>
            FashionAI
          </p>
          <p style={{
            color: 'rgba(255,255,255,0.4)',
            fontSize: '13px',
            lineHeight: '1.7',
            maxWidth: '260px',
          }}>
            Gestiona tu colección, analiza tendencias y toma decisiones con inteligencia artificial.
          </p>
        </div>

        <div style={{
          position: 'absolute',
          bottom: '2rem',
          color: 'rgba(255,255,255,0.2)',
          fontSize: '11px',
          letterSpacing: '2px',
        }}>
          DESDE 1976 &middot; MEDELLN
        </div>
      </div>
    </div>
  )
}
