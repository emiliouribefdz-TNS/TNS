import * as XLSX from 'xlsx'

export type VentaImportRow = {
  rowNumber: number
  tipo_prenda: string
  color: string | null
  talla: string | null
  unidades: number
  precio: number
  temporada: string | null
}

export type VentaImportError = {
  rowNumber: number
  message: string
}

export type VentaImportPreview = {
  fileName: string
  columnsDetected: string[]
  rows: VentaImportRow[]
  errors: VentaImportError[]
  summary: {
    totalRows: number
    validRows: number
    invalidRows: number
  }
}

const FIELD_ALIASES: Record<string, keyof VentaImportRow> = {
  tipoprenda: 'tipo_prenda',
  tipo: 'tipo_prenda',
  prenda: 'tipo_prenda',
  categoria: 'tipo_prenda',
  producto: 'tipo_prenda',
  garment: 'tipo_prenda',
  item: 'tipo_prenda',
  referencia: 'tipo_prenda',
  nombre: 'tipo_prenda',
  color: 'color',
  talla: 'talla',
  size: 'talla',
  talle: 'talla',
  unidades: 'unidades',
  cantidad: 'unidades',
  qty: 'unidades',
  quantity: 'unidades',
  units: 'unidades',
  und: 'unidades',
  precio: 'precio',
  precioventa: 'precio',
  valor: 'precio',
  price: 'precio',
  preciounidad: 'precio',
  preciounitario: 'precio',
  temporada: 'temporada',
  coleccion: 'temporada',
  season: 'temporada',
  collection: 'temporada',
}

const SUPPORTED_EXTENSIONS = new Set(['xlsx', 'csv'])

function normalizeHeader(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '')
}

function toNullableString(value: unknown) {
  if (value === null || value === undefined) return null
  const text = String(value).trim()
  return text || null
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const normalized = String(value).replace(/[^\d,.-]/g, '').replace(/\.(?=.*\.)/g, '').replace(',', '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function parseWorkbook(fileName: string, buffer: Uint8Array) {
  const extension = fileName.split('.').pop()?.toLowerCase() ?? ''
  if (!SUPPORTED_EXTENSIONS.has(extension)) {
    throw new Error('Formato no soportado. Usa un archivo .xlsx o .csv.')
  }
  if (extension === 'csv') {
    const csvText = new TextDecoder('utf-8').decode(buffer)
    return XLSX.read(csvText, { type: 'string' })
  }
  return XLSX.read(buffer, { type: 'array' })
}

function getMappedValue(raw: Record<string, unknown>, field: keyof VentaImportRow) {
  for (const [header, value] of Object.entries(raw)) {
    const mapped = FIELD_ALIASES[normalizeHeader(header)]
    if (mapped === field) return value
  }
  return null
}

export function parseVentasImportFile(fileName: string, buffer: Uint8Array): VentaImportPreview {
  const workbook = parseWorkbook(fileName, buffer)
  const firstSheetName = workbook.SheetNames[0]

  if (!firstSheetName) {
    throw new Error('El archivo no contiene hojas para importar.')
  }

  const sheet = workbook.Sheets[firstSheetName]
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: false,
  })

  const columnsDetected = rawRows[0] ? Object.keys(rawRows[0]) : []
  const rows: VentaImportRow[] = []
  const errors: VentaImportError[] = []

  rawRows.forEach((rawRow, index) => {
    const rowNumber = index + 2
    const tipoPrenda = toNullableString(getMappedValue(rawRow, 'tipo_prenda'))
    const unidades = toNumber(getMappedValue(rawRow, 'unidades'))
    const precio = toNumber(getMappedValue(rawRow, 'precio'))

    if (!tipoPrenda) {
      errors.push({ rowNumber, message: 'Falta el tipo de prenda (columna obligatoria).' })
      return
    }

    if (unidades === null || unidades <= 0) {
      errors.push({ rowNumber, message: `Fila "${tipoPrenda}": las unidades deben ser un número mayor a 0.` })
      return
    }

    if (precio === null || precio <= 0) {
      errors.push({ rowNumber, message: `Fila "${tipoPrenda}": el precio debe ser un número mayor a 0.` })
      return
    }

    rows.push({
      rowNumber,
      tipo_prenda: tipoPrenda,
      color: toNullableString(getMappedValue(rawRow, 'color')),
      talla: toNullableString(getMappedValue(rawRow, 'talla')),
      unidades: Math.round(unidades),
      precio,
      temporada: toNullableString(getMappedValue(rawRow, 'temporada')),
    })
  })

  return {
    fileName,
    columnsDetected,
    rows,
    errors,
    summary: {
      totalRows: rawRows.length,
      validRows: rows.length,
      invalidRows: errors.length,
    },
  }
}

export function sanitizeVentaCommitRows(payload: unknown): VentaImportRow[] {
  if (!Array.isArray(payload)) {
    throw new Error('No se recibieron filas válidas para guardar.')
  }

  return payload.map((row, index) => {
    if (!row || typeof row !== 'object') {
      throw new Error(`La fila ${index + 1} no tiene un formato válido.`)
    }

    const candidate = row as Partial<VentaImportRow>
    const tipoPrenda = toNullableString(candidate.tipo_prenda)

    if (!tipoPrenda) {
      throw new Error(`La fila ${index + 1} no tiene tipo_prenda.`)
    }

    const unidades = toNumber(candidate.unidades)
    const precio = toNumber(candidate.precio)

    if (unidades === null || unidades <= 0) {
      throw new Error(`La fila ${index + 1} tiene unidades inválidas.`)
    }

    if (precio === null || precio <= 0) {
      throw new Error(`La fila ${index + 1} tiene precio inválido.`)
    }

    return {
      rowNumber: Number.isFinite(candidate.rowNumber) ? Number(candidate.rowNumber) : index + 2,
      tipo_prenda: tipoPrenda,
      color: toNullableString(candidate.color),
      talla: toNullableString(candidate.talla),
      unidades: Math.round(unidades),
      precio,
      temporada: toNullableString(candidate.temporada),
    }
  })
}
