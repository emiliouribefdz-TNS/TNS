'use client'
import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
)

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
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', background: '#f7f7f5' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem' }}>
        <div style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
          <svg width="110" height="110" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="38" cy="44" rx="20" ry="26" fill="none" stroke="#111" strokeWidth="2.5" transform="rotate(-25 38 44)"/>
            <line x1="22" y1="33" x2="54" y2="55" stroke="#111" strokeWidth="1.2"/>
            <line x1="17" y1="43" x2="59" y2="45" stroke="#111" strokeWidth="1.2"/>
            <line x1="21" y1="53" x2="55" y2="35" stroke="#111" strokeWidth="1.2"/>
            <line x1="30" y1="24" x2="46" y2="64" stroke="#111" strokeWidth="1.2"/>
            <line x1="38" y1="20" x2="38" y2="66" stroke="#111" strokeWidth="1.2"/>
            <rect x="34" y="66" width="8" height="20" rx="2.5" fill="#111" transform="rotate(-25 34 66)"/>
            <ellipse cx="82" cy="44" rx="20" ry="26" fill="none" stroke="#111" strokeWidth="2.5" transform="rotate(25 82 44)"/>
            <line x1="66" y1="33" x2="98" y2="55" stroke="#111" strokeWidth="1.2" transform="rotate(50 82 44)"/>
            <line x1="61" y1="43" x2="103" y2="45" stroke="#111" strokeWidth="1.2" transform="rotate(50 82 44)"/>
            <line x1="65" y1="53" x2="99" y2="35" stroke="#111" strokeWidth="1.2" transform="rotate(50 82 44)"/>
            <line x1="74" y1="24" x2="90" y2="64" stroke="#111" strokeWidth="1.2" transform="rotate(50 82 44)"/>
            <line x1="82" y1="20" x2="82" y2="66" stroke="#111" strokeWidth="1.2" transform="rotate(50 82 44)"/>
            <rect x="78" y="66" width="8" height="20" rx="2.5" fill="#111" transform="rotate(25 78 66)"/>
            <text x="29" y="92" textAnchor="middle" fontSize="7" fill="#888" fontFamily="-apple-system, sans-serif">19</text>
            <text x="91" y="92" textAnchor="middle" fontSize="7" fill="#888" fontFamily="-apple-system, sans-serif">76</text>
            <text x="60" y="112" textAnchor="middle" fontSize="15" fontWeight="700" letterSpacing="5" fill="#111" fontFamily="-apple-system, sans-serif">TNS</text>
          </svg>
        </div>
        <div style={{ background: '#fff', borderRadius: '20px', padding: '2.5rem', width: '100%', maxWidth: '380px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
          <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#111', margin: '0 0 4px' }}>Bienvenido</h1>
          <p style={{ fontSize: '13px', color: '#999', margin: '0 0 1.75rem' }}>Ingresa tus credenciales para continuar</p>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '11px', fontWeight: '500', color: '#888', display: 'block', marginBottom: '6px' }}>EMAIL</label>
            <input type="email" placeholder="tu@email.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={handleKey}
              style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1px solid #e8e8e8', fontSize: '14px', color: '#111', background: '#fafafa', outline: 'none', boxSizing: 'border-box' as const }}/>
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '11px', fontWeight: '500', color: '#888', display: 'block', marginBottom: '6px' }}>CONTRASEÑA</label>
            <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={handleKey}
              style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1px solid #e8e8e8', fontSize: '14px', color: '#111', background: '#fafafa', outline: 'none', boxSizing: 'border-box' as const }}/>
          </div>
          {error && <div style={{ background: '#fff0f0', border: '1px solid #ffd0d0', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: '#cc0000', marginBottom: '16px' }}>{error}</div>}
          <button onClick={handleLogin} disabled={loading}
            style={{ width: '100%', padding: '12px', background: '#111', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </div>
        <p style={{ fontSize: '11px', color: '#ccc', marginTop: '2rem' }}>© 2025 TNS · FashionAI</p>
      </div>
      <div style={{ width: '40%', background: '#111', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem' }}>
        <svg width="90" height="90" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginBottom: '2rem' }}>
          <ellipse cx="38" cy="44" rx="20" ry="26" fill="none" stroke="#fff" strokeWidth="2.5" transform="rotate(-25 38 44)"/>
          <line x1="22" y1="33" x2="54" y2="55" stroke="#fff" strokeWidth="1.2"/>
          <line x1="17" y1="43" x2="59" y2="45" stroke="#fff" strokeWidth="1.2"/>
          <line x1="21" y1="53" x2="55" y2="35" stroke="#fff" strokeWidth="1.2"/>
          <line x1="30" y1="24" x2="46" y2="64" stroke="#fff" strokeWidth="1.2"/>
          <line x1="38" y1="20" x2="38" y2="66" stroke="#fff" strokeWidth="1.2"/>
          <rect x="34" y="66" width="8" height="20" rx="2.5" fill="#fff" transform="rotate(-25 34 66)"/>
          <ellipse cx="82" cy="44" rx="20" ry="26" fill="none" stroke="#fff" strokeWidth="2.5" transform="rotate(25 82 44)"/>
          <line x1="66" y1="33" x2="98" y2="55" stroke="#fff" strokeWidth="1.2" transform="rotate(50 82 44)"/>
          <line x1="61" y1="43" x2="103" y2="45" stroke="#fff" strokeWidth="1.2" transform="rotate(50 82 44)"/>
          <line x1="65" y1="53" x2="99" y2="35" stroke="#fff" strokeWidth="1.2" transform="rotate(50 82 44)"/>
          <line x1="74" y1="24" x2="90" y2="64" stroke="#fff" strokeWidth="1.2" transform="rotate(50 82 44)"/>
          <line x1="82" y1="20" x2="82" y2="66" stroke="#fff" strokeWidth="1.2" transform="rotate(50 82 44)"/>
          <rect x="78" y="66" width="8" height="20" rx="2.5" fill="#fff" transform="rotate(25 78 66)"/>
          <text x="29" y="92" textAnchor="middle" fontSize="7" fill="#666" fontFamily="-apple-system, sans-serif">19</text>
          <text x="91" y="92" textAnchor="middle" fontSize="7" fill="#666" fontFamily="-apple-system, sans-serif">76</text>
          <text x="60" y="112" textAnchor="middle" fontSize="15" fontWeight="700" letterSpacing="5" fill="#fff" fontFamily="-apple-system, sans-serif">TNS</text>
        </svg>
        <p style={{ color: '#fff', fontSize: '22px', fontWeight: '600', margin: '0 0 8px', textAlign: 'center' }}>FashionAI</p>
        <p style={{ color: '#555', fontSize: '13px', textAlign: 'center', lineHeight: '1.6' }}>Gestiona tu colección,<br/>analiza tendencias con IA</p>
      </div>
    </div>
  )
}