'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
)

const prendas = ['Camiseta','Jean','Blusa','Vestido','Chaqueta','Pantalón','Falda']
const tallas = ['XS','S','M','L','XL','XXL']
const temporadas = ['Verano 2025','Otoño 2025','Invierno 2025','Primavera 2026']

const COLORS = ['#FF6B8A','#7F77DD','#FFB347','#4ECDC4','#95E1D3','#F38181','#A8E6CF']

export default function Dashboard() {
  const [ventas, setVentas] = useState<any[]>([])
  const [tipo, setTipo] = useState('Camiseta')
  const [color, setColor] = useState('')
  const [talla, setTalla] = useState('M')
  const [unidades, setUnidades] = useState('')
  const [precio, setPrecio] = useState('')
  const [temporada, setTemporada] = useState('Verano 2025')
  const [analisis, setAnalisis] = useState('')
  const [loadingIA, setLoadingIA] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [seccion, setSeccion] = useState('dashboard')
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) window.location.href = '/login'
      else { setUser(data.user); cargarVentas() }
    })
  }, [])

  const cargarVentas = async () => {
    const { data } = await supabase.from('ventas').select('*').order('created_at', { ascending: false })
    if (data) setVentas(data)
  }

  const registrarVenta = async () => {
    if (!color || !unidades || !precio) return alert('Completa todos los campos')
    await supabase.from('ventas').insert([{ empresa: user?.email, tipo_prenda: tipo, color, talla, unidades: parseInt(unidades), precio: parseInt(precio), temporada }])
    setColor(''); setUnidades(''); setPrecio(''); setShowForm(false)
    cargarVentas()
  }

  const analizarConIA = async () => {
    setLoadingIA(true); setAnalisis('')
    const resumen = ventas.map(v => `${v.tipo_prenda} ${v.color} talla ${v.talla}: ${v.unidades} unidades a $${v.precio}`).join('\n')
    const res = await fetch('/api/analizar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ventas: resumen }) })
    const data = await res.json()
    setAnalisis(data.resultado)
    setLoadingIA(false)
  }

  const cerrarSesion = async () => { await supabase.auth.signOut(); window.location.href = '/login' }

  const totalUnidades = ventas.reduce((a, v) => a + v.unidades, 0)
  const totalIngresos = ventas.reduce((a, v) => a + (v.unidades * v.precio), 0)
  const topPrenda = ventas.length > 0 ? ventas.reduce((a, b) => a.unidades > b.unidades ? a : b) : null

  const porTipo = prendas.map(p => ({
    nombre: p,
    total: ventas.filter(v => v.tipo_prenda === p).reduce((a, v) => a + v.unidades, 0)
  })).filter(p => p.total > 0)

  const maxVal = Math.max(...porTipo.map(p => p.total), 1)

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '◈' },
    { id: 'ventas', label: 'Ventas', icon: '◉' },
    { id: 'ia', label: 'Análisis IA', icon: '◆' },
  ]

  const inp = { width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #e8e8e8', fontSize: '13px', color: '#111', background: '#fafafa', outline: 'none' } as React.CSSProperties

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f2f2ef', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>

      {/* Sidebar */}
      <div style={{ width: '72px', background: '#1a1a2e', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.5rem 0', gap: '8px' }}>
        <div style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg,#FF6B8A,#7F77DD)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '700', fontSize: '14px', marginBottom: '1.5rem' }}>T</div>
        {navItems.map(item => (
          <div key={item.id} onClick={() => setSeccion(item.id)} title={item.label} style={{ width: '44px', height: '44px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: seccion === item.id ? 'rgba(127,119,221,0.25)' : 'transparent', color: seccion === item.id ? '#a89ef8' : '#666', fontSize: '18px', transition: 'all 0.15s' }}>
            {item.icon}
          </div>
        ))}
        <div style={{ marginTop: 'auto' }}>
          <div onClick={cerrarSesion} title="Cerrar sesión" style={{ width: '44px', height: '44px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#555', fontSize: '18px' }}>⏻</div>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: '700', margin: '0 0 2px', color: '#111' }}>
              {seccion === 'dashboard' ? 'Dashboard' : seccion === 'ventas' ? 'Ventas' : 'Análisis IA'}
            </h1>
            <p style={{ fontSize: '13px', color: '#999', margin: 0 }}>{user?.email}</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {seccion === 'ventas' && (
              <button onClick={() => setShowForm(!showForm)} style={{ background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: '12px', padding: '10px 20px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                + Nueva venta
              </button>
            )}
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg,#FF6B8A,#7F77DD)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '700', fontSize: '13px' }}>
              {user?.email?.[0]?.toUpperCase()}
            </div>
          </div>
        </div>

        {/* DASHBOARD */}
        {seccion === 'dashboard' && (
          <div>
            {/* Metric cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '1.5rem' }}>
              <div style={{ background: 'linear-gradient(135deg,#FF6B8A,#ff8fab)', borderRadius: '20px', padding: '1.5rem', color: '#fff' }}>
                <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '8px' }}>Total unidades vendidas</div>
                <div style={{ fontSize: '32px', fontWeight: '700' }}>{totalUnidades.toLocaleString()}</div>
                <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '8px' }}>{ventas.length} referencias</div>
              </div>
              <div style={{ background: '#fff', borderRadius: '20px', padding: '1.5rem' }}>
                <div style={{ fontSize: '12px', color: '#999', marginBottom: '8px' }}>Ingresos totales</div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#111' }}>${(totalIngresos/1000000).toFixed(1)}M</div>
                <div style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>COP estimado</div>
              </div>
              <div style={{ background: '#fff', borderRadius: '20px', padding: '1.5rem' }}>
                <div style={{ fontSize: '12px', color: '#999', marginBottom: '8px' }}>Prenda estrella</div>
                <div style={{ fontSize: '22px', fontWeight: '700', color: '#111' }}>{topPrenda ? topPrenda.tipo_prenda : '-'}</div>
                <div style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>{topPrenda ? `${topPrenda.unidades} unidades · ${topPrenda.color}` : 'Sin datos aún'}</div>
              </div>
            </div>

            {/* Chart + Recent */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* Bar chart */}
              <div style={{ background: '#fff', borderRadius: '20px', padding: '1.5rem' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#111', marginBottom: '1.25rem' }}>Unidades por prenda</div>
                {porTipo.length === 0 ? (
                  <p style={{ color: '#ccc', fontSize: '13px' }}>Sin datos aún</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {porTipo.sort((a,b) => b.total - a.total).map((p, i) => (
                      <div key={p.nombre}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                          <span style={{ color: '#555' }}>{p.nombre}</span>
                          <span style={{ fontWeight: '600', color: '#111' }}>{p.total}</span>
                        </div>
                        <div style={{ height: '8px', background: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${(p.total/maxVal)*100}%`, background: COLORS[i % COLORS.length], borderRadius: '4px', transition: 'width 0.5s' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent sales */}
              <div style={{ background: '#fff', borderRadius: '20px', padding: '1.5rem' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#111', marginBottom: '1.25rem' }}>Ventas recientes</div>
                {ventas.length === 0 ? (
                  <p style={{ color: '#ccc', fontSize: '13px' }}>Sin ventas aún</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {ventas.slice(0, 5).map((v, i) => (
                      <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: COLORS[i % COLORS.length] + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                          👗
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '13px', fontWeight: '500', color: '#111' }}>{v.tipo_prenda} · {v.color}</div>
                          <div style={{ fontSize: '11px', color: '#999' }}>{v.temporada}</div>
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#111' }}>{v.unidades} un.</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* VENTAS */}
        {seccion === 'ventas' && (
          <div>
            {showForm && (
              <div style={{ background: '#fff', borderRadius: '20px', padding: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#111', marginBottom: '1rem' }}>Nueva venta</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '1rem' }}>
                  <select value={tipo} onChange={e => setTipo(e.target.value)} style={inp}>{prendas.map(p => <option key={p}>{p}</option>)}</select>
                  <input placeholder="Color" value={color} onChange={e => setColor(e.target.value)} style={inp} />
                  <select value={talla} onChange={e => setTalla(e.target.value)} style={inp}>{tallas.map(t => <option key={t}>{t}</option>)}</select>
                  <input placeholder="Unidades" type="number" value={unidades} onChange={e => setUnidades(e.target.value)} style={inp} />
                  <input placeholder="Precio $" type="number" value={precio} onChange={e => setPrecio(e.target.value)} style={inp} />
                  <select value={temporada} onChange={e => setTemporada(e.target.value)} style={inp}>{temporadas.map(t => <option key={t}>{t}</option>)}</select>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={registrarVenta} style={{ background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: '10px', padding: '9px 20px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Guardar</button>
                  <button onClick={() => setShowForm(false)} style={{ background: '#f0f0f0', color: '#555', border: 'none', borderRadius: '10px', padding: '9px 20px', fontSize: '13px', cursor: 'pointer' }}>Cancelar</button>
                </div>
              </div>
            )}

            <div style={{ background: '#fff', borderRadius: '20px', padding: '1.5rem' }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#111', marginBottom: '1rem' }}>Todas las ventas</div>
              {ventas.length === 0 ? (
                <p style={{ color: '#ccc', fontSize: '13px' }}>No hay ventas registradas aún</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr>{['Prenda','Color','Talla','Unidades','Precio','Temporada','Ingresos'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid #f0f0f0', color: '#aaa', fontWeight: '500', fontSize: '11px' }}>{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody>
                      {ventas.map((v, i) => (
                        <tr key={v.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                          <td style={{ padding: '12px', color: '#111', fontWeight: '500' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: COLORS[i % COLORS.length] + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px' }}>👗</div>
                              {v.tipo_prenda}
                            </div>
                          </td>
                          <td style={{ padding: '12px', color: '#555' }}>{v.color}</td>
                          <td style={{ padding: '12px' }}><span style={{ background: '#f0f0f0', padding: '3px 8px', borderRadius: '6px', fontSize: '12px', color: '#555' }}>{v.talla}</span></td>
                          <td style={{ padding: '12px', fontWeight: '600', color: '#111' }}>{v.unidades}</td>
                          <td style={{ padding: '12px', color: '#555' }}>${v.precio.toLocaleString()}</td>
                          <td style={{ padding: '12px' }}><span style={{ background: '#EEEDFE', color: '#534AB7', fontSize: '11px', padding: '4px 10px', borderRadius: '20px' }}>{v.temporada}</span></td>
                          <td style={{ padding: '12px', fontWeight: '600', color: '#FF6B8A' }}>${(v.unidades * v.precio).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* IA */}
        {seccion === 'ia' && (
          <div>
            <div style={{ background: '#fff', borderRadius: '20px', padding: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#111', marginBottom: '4px' }}>Análisis inteligente de tu colección</div>
              <div style={{ fontSize: '13px', color: '#999', marginBottom: '1.25rem' }}>Claude analiza tus ventas y te dice qué producir más, qué descontinuar y qué tendencias aprovechar.</div>
              <button onClick={analizarConIA} disabled={loadingIA || ventas.length === 0} style={{ background: ventas.length === 0 ? '#f0f0f0' : 'linear-gradient(135deg,#FF6B8A,#7F77DD)', color: ventas.length === 0 ? '#aaa' : '#fff', border: 'none', borderRadius: '12px', padding: '12px 28px', fontSize: '13px', fontWeight: '600', cursor: ventas.length === 0 ? 'not-allowed' : 'pointer' }}>
                {loadingIA ? '⏳ Analizando...' : '✦ Analizar con Claude'}
              </button>
              {ventas.length === 0 && <p style={{ fontSize: '12px', color: '#ccc', marginTop: '8px' }}>Registra al menos una venta primero.</p>}
            </div>
            {analisis && (
              <div style={{ background: '#1a1a2e', borderRadius: '20px', padding: '1.5rem' }}>
                <div style={{ fontSize: '11px', fontWeight: '600', color: '#a89ef8', marginBottom: '12px', letterSpacing: '0.08em' }}>ANÁLISIS DE CLAUDE ✦</div>
                <div style={{ fontSize: '14px', color: '#e8e8ff', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>{analisis}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}