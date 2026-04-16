import { NextRequest, NextResponse } from 'next/server'
import { ReferenciaRecord, sanitizeCommitRows } from '@/lib/referencias'
import { requireRouteUser } from '@/lib/supabase-route'

type CommitMode = 'skip' | 'replace'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const { supabase, user } = await requireRouteUser(req)
    const body = await req.json()
    const mode = body?.mode as CommitMode

    if (mode !== 'skip' && mode !== 'replace') {
      return NextResponse.json({ error: 'Selecciona una estrategia de conflictos válida.' }, { status: 400 })
    }

    const rows = sanitizeCommitRows(body?.rows)

    if (rows.length === 0) {
      return NextResponse.json({ error: 'No hay filas válidas para guardar.' }, { status: 400 })
    }

    const referenceCodes = rows.map((row) => row.reference_code)
    const { data: existingData, error: existingError } = await supabase
      .from('referencias')
      .select('id, created_at, empresa, reference_code, nombre, tipo_prenda, color, talla, precio, temporada, notas, image_url')
      .eq('empresa', user.email)
      .in('reference_code', referenceCodes)

    if (existingError) {
      throw new Error(existingError.message)
    }

    const existingRows = (existingData ?? []) as ReferenciaRecord[]
    const existingMap = new Map(existingRows.map((row) => [row.reference_code.toUpperCase(), row]))

    const rowsToSave = rows
      .filter((row) => mode === 'replace' || !existingMap.has(row.reference_code))
      .map((row) => ({
        empresa: user.email,
        reference_code: row.reference_code,
        nombre: row.nombre,
        tipo_prenda: row.tipo_prenda,
        color: row.color,
        talla: row.talla,
        precio: row.precio,
        temporada: row.temporada,
        notas: row.notas,
        image_url: row.image_url,
      }))

    if (rowsToSave.length === 0) {
      return NextResponse.json({
        saved: 0,
        skippedConflicts: existingRows.length,
        resolvedConflicts: 0,
      })
    }

    const { data: savedRows, error: saveError } = await supabase
      .from('referencias')
      .upsert(rowsToSave, {
        onConflict: 'empresa,reference_code',
        ignoreDuplicates: mode === 'skip',
      })
      .select('id, reference_code')

    if (saveError) {
      throw new Error(saveError.message)
    }

    const conflictCount = rows.filter((row) => existingMap.has(row.reference_code)).length

    return NextResponse.json({
      saved: savedRows?.length ?? rowsToSave.length,
      skippedConflicts: mode === 'skip' ? conflictCount : 0,
      resolvedConflicts: mode === 'replace' ? conflictCount : 0,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No fue posible guardar las referencias.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
