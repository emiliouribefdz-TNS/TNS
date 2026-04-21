import { NextRequest, NextResponse } from 'next/server'
import { sanitizeVentaCommitRows } from '@/lib/ventas'
import { requireRouteUser } from '@/lib/supabase-route'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const { supabase, user } = await requireRouteUser(req)
    const body = await req.json()
    const rows = sanitizeVentaCommitRows(body?.rows)

    if (rows.length === 0) {
      return NextResponse.json({ error: 'No hay filas válidas para guardar.' }, { status: 400 })
    }

    const rowsToInsert = rows.map((row) => ({
      empresa: user.email,
      mes: row.mes,
      marca: row.marca,
      genero: row.genero,
      linea: row.linea,
      tipo_producto: row.tipo_producto,
      referencia: row.referencia,
      unidades: row.unidades,
      venta_total: row.venta_total,
    }))

    const { error: insertError } = await supabase
      .from('ventas')
      .insert(rowsToInsert)

    if (insertError) {
      throw new Error(insertError.message)
    }

    return NextResponse.json({ saved: rowsToInsert.length })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No fue posible guardar las ventas.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
