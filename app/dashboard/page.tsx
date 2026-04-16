'use client'

import { ChangeEvent, CSSProperties, useEffect, useRef, useState } from 'react'
import { createClient, User } from '@supabase/supabase-js'
import type { ImportPreview, ReferenciaRecord } from '@/lib/referencias'

type Venta = {
  id: string
  created_at?: string
  empresa?: string
  tipo_prenda: string
  color: string
  talla: string
  unidades: number
  precio: number
  temporada: string
}

type ConflictMode = 'skip' | 'replace'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
)

const prendas = ['Camiseta', 'Jean', 'Blusa', 'Vestido', 'Chaqueta', 'Pantalón', 'Falda']
const tallas = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const temporadas = ['Verano 2025', 'Otoño 2025', 'Invierno 2025', 'Primavera 2026']
const COLORS = ['#FF6B8A', '#7F77DD', '#FFB347', '#4ECDC4', '#95E1D3', '#F38181', '#A8E6CF']

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: '⊞' },
  { id: 'ventas', label: 'Ventas', icon: '◉' },
  { id: 'referencias', label: 'Referencias', icon: '▣' },
  { id: 'ia', label: 'Análisis IA', icon: '◆' },
] as const

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: '10px',
  border: '1px solid #e8e8e8',
  fontSize: '13px',
  color: '#111',
  background: '#fafafa',
  outline: 'none',
  boxSizing: 'border-box',
}

const cardStyle: CSSProperties = {
  background: '#fff',
  borderRadius: '20px',
  padding: '1.5rem',
}

function getSectionTitle(section: string) {
  if (section === 'ventas') return 'Ventas'
  if (section === 'referencias') return 'Referencias'
  if (section === 'ia') return 'Análisis IA'
  return 'Dashboard'
}

