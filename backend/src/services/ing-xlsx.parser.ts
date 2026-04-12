import * as XLSX from 'xlsx'
import { ApiError } from '../utils/ApiError'

export interface IngParsedRow {
  /** YYYY-MM-DD */
  date: string
  /** Negativo = cargo, positivo = abono (según ING) */
  signedAmount: number
  /** Columna «Saldo» del extracto (saldo tras el movimiento), si existe */
  balanceAfter: number | null
  description: string
  notes: string | null
  /** Columna «Categoría» ING (nivel superior), si existe */
  parentCategory: string | null
  /** Columna «Subcategoría» ING, si existe */
  subCategory: string | null
  /** Texto combinado para casar con categorías existentes si no hay columnas ING */
  categoryHint: string
}

function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function normCell(v: unknown): string {
  return stripDiacritics(String(v ?? '').trim().toLowerCase())
}

/**
 * Importes del Excel ING con `raw: false`: mezcla formatos.
 * - Europeo: -0,31 · 1.234,56 (coma decimal)
 * - US/Excel: 1,146.77 (coma miles, punto decimal) — el algoritmo antiguo lo leía como ~1,15
 */
export function parseEuropeanNumber(raw: string): number {
  const s0 = String(raw ?? '')
    .trim()
    .replace(/\s/g, '')
    .replace(/€/g, '')
    .replace(/\u2212/g, '-')
  if (!s0 || s0 === '-') return NaN

  const neg = s0.startsWith('-')
  const body = neg ? s0.slice(1) : s0
  if (!body) return NaN

  const lastComma = body.lastIndexOf(',')
  const lastDot = body.lastIndexOf('.')

  let t: string
  if (lastComma !== -1 && lastComma > lastDot) {
    /** Coma es el separador decimal (EU): puntos = miles */
    t = body.replace(/\./g, '').replace(',', '.')
  } else if (lastDot !== -1 && lastDot > lastComma) {
    /** Punto es el decimal (US): comas = miles */
    t = body.replace(/,/g, '')
  } else if (body.includes('.') && body.includes(',')) {
    t = body.replace(/\./g, '').replace(',', '.')
  } else {
    t = body.replace(',', '.')
  }

  const n = parseFloat(neg ? `-${t}` : t)
  return Number.isFinite(n) ? n : NaN
}

/** dd/mm/aaaa → YYYY-MM-DD */
export function parseSpanishDate(raw: string): string | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(raw ?? '').trim())
  if (!m) return null
  const d = m[1].padStart(2, '0')
  const mo = m[2].padStart(2, '0')
  const y = m[3]
  const iso = `${y}-${mo}-${d}`
  const dt = new Date(`${iso}T12:00:00Z`)
  if (Number.isNaN(dt.getTime())) return null
  return iso
}

type HeaderMap = {
  fValor: number
  importe: number
  descripcion: number
  /** Columna «Saldo» (no confundir con «Importe») */
  saldo?: number
  categoria?: number
  subcategoria?: number
  comentario?: number
}

/** Cabeceras ING: «SUB-CATEGORÍA», «SUB CATEGORÍA», «Subcategory»… no contienen el substring continuo «subcategoria». */
function isIngSubcategoryHeader(n: string): boolean {
  if (n.includes('subcategoria') || n.includes('subcategory')) return true
  return /sub[\s\u00a0\u202f_-]+categor/i.test(n)
}

function isIngMainCategoryHeader(n: string): boolean {
  if (isIngSubcategoryHeader(n)) return false
  if (n.includes('descripcion')) return false
  return n.includes('categoria') || /\bcategory\b/.test(n)
}

/**
 * Si ING (o el usuario) dejó padre e hijo en una sola celda: «Supermercados > Alimentación».
 */
export function splitCombinedIngCategoryPath(combined: string): { parent: string; child: string | null } {
  const t = combined.replace(/\s+/g, ' ').trim()
  if (!t) return { parent: '', child: null }
  const delims = [' > ', ' / ', ' | ', ' → ', ' -> ', '»', '›'] as const
  for (const d of delims) {
    const i = t.indexOf(d)
    if (i <= 0) continue
    const left = t.slice(0, i).trim()
    const right = t.slice(i + d.length).trim()
    if (left && right) return { parent: left, child: right }
  }
  return { parent: t, child: null }
}

/** Clasifica una celda de cabecera de export ING (tests y mapHeaders). */
export function classifyIngHeaderCell(raw: unknown): keyof HeaderMap | null {
  const n = normCell(raw)
  if (/^f\.?\s*valor/.test(n) || n === 'f valor' || n === 'fecha valor') return 'fValor'
  if (n.includes('importe') && !n.includes('saldo')) return 'importe'
  if (n.includes('saldo')) return 'saldo'
  if (n.includes('descripcion')) return 'descripcion'
  if (isIngSubcategoryHeader(n)) return 'subcategoria'
  if (isIngMainCategoryHeader(n)) return 'categoria'
  if (n.includes('comentario')) return 'comentario'
  return null
}

