'use client'

import { ChangeEvent, CSSProperties, useEffect, useRef, useState } from 'react'
import { createClient, User } from '@supabase/supabase-js'
import type { VentaImportPreview } from '@/lib/ventas'

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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
)

const prendas = ['Camiseta', 'Jean', 'Blusa', 'Vestido', 'Chaqueta', 'Pantalón', 'Falda']

/* Tennis brand palette */
const NAVY = '#0D1B2A'
const NAVY_LIGHT = '#1B2A4A'
const NAVY_MID = '#15233B'
const GOLD = '#C9A84C'
const ACCENT = '#E63946'
const WHITE = '#FFFFFF'
const OFFWHITE = '#F5F6F8'
const GRAY50 = '#F8F9FA'
const GRAY100 = '#EEF0F2'
const GRAY200 = '#DEE2E6'
const GRAY400 = '#ADB5BD'
const GRAY600 = '#6C757D'
const GRAY800 = '#343A40'

const BAR_COLORS = ['#1B2A4A', '#C9A84C', '#E63946', '#2D9F6F', '#6C757D', '#4A90D9', '#D4A373']

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: 'D' },
  { id: 'ventas', label: 'Ventas', icon: 'V' },
  { id: 'ia', label: 'Análisis IA', icon: 'AI' },
] as const

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '8px',
  border: `1.5px solid ${GRAY200}`,
  fontSize: '13px',
  color: NAVY,
  background: GRAY50,
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: "'Helvetica Neue', sans-serif",
}

const cardStyle: CSSProperties = {
  background: WHITE,
  borderRadius: '14px',
  padding: '1.5rem',
  border: `1px solid ${GRAY100}`,
}

function TennisLogoSmall({ width = 28 }: { width?: number }) {
  return <img src="/tns-logo-white.svg" alt="TNS" width={width} style={{ objectFit: 'contain' }} />
}

function getSectionTitle(section: string) {
  if (section === 'ventas') return 'Ventas'
  if (section === 'ia') return 'Análisis IA'
  return 'Dashboard'
}

function getSectionSubtitle(section: string) {
  if (section === 'ventas') return 'Importa o registra las ventas de tu colección'
  if (section === 'ia') return 'Recomendaciones inteligentes con Claude'
  return 'Resumen general de tu operación'
}

