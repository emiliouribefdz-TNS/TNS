import { NextRequest, NextResponse } from 'next/server'
import { parseVentasImportFile } from '@/lib/ventas'
import { requireRouteUser } from '@/lib/supabase-route'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    await requireRouteUser(req)
    const formData = await req.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Adjunta un archivo antes de importar.' }, { status: 400 })
    }

    const buffer = new Uint8Array(await file.arrayBuffer())
    const preview = parseVentasImportFile(file.name, buffer)
    return NextResponse.json(preview)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No fue posible previsualizar el archivo.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
