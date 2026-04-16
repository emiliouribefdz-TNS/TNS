import * as XLSX from 'xlsx'

export type ReferenciaRecord = {
  id?: string
  created_at?: string
  empresa?: string
  reference_code: string
  nombre: string | null
  tipo_prenda: string | null
  color: string | null
  talla: string | null
  precio: number | null
  temporada: string | null
  notas: string | null
  image_url: string | null
}

export type ReferenciaImportRow = ReferenciaRecord & {
  rowNumber: number
}

export type ImportRowError = {
  rowNumber: number
  message: string
}

export type ImportConflict = {
  reference_code: string
  incoming: ReferenciaImportRow
  existing: ReferenciaRecord
}

export type ImportPreview = {
  fileName: string
  columnsDetected: string[]
  rows: ReferenciaImportRow[]
  errors: ImportRowError[]
  conflicts: ImportConflict[]
  summary: {
    totalRows: number
    validRows: number
    invalidRows: number
    newRows: number
    conflicts: number
  }
}

const FIELD_ALIASES: Record<string, keyof ReferenciaRecord> = {
  referencia: 'reference_code',
  referenciacodigo: 'reference_code',
  referenciacod: 'reference_code',
  referencecode: 'reference_code',
  reference: 'reference_code',
  sku: 'reference_code',
  codigo: 'reference_code',
  codigoreferencia: 'reference_code',
  codigoproducto: 'reference_code',
  productcode: 'reference_code',
  estilo: 'reference_code',
  nombre: 'nombre',
  producto: 'nombre',
  prenda: 'nombre',
  descripcion: 'nombre',
  descripcionproducto: 'nombre',
  itemname: 'nombre',
  tipo: 'tipo_prenda',
  tipoprenda: 'tipo_prenda',
  categoria: 'tipo_prenda',
  categoria_prenda: 'tipo_prenda',
  color: 'color',
  talla: 'talla',
  size: 'talla',
  precio: 'precio',
  precioventa: 'precio',
  valor: 'precio',
  price: 'precio',
  temporada: 'temporada',
  coleccion: 'temporada',
  season: 'temporada',
  notas: 'notas',
  observaciones: 'notas',
  comentarios: 'notas',
  notes: 'notas',
  imagen: 'image_url',
  image: 'image_url',
  imageurl: 'image_url',
  fotourl: 'image_url',
  urlimagen: 'image_url',
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
  if (value === null || value === undefined) {
    return null
  }

  const text = String(value).trim()
  return text ? text : null
}

function toNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return null
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

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

function getMappedValue(raw: Record<string, unknown>, field: keyof ReferenciaRecord) {
  for (const [header, value] of Object.entries(raw)) {
    const mapped = FIELD_ALIASES[normalizeHeader(header)]

    if (mapped === field) {
      return value
    }
  }

  return null
}

export function parseReferenceImportFile(fileName: string, buffer: Uint8Array): Omit<ImportPreview, 'conflicts' | 'summary'> & { totalRows: number } {
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
  const rows: ReferenciaImportRow[] = []
  const errors: ImportRowError[] = []
  const seenCodes = new Set<string>()

  rawRows.forEach((rawRow, index) => {
    const rowNumber = index + 2
    const referenceCode = toNullableString(getMappedValue(rawRow, 'reference_code'))?.toUpperCase()

    if (!referenceCode) {
      errors.push({
        rowNumber,
        message: 'Falta la columna obligatoria `reference_code` o la fila no tiene un código de referencia.',
      })
      return
    }

    if (seenCodes.has(referenceCode)) {
      errors.push({
        rowNumber,
        message: `La referencia ${referenceCode} está repetida dentro del mismo archivo.`,
      })
      return
    }

    seenCodes.add(referenceCode)

    const row: ReferenciaImportRow = {
      rowNumber,
      reference_code: referenceCode,
      nombre: toNullableString(getMappedValue(rawRow, 'nombre')),
      tipo_prenda: toNullableString(getMappedValue(rawRow, 'tipo_prenda')),
      color: toNullableString(getMappedValue(rawRow, 'color')),
      talla: toNullableString(getMappedValue(rawRow, 'talla')),
      precio: toNullableNumber(getMappedValue(rawRow, 'precio')),
      temporada: toNullableString(getMappedValue(rawRow, 'temporada')),
      notas: toNullableString(getMappedValue(rawRow, 'notas')),
      image_url: toNullableString(getMappedValue(rawRow, 'image_url')),
    }

    rows.push(row)
  })

  return {
    fileName,
    columnsDetected,
    rows,
    errors,
    totalRows: rawRows.length,
  }
}

export function createImportPreview(
  parsedFile: ReturnType<typeof parseReferenceImportFile>,
  existingRows: ReferenciaRecord[]
): ImportPreview {
  const existingMap = new Map(existingRows.map((row) => [row.reference_code.toUpperCase(), row]))
  const conflicts = parsedFile.rows
    .filter((row) => existingMap.has(row.reference_code))
    .map((row) => ({
      reference_code: row.reference_code,
      incoming: row,
      existing: existingMap.get(row.reference_code)!,
    }))

  return {
    fileName: parsedFile.fileName,
    columnsDetected: parsedFile.columnsDetected,
    rows: parsedFile.rows,
    errors: parsedFile.errors,
    conflicts,
    summary: {
      totalRows: parsedFile.totalRows,
      validRows: parsedFile.rows.length,
      invalidRows: parsedFile.errors.length,
      newRows: parsedFile.rows.length - conflicts.length,
      conflicts: conflicts.length,
    },
  }
}

export function sanitizeCommitRows(payload: unknown): ReferenciaImportRow[] {
  if (!Array.isArray(payload)) {
    throw new Error('No se recibieron filas válidas para guardar.')
  }

  return payload.map((row, index) => {
    if (!row || typeof row !== 'object') {
      throw new Error(`La fila ${index + 1} no tiene un formato válido.`)
    }

    const candidate = row as Partial<ReferenciaImportRow>
    const referenceCode = toNullableString(candidate.reference_code)?.toUpperCase()

    if (!referenceCode) {
      throw new Error(`La fila ${index + 1} no tiene reference_code.`)
    }

    return {
      rowNumber: Number.isFinite(candidate.rowNumber) ? Number(candidate.rowNumber) : index + 2,
      reference_code: referenceCode,
      nombre: toNullableString(candidate.nombre),
      tipo_prenda: toNullableString(candidate.tipo_prenda),
      color: toNullableString(candidate.color),
      talla: toNullableString(candidate.talla),
      precio: toNullableNumber(candidate.precio),
      temporada: toNullableString(candidate.temporada),
      notas: toNullableString(candidate.notas),
      image_url: toNullableString(candidate.image_url),
    }
  })
}