export default function Dashboard() {
  const [ventas, setVentas] = useState<Venta[]>([])
  const [analisis, setAnalisis] = useState('')
  const [analisisError, setAnalisisError] = useState('')
  const [loadingIA, setLoadingIA] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [seccion, setSeccion] = useState<(typeof navItems)[number]['id']>('dashboard')
  const [preview, setPreview] = useState<VentaImportPreview | null>(null)
  const [importFileName, setImportFileName] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [commitLoading, setCommitLoading] = useState(false)
  const [importMessage, setImportMessage] = useState('')
  const [importError, setImportError] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        window.location.href = '/login'
        return
      }

      setUser(data.user)
      await cargarVentas()
    })
  }, [])

  const cargarVentas = async () => {
    const { data } = await supabase.from('ventas').select('*').order('created_at', { ascending: false })
    if (data) setVentas(data as Venta[])
  }

  const analizarConIA = async () => {
    setLoadingIA(true)
    setAnalisis('')
    setAnalisisError('')

    try {
      const resumen = ventas
        .map((venta) => `${venta.tipo_prenda} ${venta.color} talla ${venta.talla}: ${venta.unidades} unidades a $${venta.precio}`)
        .join('\n')
      const res = await fetch('/api/analizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ventas: resumen }),
      })
      const raw = await res.text()
      let data: { resultado?: string; error?: string } = {}
      try {
        data = raw ? JSON.parse(raw) : {}
      } catch {
        throw new Error(raw || `Respuesta inválida del servidor (${res.status}).`)
      }
      if (!res.ok) {
        throw new Error(data.error || `Error ${res.status} al analizar con Claude.`)
      }
      setAnalisis(data.resultado ?? '')
    } catch (err) {
      setAnalisisError(err instanceof Error ? err.message : 'Error desconocido al analizar con Claude.')
    } finally {
      setLoadingIA(false)
    }
  }

  const eliminarConversacion = () => {
    setAnalisis('')
    setAnalisisError('')
  }

  const eliminarVentas = async () => {
    if (ventas.length === 0) return
    const confirmar = window.confirm(
      `¿Eliminar las ${ventas.length} ventas importadas? Esta acción no se puede deshacer.`
    )
    if (!confirmar) return

    setDeleteLoading(true)
    setImportMessage('')
    setImportError('')

    try {
      const token = await getAccessToken()
      const res = await fetch('/api/ventas/delete', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error ?? 'No fue posible eliminar las ventas.')
      }
      setImportMessage(`${data.deleted} ventas eliminadas.`)
      resetImportState()
      await cargarVentas()
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'No fue posible eliminar las ventas.')
    } finally {
      setDeleteLoading(false)
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

      const res = await fetch('/api/ventas/preview', {
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

      setPreview(data as VentaImportPreview)
      setImportFileName(file.name)
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
      const res = await fetch('/api/ventas/commit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rows: preview.rows }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error ?? 'No fue posible guardar las ventas.')
      }

      setImportMessage(`Importación completada. ${data.saved} ventas guardadas.`)
      setPreview(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      await cargarVentas()
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'No fue posible guardar las ventas.')
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

  const btnPrimary: CSSProperties = {
    background: NAVY,
    color: WHITE,
    border: 'none',
    borderRadius: '8px',
    padding: '10px 20px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    letterSpacing: '0.2px',
    fontFamily: "'Helvetica Neue', sans-serif",
  }

  const btnSecondary: CSSProperties = {
    background: GRAY100,
    color: GRAY600,
    border: 'none',
    borderRadius: '8px',
    padding: '10px 20px',
    fontSize: '13px',
    cursor: 'pointer',
    fontFamily: "'Helvetica Neue', sans-serif",
  }

  const thStyle: CSSProperties = {
    textAlign: 'left',
    padding: '10px 14px',
    borderBottom: `1px solid ${GRAY100}`,
    color: GRAY400,
    fontWeight: '500',
    fontSize: '11px',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: OFFWHITE, fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
      {/* Sidebar */}
      <div
        style={{
          width: '220px',
          background: NAVY,
          display: 'flex',
          flexDirection: 'column',
          padding: '1.5rem 0',
        }}
      >
        {/* Logo area */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '0 1.25rem',
          marginBottom: '2rem',
        }}>
          <div style={{
            width: '38px',
            height: '38px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <TennisLogoSmall width={24} />
          </div>
          <div>
            <div style={{ color: WHITE, fontSize: '15px', fontWeight: '700', letterSpacing: '2px' }}>TENNIS</div>
            <div style={{ color: GOLD, fontSize: '10px', fontWeight: '500', letterSpacing: '1px' }}>FASHION AI</div>
          </div>
        </div>

        {/* Nav section label */}
        <div style={{
          padding: '0 1.25rem',
          marginBottom: '8px',
          fontSize: '10px',
          fontWeight: '600',
          color: 'rgba(255,255,255,0.25)',
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
        }}>
          Menu
        </div>

        {/* Nav items */}
        {navItems.map((item) => (
          <div
            key={item.id}
            onClick={() => setSeccion(item.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '11px 1.25rem',
              cursor: 'pointer',
              background: seccion === item.id ? 'rgba(255,255,255,0.08)' : 'transparent',
              borderLeft: seccion === item.id ? `3px solid ${GOLD}` : '3px solid transparent',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: seccion === item.id ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: seccion === item.id ? GOLD : 'rgba(255,255,255,0.4)',
              fontSize: '11px',
              fontWeight: '700',
              letterSpacing: '0.5px',
            }}>
              {item.icon}
            </div>
            <span style={{
              color: seccion === item.id ? WHITE : 'rgba(255,255,255,0.5)',
              fontSize: '13px',
              fontWeight: seccion === item.id ? '600' : '400',
            }}>
              {item.label}
            </span>
          </div>
        ))}

        {/* Bottom section */}
        <div style={{ marginTop: 'auto', padding: '0 1.25rem' }}>
          <div style={{
            borderTop: '1px solid rgba(255,255,255,0.08)',
            paddingTop: '1rem',
            marginBottom: '0.5rem',
          }}>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginBottom: '4px' }}>
              {user?.email}
            </div>
          </div>
          <div
            onClick={cerrarSesion}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 0',
              cursor: 'pointer',
              color: 'rgba(255,255,255,0.4)',
              fontSize: '13px',
              transition: 'color 0.15s',
            }}
          >
            <span style={{ fontSize: '16px' }}>&#x2190;</span>
            Cerrar sesión
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, padding: '2rem 2.5rem', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', margin: '0 0 4px', color: NAVY, letterSpacing: '-0.3px' }}>
              {getSectionTitle(seccion)}
            </h1>
            <p style={{ fontSize: '13px', color: GRAY400, margin: 0 }}>
              {getSectionSubtitle(seccion)}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {seccion === 'ventas' && (
              <>
                <button onClick={() => fileInputRef.current?.click()} style={btnPrimary}>
                  + Importar Excel
                </button>
                <button
                  onClick={eliminarVentas}
                  disabled={deleteLoading || ventas.length === 0}
                  style={{
                    ...btnPrimary,
                    background: ventas.length === 0 ? GRAY100 : ACCENT,
                    color: ventas.length === 0 ? GRAY400 : WHITE,
                    cursor: deleteLoading || ventas.length === 0 ? 'not-allowed' : 'pointer',
                    opacity: deleteLoading ? 0.6 : 1,
                  }}
                >
                  {deleteLoading ? 'Eliminando...' : 'Eliminar ventas'}
                </button>
              </>
            )}

            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: NAVY,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: WHITE,
                fontWeight: '700',
                fontSize: '13px',
              }}
            >
              {user?.email?.[0]?.toUpperCase()}
            </div>
          </div>
        </div>

        <input ref={fileInputRef} type="file" accept=".xlsx,.csv" style={{ display: 'none' }} onChange={onFileSelected} />

        {/* DASHBOARD SECTION */}
        {seccion === 'dashboard' && (
          <div>
            {/* KPI cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '1.5rem' }}>
              <div style={{
                background: `linear-gradient(135deg, ${NAVY} 0%, ${NAVY_LIGHT} 100%)`,
                borderRadius: '14px',
                padding: '1.5rem',
                color: WHITE,
                position: 'relative',
                overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(201,168,76,0.1)' }} />
                <div style={{ fontSize: '11px', opacity: 0.6, marginBottom: '8px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Unidades vendidas</div>
                <div style={{ fontSize: '32px', fontWeight: '700' }}>{totalUnidades.toLocaleString()}</div>
                <div style={{ fontSize: '12px', opacity: 0.5, marginTop: '8px' }}>{ventas.length} ventas registradas</div>
              </div>

              <div style={cardStyle}>
                <div style={{ fontSize: '11px', color: GRAY400, marginBottom: '8px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Ingresos totales</div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: NAVY }}>${(totalIngresos / 1000000).toFixed(1)}M</div>
                <div style={{ fontSize: '12px', color: GRAY400, marginTop: '8px' }}>COP estimado</div>
              </div>

              <div style={cardStyle}>
                <div style={{ fontSize: '11px', color: GRAY400, marginBottom: '8px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Prenda estrella</div>
                <div style={{ fontSize: '22px', fontWeight: '700', color: NAVY }}>{topPrenda ? topPrenda.tipo_prenda : '-'}</div>
                <div style={{ fontSize: '12px', color: GRAY400, marginTop: '8px' }}>
                  {topPrenda ? `${topPrenda.unidades} un. · ${topPrenda.color}` : 'Sin datos aún'}
                </div>
              </div>
            </div>

            {/* Charts row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={cardStyle}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: NAVY, marginBottom: '1.25rem' }}>Unidades por prenda</div>
                {porTipo.length === 0 ? (
                  <p style={{ color: GRAY200, fontSize: '13px' }}>Sin datos aún</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {porTipo.sort((a, b) => b.total - a.total).map((row, index) => (
                      <div key={row.nombre}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                          <span style={{ color: GRAY600 }}>{row.nombre}</span>
                          <span style={{ fontWeight: '600', color: NAVY }}>{row.total}</span>
                        </div>
                        <div style={{ height: '6px', background: GRAY100, borderRadius: '3px', overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${(row.total / maxVal) * 100}%`,
                              background: BAR_COLORS[index % BAR_COLORS.length],
                              borderRadius: '3px',
                              transition: 'width 0.5s ease',
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={cardStyle}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: NAVY, marginBottom: '1.25rem' }}>Ventas recientes</div>
                {ventas.length === 0 ? (
                  <p style={{ color: GRAY200, fontSize: '13px' }}>Aún no has importado ventas.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {ventas.slice(0, 5).map((venta, index) => (
                      <div key={venta.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            background: index === 0 ? `${GOLD}22` : `${NAVY}0A`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            fontWeight: '700',
                            color: index === 0 ? GOLD : NAVY_LIGHT,
                          }}
                        >
                          {venta.tipo_prenda[0]}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '13px', fontWeight: '500', color: NAVY }}>{venta.tipo_prenda}</div>
                          <div style={{ fontSize: '11px', color: GRAY400 }}>
                            {venta.color} {venta.talla ? `· ${venta.talla}` : ''} · {venta.unidades} un.
                          </div>
                        </div>
                        <div style={{ fontSize: '11px', fontWeight: '600', color: GOLD }}>${(venta.unidades * venta.precio).toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* VENTAS SECTION */}
        {seccion === 'ventas' && (
          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={cardStyle}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: NAVY, marginBottom: '4px' }}>Importar ventas desde Excel</div>
                <div style={{ fontSize: '13px', color: GRAY400, marginBottom: '1rem' }}>
                  Sube un archivo `.xlsx` o `.csv` con las columnas: <strong>tipo/prenda</strong> (obligatoria), <strong>unidades</strong> (obligatoria), <strong>precio</strong> (obligatoria), y opcionalmente color, talla, temporada.
                </div>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={previewLoading || commitLoading}
                    style={{
                      ...btnPrimary,
                      cursor: previewLoading || commitLoading ? 'not-allowed' : 'pointer',
                      opacity: previewLoading || commitLoading ? 0.6 : 1,
                    }}
                  >
                    {previewLoading ? 'Leyendo archivo...' : 'Seleccionar archivo'}
                  </button>

                  {(preview || importFileName || importMessage || importError) && (
                    <button onClick={resetImportState} style={btnSecondary}>Limpiar</button>
                  )}
                </div>

                {importFileName && <div style={{ fontSize: '12px', color: GRAY600, marginBottom: '12px' }}>Archivo: {importFileName}</div>}
                {importMessage && <div style={{ background: '#EEFBF3', border: '1px solid #c9efda', color: '#127148', borderRadius: '8px', padding: '12px 14px', fontSize: '13px', marginBottom: '12px' }}>{importMessage}</div>}
                {importError && <div style={{ background: '#FFF0F1', border: '1px solid #FFCDD2', color: ACCENT, borderRadius: '8px', padding: '12px 14px', fontSize: '13px', marginBottom: '12px' }}>{importError}</div>}
            </div>

            {/* Preview card */}
            {preview && (
              <div style={{ ...cardStyle, display: 'grid', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: NAVY, marginBottom: '8px' }}>Resumen de importación</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                    {[
                      ['Total filas', preview.summary.totalRows],
                      ['Filas válidas', preview.summary.validRows],
                      ['Filas con error', preview.summary.invalidRows],
                    ].map(([label, value]) => (
                      <div key={label} style={{ background: GRAY50, borderRadius: '10px', padding: '14px', border: `1px solid ${GRAY100}` }}>
                        <div style={{ fontSize: '11px', color: GRAY400, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{label}</div>
                        <div style={{ fontSize: '22px', fontWeight: '700', color: NAVY }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ fontSize: '12px', color: GRAY600 }}>
                  Columnas detectadas: {preview.columnsDetected.length > 0 ? preview.columnsDetected.join(', ') : 'No se detectaron encabezados'}
                </div>

                {preview.errors.length > 0 && (
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: NAVY, marginBottom: '8px' }}>Filas con error</div>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                          <tr>
                            {['Fila', 'Detalle'].map((header) => (
                              <th key={header} style={thStyle}>{header}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {preview.errors.map((errorRow) => (
                            <tr key={`${errorRow.rowNumber}-${errorRow.message}`}>
                              <td style={{ padding: '12px 14px', borderBottom: `1px solid ${GRAY100}`, color: NAVY, fontWeight: '600' }}>{errorRow.rowNumber}</td>
                              <td style={{ padding: '12px 14px', borderBottom: `1px solid ${GRAY100}`, color: GRAY600 }}>{errorRow.message}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Preview table of valid rows */}
                {preview.rows.length > 0 && (
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: NAVY, marginBottom: '8px' }}>Vista previa ({preview.rows.length} ventas)</div>
                    <div style={{ overflowX: 'auto', maxHeight: '300px', overflowY: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                          <tr>
                            {['Prenda', 'Color', 'Talla', 'Unidades', 'Precio', 'Temporada'].map((header) => (
                              <th key={header} style={thStyle}>{header}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {preview.rows.slice(0, 20).map((row) => (
                            <tr key={row.rowNumber} style={{ background: row.rowNumber % 2 === 0 ? WHITE : GRAY50 }}>
                              <td style={{ padding: '10px 14px', color: NAVY, fontWeight: '500' }}>{row.tipo_prenda}</td>
                              <td style={{ padding: '10px 14px', color: GRAY600 }}>{row.color ?? '-'}</td>
                              <td style={{ padding: '10px 14px', color: GRAY600 }}>{row.talla ?? '-'}</td>
                              <td style={{ padding: '10px 14px', fontWeight: '600', color: NAVY }}>{row.unidades}</td>
                              <td style={{ padding: '10px 14px', color: GRAY600 }}>${row.precio.toLocaleString()}</td>
                              <td style={{ padding: '10px 14px', color: GRAY600 }}>{row.temporada ?? '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {preview.rows.length > 20 && (
                        <div style={{ fontSize: '12px', color: GRAY400, padding: '10px 14px' }}>... y {preview.rows.length - 20} filas más</div>
                      )}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <button
                    onClick={confirmarImportacion}
                    disabled={commitLoading || preview.rows.length === 0 || preview.summary.invalidRows > 0}
                    style={{
                      ...btnPrimary,
                      cursor: commitLoading || preview.rows.length === 0 || preview.summary.invalidRows > 0 ? 'not-allowed' : 'pointer',
                      opacity: commitLoading || preview.rows.length === 0 || preview.summary.invalidRows > 0 ? 0.6 : 1,
                    }}
                  >
                    {commitLoading ? 'Guardando ventas...' : 'Confirmar importación'}
                  </button>
                  <div style={{ fontSize: '12px', color: GRAY400 }}>
                    {preview.summary.invalidRows > 0
                      ? 'Debes corregir el archivo antes de guardar.'
                      : 'Todo listo para guardar.'}
                  </div>
                </div>
              </div>
            )}

            {/* Ventas table */}
            <div style={cardStyle}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: NAVY, marginBottom: '1rem' }}>Todas las ventas</div>
              {ventas.length === 0 ? (
                <p style={{ color: GRAY200, fontSize: '13px' }}>No hay ventas registradas aún</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr>
                        {['Prenda', 'Color', 'Talla', 'Unidades', 'Precio', 'Temporada', 'Ingresos'].map((header) => (
                          <th key={header} style={thStyle}>{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {ventas.map((venta, index) => (
                        <tr key={venta.id} style={{ background: index % 2 === 0 ? WHITE : GRAY50 }}>
                          <td style={{ padding: '12px 14px', color: NAVY, fontWeight: '500' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div
                                style={{
                                  width: '30px',
                                  height: '30px',
                                  borderRadius: '8px',
                                  background: `${NAVY}0A`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '12px',
                                  color: NAVY_LIGHT,
                                }}
                              >
                                {venta.tipo_prenda[0]}
                              </div>
                              {venta.tipo_prenda}
                            </div>
                          </td>
                          <td style={{ padding: '12px 14px', color: GRAY600 }}>{venta.color}</td>
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{ background: GRAY100, padding: '3px 10px', borderRadius: '6px', fontSize: '12px', color: GRAY600, fontWeight: '500' }}>{venta.talla}</span>
                          </td>
                          <td style={{ padding: '12px 14px', fontWeight: '600', color: NAVY }}>{venta.unidades}</td>
                          <td style={{ padding: '12px 14px', color: GRAY600 }}>${venta.precio.toLocaleString()}</td>
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{ background: `${NAVY}0D`, color: NAVY_LIGHT, fontSize: '11px', padding: '4px 12px', borderRadius: '20px', fontWeight: '500' }}>{venta.temporada}</span>
                          </td>
                          <td style={{ padding: '12px 14px', fontWeight: '600', color: GOLD }}>${(venta.unidades * venta.precio).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* IA SECTION */}
        {seccion === 'ia' && (
          <div>
            <div style={{ ...cardStyle, marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  background: `${GOLD}22`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: '700',
                  color: GOLD,
                }}>
                  AI
                </div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: NAVY }}>Análisis inteligente de tu colección</div>
              </div>
              <div style={{ fontSize: '13px', color: GRAY400, marginBottom: '1.25rem', paddingLeft: '38px' }}>
                Claude analiza tus ventas y te recomienda qué producir más, qué descontinuar y qué tendencias aprovechar.
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  onClick={analizarConIA}
                  disabled={loadingIA || ventas.length === 0}
                  style={{
                    ...btnPrimary,
                    background: ventas.length === 0 ? GRAY100 : NAVY,
                    color: ventas.length === 0 ? GRAY400 : WHITE,
                    padding: '12px 28px',
                    cursor: ventas.length === 0 ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loadingIA ? 'Analizando...' : 'Analizar con Claude'}
                </button>
                {(analisis || analisisError) && (
                  <button
                    onClick={eliminarConversacion}
                    disabled={loadingIA}
                    style={{
                      ...btnPrimary,
                      background: ACCENT,
                      color: WHITE,
                      padding: '12px 28px',
                      cursor: loadingIA ? 'not-allowed' : 'pointer',
                      opacity: loadingIA ? 0.6 : 1,
                    }}
                  >
                    Eliminar conversación
                  </button>
                )}
              </div>
              {ventas.length === 0 && <p style={{ fontSize: '12px', color: GRAY400, marginTop: '8px' }}>Registra al menos una venta primero.</p>}
            </div>

            {analisisError && (
              <div style={{
                background: 'rgba(220, 38, 38, 0.1)',
                border: '1px solid rgba(220, 38, 38, 0.4)',
                borderRadius: '14px',
                padding: '1rem 1.25rem',
                marginBottom: '1rem',
                fontSize: '13px',
                color: '#fca5a5',
                whiteSpace: 'pre-wrap',
              }}>
                {analisisError}
              </div>
            )}

            {analisis && (
              <div style={{
                background: `linear-gradient(135deg, ${NAVY} 0%, ${NAVY_MID} 100%)`,
                borderRadius: '14px',
                padding: '1.5rem',
              }}>
                <div style={{
                  fontSize: '10px',
                  fontWeight: '600',
                  color: GOLD,
                  marginBottom: '14px',
                  letterSpacing: '1.5px',
                  textTransform: 'uppercase',
                }}>
                  Análisis de Claude
                </div>
                <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.9)', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>{analisis}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