function mapHeaders(headerRow: unknown[]): HeaderMap | null {
  const idx: Partial<HeaderMap> = {}
  headerRow.forEach((cell, i) => {
    const kind = classifyIngHeaderCell(cell)
    if (kind === 'fValor') idx.fValor = i
    if (kind === 'importe') idx.importe = i
    if (kind === 'saldo') idx.saldo = i
    if (kind === 'descripcion') idx.descripcion = i
    if (kind === 'categoria') idx.categoria = i
    if (kind === 'subcategoria') idx.subcategoria = i
    if (kind === 'comentario') idx.comentario = i
  })
  if (idx.fValor === undefined || idx.importe === undefined || idx.descripcion === undefined) return null
  return idx as HeaderMap
}

function findHeaderRowIndex(rows: unknown[][]): number {
  for (let r = 0; r < Math.min(rows.length, 80); r++) {
    const row = rows[r] ?? []
    if (mapHeaders(row)) return r
  }
  return -1
}

/**
 * Lee la primera hoja de un Excel export ING ("Movimientos de la Cuenta").
 * Ignora filas de cabecera metadatos hasta la fila de títulos de columnas.
 */
export function parseIngMovimientosSheet(buffer: Buffer): IngParsedRow[] {
  let workbook: XLSX.WorkBook
  try {
    workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false })
  } catch {
    throw ApiError.badRequest('No se pudo leer el archivo Excel.')
  }
  const name = workbook.SheetNames[0]
  if (!name) throw ApiError.badRequest('El Excel no contiene hojas.')
  const sheet = workbook.Sheets[name]
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false }) as unknown[][]

  const headerIdx = findHeaderRowIndex(rows)
  if (headerIdx < 0) {
    throw ApiError.badRequest(
      'No se encontró la tabla de movimientos ING. Busca una fila con columnas «F. VALOR» e «IMPORTE».'
    )
  }
  const col = mapHeaders(rows[headerIdx] ?? [])
  if (!col) throw ApiError.badRequest('Cabeceras de columnas incompletas (F. VALOR, DESCRIPCIÓN, IMPORTE).')

  const out: IngParsedRow[] = []
  for (let r = headerIdx + 1; r < rows.length; r++) {
    const row = rows[r] ?? []
    const dateRaw = String(row[col.fValor] ?? '').trim()
    const importeRaw = String(row[col.importe] ?? '').trim()
    const desc = String(row[col.descripcion] ?? '').trim()
    if (!dateRaw && !importeRaw && !desc) continue

    const date = parseSpanishDate(dateRaw)
    const signedAmount = parseEuropeanNumber(importeRaw)
    if (!date || !Number.isFinite(signedAmount)) continue
    if (signedAmount === 0) continue

    let balanceAfter: number | null = null
    if (col.saldo !== undefined) {
      const saldoRaw = String(row[col.saldo] ?? '').trim()
      if (saldoRaw) {
        const sb = parseEuropeanNumber(saldoRaw)
        if (Number.isFinite(sb)) balanceAfter = sb
      }
    }

    const rawCat =
      col.categoria !== undefined ? String(row[col.categoria] ?? '').replace(/\s+/g, ' ').trim() : ''
    const rawSub =
      col.subcategoria !== undefined ? String(row[col.subcategoria] ?? '').replace(/\s+/g, ' ').trim() : ''

    let parentCategory: string | null = null
    let subCategory: string | null = null
    if (rawSub) {
      parentCategory = rawCat ? rawCat.slice(0, 60) : null
      subCategory = rawSub.slice(0, 60)
    } else if (rawCat) {
      const split = splitCombinedIngCategoryPath(rawCat)
      parentCategory = split.parent ? split.parent.slice(0, 60) : null
      subCategory = split.child ? split.child.slice(0, 60) : null
    }
    const catParts: string[] = []
    if (parentCategory) catParts.push(parentCategory)
    if (subCategory) catParts.push(subCategory)
    const com =
      col.comentario !== undefined ? String(row[col.comentario] ?? '').trim() : ''
    const notes = com || null

    let description = desc.slice(0, 200)
    if (!description) description = catParts.filter(Boolean).join(' · ').slice(0, 200) || 'Movimiento importado'

    out.push({
      date,
      signedAmount,
      balanceAfter,
      description,
      notes: notes ? notes.slice(0, 1000) : null,
      parentCategory,
      subCategory,
      categoryHint: catParts.filter(Boolean).join(' | '),
    })
  }

  if (out.length === 0) {
    throw ApiError.badRequest('No se encontraron filas de movimiento válidas en el archivo.')
  }

  /**
   * Orden del export ING: más reciente arriba. No reordenar: la columna «Saldo» solo encadena
   * en ese orden; si se ordenara por fecha, habría filas del mismo día con saldos incoherentes.
   */
  return out
}
