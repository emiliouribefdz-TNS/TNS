import * as XLSX from 'xlsx'

export type VentaImportRow = {
  rowNumber: number
  mes: string
  marca: string
  genero: string
  linea: string
  tipo_producto: string
  referencia: string
  unidades: number
  venta_total: number
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
    totalUnidades: number
    totalVenta: number
  }
}

const FIELD_ALIASES: Record<string, keyof VentaImportRow> = {
  mes: 'mes',
  mesdelano: 'mes',
  mesdelanio: 'mes',
  month: 'mes',
  marca: 'marca',
  marcadeproducto: 'marca',
  brand: 'marca',
  genero: 'genero',
  clasegenero: 'genero',
  gender: 'genero',
  linea: 'linea',
  claselinea: 'linea',
  line: 'linea',
  tipo: 'tipo_producto',
  tipoproducto: 'tipo_producto',
  tipodeproducto: 'tipo_producto',
  tipoprenda: 'tipo_producto',
  clasetipo: 'tipo_producto',
  producttype: 'tipo_producto',
  referencia: 'referencia',
  referenciaproducto: 'referencia',
  ref: 'referencia',
  reference: 'referencia',
  codigo: 'referencia',
  sku: 'referencia',
  unidades: 'unidades',
  ventaunds: 'unidades',
  ventaunidades: 'unidades',
  unds: 'unidades',
  cantidad: 'unidades',
  units: 'unidades',
  ventatotal: 'venta_total',
  venta: 'venta_total',
  ventas: 'venta_total',
  total: 'venta_total',
  ventapesos: 'venta_total',
  ventacop: 'venta_total',
  monto: 'venta_total',
  importe: 'venta_total',
  valor: 'venta_total',
}

const SUPPORTED_EXTENSIONS = new Set(['xlsx', 'csv'])

const TEXT_FIELDS: (keyof VentaImportRow)[] = ['mes', 'marca', 'genero', 'linea', 'tipo_producto', 'referencia']

function normalizeHeader(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '')
}

function toText(value: unknown) {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value !== 'string') return null
  let s = value.trim()
  if (!s) return null
  const parenNegative = /^\(.*\)$/.test(s)
  if (parenNegative) s = s.slice(1, -1)
  s = s.replace(/[^\d.,\-]/g, '')
  const lastDot = s.lastIndexOf('.')
  const lastComma = s.lastIndexOf(',')
  if (lastDot > -1 && lastComma > -1) {
    if (lastDot > lastComma) s = s.replace(/,/g, '')
    else s = s.replace(/\./g, '').replace(',', '.')
  } else if (lastComma > -1) {
    const parts = s.split(',')
    const allThousand = parts.length > 1 && parts.slice(1).every((p) => p.length === 3)
    s = allThousand ? s.replace(/,/g, '') : s.replace(',', '.')
  }
  const parsed = Number(s)
  if (!Number.isFinite(parsed)) return null
  return parenNegative ? -parsed : parsed
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
    raw: true,
  })

  const columnsDetected = rawRows[0] ? Object.keys(rawRows[0]) : []
  const rows: VentaImportRow[] = []
  const errors: VentaImportError[] = []
  let totalUnidades = 0
  let totalVenta = 0

  rawRows.forEach((rawRow, index) => {
    const rowNumber = index + 2
    const referencia = toText(getMappedValue(rawRow, 'referencia'))
    const unidades = toNumber(getMappedValue(rawRow, 'unidades'))
    const ventaTotal = toNumber(getMappedValue(rawRow, 'venta_total'))

    if (!referencia) {
      errors.push({ rowNumber, message: 'Falta la referencia del producto (columna obligatoria).' })
      return
    }

    if (unidades === null || !Number.isFinite(unidades)) {
      errors.push({ rowNumber, message: `Ref. ${referencia}: las unidades deben ser un número.` })
      return
    }

    if (ventaTotal === null || !Number.isFinite(ventaTotal)) {
      errors.push({ rowNumber, message: `Ref. ${referencia}: la venta total debe ser un número.` })
      return
    }

    const row: VentaImportRow = {
      rowNumber,
      mes: toText(getMappedValue(rawRow, 'mes')),
      marca: toText(getMappedValue(rawRow, 'marca')),
      genero: toText(getMappedValue(rawRow, 'genero')),
      linea: toText(getMappedValue(rawRow, 'linea')),
      tipo_producto: toText(getMappedValue(rawRow, 'tipo_producto')),
      referencia,
      unidades: Math.round(unidades),
      venta_total: ventaTotal,
    }

    rows.push(row)
    totalUnidades += row.unidades
    totalVenta += row.venta_total
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
      totalUnidades,
      totalVenta,
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
    const referencia = toText(candidate.referencia)

    if (!referencia) {
      throw new Error(`La fila ${index + 1} no tiene referencia.`)
    }

    const unidades = toNumber(candidate.unidades)
    const ventaTotal = toNumber(candidate.venta_total)

    if (unidades === null || !Number.isFinite(unidades)) {
      throw new Error(`La fila ${index + 1} tiene unidades inválidas.`)
    }

    if (ventaTotal === null || !Number.isFinite(ventaTotal)) {
      throw new Error(`La fila ${index + 1} tiene venta total inválida.`)
    }

    const output: VentaImportRow = {
      rowNumber: Number.isFinite(candidate.rowNumber) ? Number(candidate.rowNumber) : index + 2,
      mes: '',
      marca: '',
      genero: '',
      linea: '',
      tipo_producto: '',
      referencia,
      unidades: Math.round(unidades),
      venta_total: ventaTotal,
    }

    for (const field of TEXT_FIELDS) {
      if (field === 'referencia') continue
      output[field] = toText(candidate[field]) as never
    }

    return output
  })
}