export default function Dashboard() {
  const [ventas, setVentas] = useState<Venta[]>([])
  const [referencias, setReferencias] = useState<ReferenciaRecord[]>([])
  const [tipo, setTipo] = useState('Camiseta')
  const [color, setColor] = useState('')
  const [talla, setTalla] = useState('M')
  const [unidades, setUnidades] = useState('')
  const [precio, setPrecio] = useState('')
  const [temporada, setTemporada] = useState('Verano 2025')
  const [analisis, setAnalisis] = useState('')
  const [loadingIA, setLoadingIA] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [seccion, setSeccion] = useState<(typeof navItems)[number]['id']>('dashboard')
  const [showForm, setShowForm] = useState(false)
  const [referenciasError, setReferenciasError] = useState('')
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [importFileName, setImportFileName] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [commitLoading, setCommitLoading] = useState(false)
  const [importMessage, setImportMessage] = useState('')
  const [importError, setImportError] = useState('')
  const [conflictMode, setConflictMode] = useState<ConflictMode>('skip')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        window.location.href = '/login'
        return
      }

      setUser(data.user)
      await Promise.all([cargarVentas(), cargarReferencias(data.user.email ?? '')])
    })
  }, [])

  const cargarVentas = async () => {
    const { data } = await supabase.from('ventas').select('*').order('created_at', { ascending: false })
    if (data) setVentas(data as Venta[])
  }

  const cargarReferencias = async (email: string) => {
    if (!email) return

    const { data, error } = await supabase
      .from('referencias')
      .select('id, created_at, empresa, reference_code, nombre, tipo_prenda, color, talla, precio, temporada, notas, image_url')
      .eq('empresa', email)
      .order('created_at', { ascending: false })

    if (error) {
      setReferencias([])
      setReferenciasError('No pude cargar las referencias. Aplica la migración de Supabase antes de usar esta sección.')
      return
    }

    setReferenciasError('')
    setReferencias((data ?? []) as ReferenciaRecord[])
  }

  const registrarVenta = async () => {
    if (!color || !unidades || !precio) {
      alert('Completa todos los campos')
      return
    }

    await supabase.from('ventas').insert([
      {
        empresa: user?.email,
        tipo_prenda: tipo,
        color,
        talla,
        unidades: parseInt(unidades, 10),
        precio: parseInt(precio, 10),
        temporada,
      },
    ])

    setColor('')
    setUnidades('')
    setPrecio('')
    setShowForm(false)
    cargarVentas()
  }

  const analizarConIA = async () => {
    setLoadingIA(true)
    setAnalisis('')

    try {
      const resumen = ventas
        .map((venta) => `${venta.tipo_prenda} ${venta.color} talla ${venta.talla}: ${venta.unidades} unidades a $${venta.precio}`)
        .join('\n')
      const res = await fetch('/api/analizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ventas: resumen }),
      })
      const data = await res.json()
      setAnalisis(data.resultado ?? '')
    } finally {
      setLoadingIA(false)
    }
  }

  const cerrarSesion = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const getAccessToken = async () => {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token

    if (!token) {
      throw new Error('Tu sesión expiró. Ingresa de nuevo para importar referencias.')
    }

    return token
  }

  const resetImportState = () => {
    setPreview(null)
    setImportFileName('')
    setImportMessage('')
    setImportError('')
    setConflictMode('skip')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const previsualizarArchivo = async (file: File) => {
    setPreviewLoading(true)
    setCommitLoading(false)
    setImportMessage('')
    setImportError('')

    try {
      const token = await getAccessToken()
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/referencias/preview', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error ?? 'No fue posible leer el archivo.')
      }

      setPreview(data as ImportPreview)
      setImportFileName(file.name)
      setConflictMode(data.summary.conflicts > 0 ? 'skip' : 'replace')
    } catch (error) {
      resetImportState()
      setImportError(error instanceof Error ? error.message : 'No fue posible previsualizar el archivo.')
    } finally {
      setPreviewLoading(false)
    }
  }

  const onFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    await previsualizarArchivo(file)
  }

  const confirmarImportacion = async () => {
    if (!preview) return

    if (preview.summary.invalidRows > 0) {
      setImportError('Corrige las filas con error antes de confirmar la importación.')
      return
    }

    setCommitLoading(true)
    setImportMessage('')
    setImportError('')

    try {
      const token = await getAccessToken()
      const res = await fetch('/api/referencias/commit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          rows: preview.rows,
          mode: conflictMode,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error ?? 'No fue posible guardar las referencias.')
      }

      setImportMessage(
        `Importación completada. ${data.saved} filas guardadas${data.skippedConflicts ? ` · ${data.skippedConflicts} conflictos omitidos` : ''}${
          data.resolvedConflicts ? ` · ${data.resolvedConflicts} conflictos actualizados` : ''
        }.`
      )
      setPreview(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      await cargarReferencias(user?.email ?? '')
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'No fue posible guardar las referencias.')
    } finally {
      setCommitLoading(false)
    }
  }

  const totalUnidades = ventas.reduce((acc, venta) => acc + venta.unidades, 0)
  const totalIngresos = ventas.reduce((acc, venta) => acc + venta.unidades * venta.precio, 0)
  const topPrenda = ventas.length > 0 ? ventas.reduce((a, b) => (a.unidades > b.unidades ? a : b)) : null
  const porTipo = prendas
    .map((prenda) => ({
      nombre: prenda,
      total: ventas.filter((venta) => venta.tipo_prenda === prenda).reduce((acc, venta) => acc + venta.unidades, 0),
    }))
    .filter((row) => row.total > 0)
  const maxVal = Math.max(...porTipo.map((row) => row.total), 1)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f2f2ef', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div
        style={{
          width: '72px',
          background: '#1a1a2e',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '1.5rem 0',
          gap: '8px',
        }}
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            background: '#fff',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1.5rem',
          }}
        >
          <span style={{ fontSize: '10px', fontWeight: '700', color: '#111', letterSpacing: '1px' }}>TNS</span>
        </div>

        {navItems.map((item) => (
          <div
            key={item.id}
            onClick={() => setSeccion(item.id)}
            title={item.label}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              background: seccion === item.id ? 'rgba(255,255,255,0.15)' : 'transparent',
              color: seccion === item.id ? '#fff' : '#555',
              fontSize: '18px',
            }}
          >
            {item.icon}
          </div>
        ))}

        <div style={{ marginTop: 'auto' }}>
          <div
            onClick={cerrarSesion}
            title="Cerrar sesión"
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#555',
              fontSize: '18px',
            }}
          >
            ⏻
          </div>
        </div>
      </div>

      <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: '700', margin: '0 0 2px', color: '#111' }}>{getSectionTitle(seccion)}</h1>
            <p style={{ fontSize: '13px', color: '#999', margin: 0 }}>{user?.email}</p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {seccion === 'ventas' && (
              <button
                onClick={() => setShowForm(!showForm)}
                style={{
                  background: '#1a1a2e',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '10px 20px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                + Nueva venta
              </button>
            )}

            {seccion === 'referencias' && (
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  background: '#1a1a2e',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '10px 20px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                + Importar Excel
              </button>
            )}

            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: '#FF6B8A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: '700',
                fontSize: '13px',
              }}
            >
              {user?.email?.[0]?.toUpperCase()}
            </div>
          </div>
        </div>

        <input ref={fileInputRef} type="file" accept=".xlsx,.csv" style={{ display: 'none' }} onChange={onFileSelected} />

        {seccion === 'dashboard' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '1.5rem' }}>
              <div style={{ background: 'linear-gradient(135deg,#FF6B8A,#ff8fab)', borderRadius: '20px', padding: '1.5rem', color: '#fff' }}>
                <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '8px' }}>Total unidades vendidas</div>
                <div style={{ fontSize: '32px', fontWeight: '700' }}>{totalUnidades.toLocaleString()}</div>
                <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '8px' }}>{ventas.length} ventas registradas</div>
              </div>

              <div style={cardStyle}>
                <div style={{ fontSize: '12px', color: '#999', marginBottom: '8px' }}>Ingresos totales</div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#111' }}>${(totalIngresos / 1000000).toFixed(1)}M</div>
                <div style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>COP estimado</div>
              </div>

              <div style={cardStyle}>
                <div style={{ fontSize: '12px', color: '#999', marginBottom: '8px' }}>Referencias en catálogo</div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#111' }}>{referencias.length}</div>
                <div style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>Importadas por Excel o CSV</div>
              </div>

              <div style={cardStyle}>
                <div style={{ fontSize: '12px', color: '#999', marginBottom: '8px' }}>Prenda estrella</div>
                <div style={{ fontSize: '22px', fontWeight: '700', color: '#111' }}>{topPrenda ? topPrenda.tipo_prenda : '-'}</div>
                <div style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
                  {topPrenda ? `${topPrenda.unidades} un. · ${topPrenda.color}` : 'Sin datos aún'}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={cardStyle}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#111', marginBottom: '1.25rem' }}>Unidades por prenda</div>
                {porTipo.length === 0 ? (
                  <p style={{ color: '#ccc', fontSize: '13px' }}>Sin datos aún</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {porTipo.sort((a, b) => b.total - a.total).map((row, index) => (
                      <div key={row.nombre}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                          <span style={{ color: '#555' }}>{row.nombre}</span>
                          <span style={{ fontWeight: '600', color: '#111' }}>{row.total}</span>
                        </div>
                        <div style={{ height: '8px', background: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${(row.total / maxVal) * 100}%`,
                              background: COLORS[index % COLORS.length],
                              borderRadius: '4px',
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={cardStyle}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#111', marginBottom: '1.25rem' }}>Referencias recientes</div>
                {referencias.length === 0 ? (
                  <p style={{ color: '#ccc', fontSize: '13px' }}>Aún no has importado referencias.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {referencias.slice(0, 5).map((referencia, index) => (
                      <div key={referencia.id ?? referencia.reference_code} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            background: COLORS[index % COLORS.length] + '33',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '16px',
                          }}
                        >
                          ▣
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '13px', fontWeight: '500', color: '#111' }}>{referencia.reference_code}</div>
                          <div style={{ fontSize: '11px', color: '#999' }}>
                            {referencia.nombre ?? referencia.tipo_prenda ?? 'Sin nombre'} {referencia.color ? `· ${referencia.color}` : ''}
                          </div>
                        </div>
                        <div style={{ fontSize: '11px', color: '#999' }}>{referencia.temporada ?? 'Sin temporada'}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {seccion === 'ventas' && (
          <div>
            {showForm && (
              <div style={{ ...cardStyle, marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#111', marginBottom: '1rem' }}>Nueva venta</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '1rem' }}>
                  <select value={tipo} onChange={(event) => setTipo(event.target.value)} style={inputStyle}>
                    {prendas.map((prenda) => (
                      <option key={prenda}>{prenda}</option>
                    ))}
                  </select>
                  <input placeholder="Color" value={color} onChange={(event) => setColor(event.target.value)} style={inputStyle} />
                  <select value={talla} onChange={(event) => setTalla(event.target.value)} style={inputStyle}>
                    {tallas.map((size) => (
                      <option key={size}>{size}</option>
                    ))}
                  </select>
                  <input placeholder="Unidades" type="number" value={unidades} onChange={(event) => setUnidades(event.target.value)} style={inputStyle} />
                  <input placeholder="Precio $" type="number" value={precio} onChange={(event) => setPrecio(event.target.value)} style={inputStyle} />
                  <select value={temporada} onChange={(event) => setTemporada(event.target.value)} style={inputStyle}>
                    {temporadas.map((season) => (
                      <option key={season}>{season}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={registrarVenta}
                    style={{ background: '#1a1a2e', color: '#fff', border: 'none', borderRadius: '10px', padding: '9px 20px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                  >
                    Guardar
                  </button>
                  <button
                    onClick={() => setShowForm(false)}
                    style={{ background: '#f0f0f0', color: '#555', border: 'none', borderRadius: '10px', padding: '9px 20px', fontSize: '13px', cursor: 'pointer' }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            <div style={cardStyle}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#111', marginBottom: '1rem' }}>Todas las ventas</div>
              {ventas.length === 0 ? (
                <p style={{ color: '#ccc', fontSize: '13px' }}>No hay ventas registradas aún</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr>
                        {['Prenda', 'Color', 'Talla', 'Unidades', 'Precio', 'Temporada', 'Ingresos'].map((header) => (
                          <th
                            key={header}
                            style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid #f0f0f0', color: '#aaa', fontWeight: '500', fontSize: '11px' }}
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {ventas.map((venta, index) => (
                        <tr key={venta.id} style={{ background: index % 2 === 0 ? '#fff' : '#fafafa' }}>
                          <td style={{ padding: '12px', color: '#111', fontWeight: '500' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div
                                style={{
                                  width: '28px',
                                  height: '28px',
                                  borderRadius: '8px',
                                  background: COLORS[index % COLORS.length] + '33',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '13px',
                                }}
                              >
                                👗
                              </div>
                              {venta.tipo_prenda}
                            </div>
                          </td>
                          <td style={{ padding: '12px', color: '#555' }}>{venta.color}</td>
                          <td style={{ padding: '12px' }}>
                            <span style={{ background: '#f0f0f0', padding: '3px 8px', borderRadius: '6px', fontSize: '12px', color: '#555' }}>{venta.talla}</span>
                          </td>
                          <td style={{ padding: '12px', fontWeight: '600', color: '#111' }}>{venta.unidades}</td>
                          <td style={{ padding: '12px', color: '#555' }}>${venta.precio.toLocaleString()}</td>
                          <td style={{ padding: '12px' }}>
                            <span style={{ background: '#EEEDFE', color: '#534AB7', fontSize: '11px', padding: '4px 10px', borderRadius: '20px' }}>{venta.temporada}</span>
                          </td>
                          <td style={{ padding: '12px', fontWeight: '600', color: '#FF6B8A' }}>${(venta.unidades * venta.precio).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {seccion === 'referencias' && (
          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={cardStyle}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#111', marginBottom: '4px' }}>Importar catálogo desde Excel</div>
              <div style={{ fontSize: '13px', color: '#999', marginBottom: '1rem' }}>
                Sube un archivo `.xlsx` o `.csv`. Usa `reference_code` como columna obligatoria. También puedes incluir `nombre`, `tipo`, `color`, `talla`, `precio`, `temporada`, `notas` e `image_url`.
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '1rem' }}>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={previewLoading || commitLoading}
                  style={{
                    background: '#1a1a2e',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '10px 18px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: previewLoading || commitLoading ? 'not-allowed' : 'pointer',
                    opacity: previewLoading || commitLoading ? 0.6 : 1,
                  }}
                >
                  {previewLoading ? 'Leyendo archivo...' : 'Seleccionar archivo'}
                </button>

                {(preview || importFileName || importMessage || importError) && (
                  <button
                    onClick={resetImportState}
                    style={{ background: '#f0f0f0', color: '#555', border: 'none', borderRadius: '12px', padding: '10px 18px', fontSize: '13px', cursor: 'pointer' }}
                  >
                    Limpiar
                  </button>
                )}
              </div>

              {importFileName && <div style={{ fontSize: '12px', color: '#777', marginBottom: '12px' }}>Archivo cargado: {importFileName}</div>}
              {importMessage && <div style={{ background: '#eefbf3', border: '1px solid #c9efda', color: '#127148', borderRadius: '12px', padding: '12px 14px', fontSize: '13px', marginBottom: '12px' }}>{importMessage}</div>}
              {importError && <div style={{ background: '#fff0f0', border: '1px solid #ffd0d0', color: '#c83737', borderRadius: '12px', padding: '12px 14px', fontSize: '13px', marginBottom: '12px' }}>{importError}</div>}
              {referenciasError && <div style={{ background: '#fff8ea', border: '1px solid #ffe2ac', color: '#8a5b00', borderRadius: '12px', padding: '12px 14px', fontSize: '13px' }}>{referenciasError}</div>}
            </div>

            {preview && (
              <div style={{ ...cardStyle, display: 'grid', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#111', marginBottom: '8px' }}>Resumen de importación</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                    {[
                      ['Total filas', preview.summary.totalRows],
                      ['Filas válidas', preview.summary.validRows],
                      ['Filas con error', preview.summary.invalidRows],
                      ['Referencias nuevas', preview.summary.newRows],
                      ['Conflictos', preview.summary.conflicts],
                    ].map(([label, value]) => (
                      <div key={label} style={{ background: '#fafafa', borderRadius: '14px', padding: '14px' }}>
                        <div style={{ fontSize: '11px', color: '#999', marginBottom: '4px' }}>{label}</div>
                        <div style={{ fontSize: '22px', fontWeight: '700', color: '#111' }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ fontSize: '12px', color: '#777' }}>
                  Columnas detectadas: {preview.columnsDetected.length > 0 ? preview.columnsDetected.join(', ') : 'No se detectaron encabezados'}
                </div>

                {preview.conflicts.length > 0 && (
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#111', marginBottom: '8px' }}>Cómo resolver duplicados</div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => setConflictMode('skip')}
                        style={{
                          background: conflictMode === 'skip' ? '#1a1a2e' : '#f0f0f0',
                          color: conflictMode === 'skip' ? '#fff' : '#555',
                          border: 'none',
                          borderRadius: '12px',
                          padding: '10px 16px',
                          fontSize: '13px',
                          cursor: 'pointer',
                        }}
                      >
                        Omitir conflictos
                      </button>
                      <button
                        onClick={() => setConflictMode('replace')}
                        style={{
                          background: conflictMode === 'replace' ? '#1a1a2e' : '#f0f0f0',
                          color: conflictMode === 'replace' ? '#fff' : '#555',
                          border: 'none',
                          borderRadius: '12px',
                          padding: '10px 16px',
                          fontSize: '13px',
                          cursor: 'pointer',
                        }}
                      >
                        Actualizar existentes
                      </button>
                    </div>
                  </div>
                )}

                {preview.errors.length > 0 && (
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#111', marginBottom: '8px' }}>Filas con error</div>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                          <tr>
                            {['Fila', 'Detalle'].map((header) => (
                              <th
                                key={header}
                                style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid #f0f0f0', color: '#aaa', fontWeight: '500', fontSize: '11px' }}
                              >
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {preview.errors.map((errorRow) => (
                            <tr key={`${errorRow.rowNumber}-${errorRow.message}`}>
                              <td style={{ padding: '12px', borderBottom: '1px solid #f7f7f7', color: '#111', fontWeight: '600' }}>{errorRow.rowNumber}</td>
                              <td style={{ padding: '12px', borderBottom: '1px solid #f7f7f7', color: '#555' }}>{errorRow.message}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {preview.conflicts.length > 0 && (
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#111', marginBottom: '8px' }}>Conflictos detectados</div>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                          <tr>
                            {['Referencia', 'Actual', 'Archivo'].map((header) => (
                              <th
                                key={header}
                                style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid #f0f0f0', color: '#aaa', fontWeight: '500', fontSize: '11px' }}
                              >
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {preview.conflicts.map((conflict) => (
                            <tr key={conflict.reference_code}>
                              <td style={{ padding: '12px', borderBottom: '1px solid #f7f7f7', color: '#111', fontWeight: '600' }}>{conflict.reference_code}</td>
                              <td style={{ padding: '12px', borderBottom: '1px solid #f7f7f7', color: '#555' }}>
                                {conflict.existing.nombre ?? conflict.existing.tipo_prenda ?? 'Sin nombre'} {conflict.existing.color ? `· ${conflict.existing.color}` : ''}
                              </td>
                              <td style={{ padding: '12px', borderBottom: '1px solid #f7f7f7', color: '#555' }}>
                                {conflict.incoming.nombre ?? conflict.incoming.tipo_prenda ?? 'Sin nombre'} {conflict.incoming.color ? `· ${conflict.incoming.color}` : ''}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    onClick={confirmarImportacion}
                    disabled={commitLoading || preview.rows.length === 0 || preview.summary.invalidRows > 0}
                    style={{
                      background: '#1a1a2e',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '10px 18px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: commitLoading || preview.rows.length === 0 || preview.summary.invalidRows > 0 ? 'not-allowed' : 'pointer',
                      opacity: commitLoading || preview.rows.length === 0 || preview.summary.invalidRows > 0 ? 0.6 : 1,
                    }}
                  >
                    {commitLoading ? 'Guardando referencias...' : 'Confirmar importación'}
                  </button>
                  <div style={{ fontSize: '12px', color: '#888', alignSelf: 'center' }}>
                    {preview.summary.invalidRows > 0
                      ? 'Debes corregir el archivo antes de guardar.'
                      : preview.summary.conflicts > 0
                        ? `Modo actual: ${conflictMode === 'skip' ? 'omitir conflictos' : 'actualizar referencias existentes'}.`
                        : 'Todo listo para guardar.'}
                  </div>
                </div>
              </div>
            )}

            <div style={cardStyle}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#111', marginBottom: '1rem' }}>Catálogo de referencias</div>
              {referencias.length === 0 ? (
                <p style={{ color: '#ccc', fontSize: '13px' }}>Aún no hay referencias cargadas.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr>
                        {['Referencia', 'Nombre', 'Tipo', 'Color', 'Talla', 'Precio', 'Temporada'].map((header) => (
                          <th
                            key={header}
                            style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid #f0f0f0', color: '#aaa', fontWeight: '500', fontSize: '11px' }}
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {referencias.map((referencia, index) => (
                        <tr key={referencia.id ?? referencia.reference_code} style={{ background: index % 2 === 0 ? '#fff' : '#fafafa' }}>
                          <td style={{ padding: '12px', color: '#111', fontWeight: '600' }}>{referencia.reference_code}</td>
                          <td style={{ padding: '12px', color: '#555' }}>{referencia.nombre ?? '-'}</td>
                          <td style={{ padding: '12px', color: '#555' }}>{referencia.tipo_prenda ?? '-'}</td>
                          <td style={{ padding: '12px', color: '#555' }}>{referencia.color ?? '-'}</td>
                          <td style={{ padding: '12px', color: '#555' }}>{referencia.talla ?? '-'}</td>
                          <td style={{ padding: '12px', color: '#555' }}>{referencia.precio !== null && referencia.precio !== undefined ? `$${referencia.precio.toLocaleString()}` : '-'}</td>
                          <td style={{ padding: '12px', color: '#555' }}>{referencia.temporada ?? '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {seccion === 'ia' && (
          <div>
            <div style={{ ...cardStyle, marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#111', marginBottom: '4px' }}>Análisis inteligente de tu colección</div>
              <div style={{ fontSize: '13px', color: '#999', marginBottom: '1.25rem' }}>
                Claude analiza tus ventas y te dice qué producir más, qué descontinuar y qué tendencias aprovechar.
              </div>
              <button
                onClick={analizarConIA}
                disabled={loadingIA || ventas.length === 0}
                style={{
                  background: ventas.length === 0 ? '#f0f0f0' : '#1a1a2e',
                  color: ventas.length === 0 ? '#aaa' : '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px 28px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: ventas.length === 0 ? 'not-allowed' : 'pointer',
                }}
              >
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
