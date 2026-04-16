import { NextRequest, NextResponse } from 'next/server'
import { createImportPreview, parseReferenceImportFile, ReferenciaRecord } from '@/lib/referencias'
import { requireRouteUser } from '@/lib/supabase-route'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const { supabase, user } = await requireRouteUser(req)
    const formData = await req.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Adjunta un archivo antes de importar.' }, { status: 400 })
    }

    const buffer = new Uint8Array(await file.arrayBuffer())
    const parsedFile = parseReferenceImportFile(file.name, buffer)

    const referenceCodes = parsedFile.rows.map((row) => row.reference_code)
    let existingRows: ReferenciaRecord[] = []

    if (referenceCodes.length > 0) {
      const { data, error } = await supabase
        .from('referencias')
        .select('id, created_at, empresa, reference_code, nombre, tipo_prenda, color, talla, precio, temporada, notas, image_url')
        .eq('empresa', user.email)
        .in('reference_code', referenceCodes)

      if (error) {
        throw new Error(error.message)
      }

      existingRows = (data ?? []) as ReferenciaRecord[]
    }

    const preview = createImportPreview(parsedFile, existingRows)
    return NextResponse.json(preview)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No fue posible previsualizar el archivo.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
