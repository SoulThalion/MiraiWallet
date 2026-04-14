import { Op } from 'sequelize'
import { Transaction as LedgerTx, Account, Category, Subcategory } from '../models'
import { ApiError } from '../utils/ApiError'
import { parseIngMovimientosSheet, type IngParsedRow } from './ing-xlsx.parser'
import type { Transaction as SequelizeTrx } from 'sequelize'
import { ERROR_CODES } from '../errors/error-codes'

/** Ingreso vs cargo (gasto o traspaso legacy): mismo movimiento no debe duplicarse si cambió solo el enum. */
function fingerprintDirection(t: string): 'in' | 'out' {
  return t === 'income' ? 'in' : 'out'
}

/**
 * Clave estable para detectar el mismo movimiento ING ya importado:
 * cuenta + fecha + importe (2 dec.) + sentido + descripción normalizada.
 */
export function ingImportDuplicateKey(
  accountId: string,
  date: string,
  amount: number,
  type: 'income' | 'expense' | 'transfer',
  description: string
): string {
  const amt = Math.round(amount * 100) / 100
  const desc = description.replace(/\s+/g, ' ').trim().slice(0, 200)
  return `${accountId}|${date}|${amt}|${fingerprintDirection(type)}|${desc}`
}

/**
 * Export ING: fila 0 = movimiento más reciente, última fila = más antiguo.
 * Saldo inicial periodo = saldo antes del movimiento más antiguo.
 * Saldo final = saldo tras el movimiento más reciente (actual en cuenta).
 */
export function statementSnapshotFromIngRows(rows: IngParsedRow[]): {
  openingSaldo: number | null
  closingSaldo: number | null
  firstDate: string | null
  lastDate: string | null
} {
  if (rows.length === 0) {
    return { openingSaldo: null, closingSaldo: null, firstDate: null, lastDate: null }
  }
  const newest = rows[0]!
  const oldest = rows[rows.length - 1]!
  let openingSaldo: number | null = null
  if (oldest.balanceAfter != null && Number.isFinite(oldest.signedAmount)) {
    openingSaldo = Math.round((oldest.balanceAfter - oldest.signedAmount) * 100) / 100
  }
  const closingSaldo =
    newest.balanceAfter != null && Number.isFinite(newest.balanceAfter)
      ? Math.round(newest.balanceAfter * 100) / 100
      : null
  return {
    openingSaldo,
    closingSaldo,
    firstDate: oldest.date,
    lastDate: newest.date,
  }
}

export interface ImportIngMovementsResult {
  imported: number
  /** Filas del Excel que ya existían (misma cuenta, fecha, importe, sentido, concepto). */
  skippedDuplicates: number
  firstDateImported: string | null
  lastDateImported: string | null
  /** Saldo del último movimiento según columna «Saldo» del Excel (si existía). */
  balanceFromStatement: number | null
}

function hintToCategoryId(categories: Category[], hint: string): string | null {
  const flat = strip(hint)
  if (!flat) return null
  for (const c of categories) {
    const n = strip(c.name)
    if (!n) continue
    if (flat.includes(n) || n.includes(flat)) return c.id
  }
  const tokens = flat.split(/[\s|·,/]+/).filter(t => t.length > 3)
  for (const c of categories) {
    const n = strip(c.name)
    for (const t of tokens) {
      if (n.includes(t) || t.includes(n)) return c.id
    }
  }
  return null
}

function strip(s: string): string {
  return s.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function normName(s: string | null): string | null {
  if (!s) return null
  const t = s.replace(/\s+/g, ' ').trim().slice(0, 60)
  return t || null
}

function pickColor(seed: string): string {
  const palette = ['#1A8CFF', '#2EC776', '#F5C842', '#7F77DD', '#FF5A5A', '#00C8D4', '#E08D44', '#5B7C99']
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return palette[h % palette.length]!
}

/**
 * Regla simple: importe del extracto &gt; 0 → ingreso, &lt; 0 → gasto (incluye redondeos y traspasos a ahorro).
 */
export function inferIngTransactionType(_row: IngParsedRow, signedAmount: number): 'income' | 'expense' {
  return signedAmount > 0 ? 'income' : 'expense'
}

/**
 * Crea o reutiliza categoría (ING) y subcategoría según columnas del Excel.
 * Si no hay categoría ING, intenta casar `categoryHint` con categorías existentes.
 */
async function ensureIngClassification(
  trx: SequelizeTrx,
  userId: string,
  txType: 'income' | 'expense',
  row: IngParsedRow,
  categoryList: Category[]
): Promise<{ categoryId: string | null; subcategoryId: string | null }> {
  const p = normName(row.parentCategory)
  const s = normName(row.subCategory)

  let topName: string | null = null
  let childName: string | null = null
  if (p && s) {
    topName = p
    childName = s
  } else if (p) {
    topName = p
  } else if (s) {
    topName = s
  } else {
    const id = hintToCategoryId(categoryList, row.categoryHint)
    return { categoryId: id, subcategoryId: null }
  }

  const categoryKind: 'income' | 'expense' = txType === 'income' ? 'income' : 'expense'

  const [cat, createdCat] = await Category.findOrCreate({
    where: { userId, name: topName },
    defaults: {
      userId,
      name: topName,
      icon: '📂',
      color: pickColor(topName),
      monthlyBudget: 0,
      type: categoryKind,
      isDefault: false,
    },
    transaction: trx,
  })
  if (createdCat) categoryList.push(cat)

  if (!childName) {
    return { categoryId: cat.id, subcategoryId: null }
  }

  const [sub] = await Subcategory.findOrCreate({
    where: { userId, categoryId: cat.id, name: childName },
    defaults: {
      userId,
      categoryId: cat.id,
      name: childName,
      icon: '🏷️',
      color: cat.color,
    },
    transaction: trx,
  })
  return { categoryId: cat.id, subcategoryId: sub.id }
}

/**
 * Solo actualiza el saldo de la cuenta con el «Saldo» del último movimiento del Excel
 * (no crea transacciones). Útil si ya importaste los movimientos y solo quieres alinear con el banco.
 */
export async function syncBalanceFromIngXlsx(
  userId: string,
  accountId: string,
  buffer: Buffer
): Promise<{ balance: number }> {
  const parsed = parseIngMovimientosSheet(buffer)
  if (parsed.length === 0) throw ApiError.badRequest(ERROR_CODES.IMPORT_NO_VALID_ROWS, 'No hay movimientos válidos en el archivo.')

  const newest = parsed[0]!
  if (newest.balanceAfter == null || !Number.isFinite(newest.balanceAfter)) {
    throw ApiError.badRequest(
      ERROR_CODES.IMPORT_BALANCE_COLUMN_INVALID,
      'El Excel no tiene columna «Saldo» legible, o el primer movimiento no incluye saldo. Exporta de nuevo «Movimientos de la Cuenta» desde ING.'
    )
  }

  const finalBalance = Math.round(newest.balanceAfter * 100) / 100
  const snap = statementSnapshotFromIngRows(parsed)
  const account = await Account.findOne({
    where: { id: accountId, userId, isActive: true },
  })
  if (!account) throw ApiError.notFound(ERROR_CODES.ACCOUNT_NOT_FOUND, 'Cuenta')
  await account.update({
    balance: finalBalance,
    statementOpeningSaldo: snap.openingSaldo,
    statementClosingSaldo: snap.closingSaldo,
    statementPeriodFirstDate: snap.firstDate,
    statementPeriodLastDate: snap.lastDate,
  })
  return { balance: finalBalance }
}

/**
 * Importa movimientos desde un Excel export ING («Movimientos de la Cuenta»).
 * Signo del importe: positivo = ingreso, negativo = gasto.
 */
export async function importIngMovementsXlsx(
  userId: string,
  accountId: string,
  buffer: Buffer
): Promise<ImportIngMovementsResult> {
  const parsed = parseIngMovimientosSheet(buffer)
  /** Cronológico (antiguos primero) para insertar; el snapshot y saldo usan `parsed` en orden ING. */
  const rows = [...parsed].sort((a, b) => a.date.localeCompare(b.date))

  const categories = await Category.findAll({ where: { userId } })
  const sequelize = LedgerTx.sequelize!
  if (!sequelize) throw ApiError.internal(ERROR_CODES.DB_NOT_CONFIGURED, 'Base de datos no configurada')

  let imported = 0
  let skippedDuplicates = 0
  let firstDateImported: string | null = null
  let lastDateImported: string | null = null

  await sequelize.transaction(async (trx) => {
    const account = await Account.findOne({
      where: { id: accountId, userId, isActive: true },
      transaction: trx,
    })
    if (!account) throw ApiError.notFound(ERROR_CODES.ACCOUNT_NOT_FOUND, 'Cuenta')

    let balance = Number(account.balance)
    const categoryList = [...categories]

    const minDate = rows.reduce((m, r) => (r.date < m ? r.date : m), rows[0]!.date)
    const maxDate = rows.reduce((m, r) => (r.date > m ? r.date : m), rows[0]!.date)
    const existingTouched = await LedgerTx.findAll({
      where: { userId, accountId, date: { [Op.between]: [minDate, maxDate] } },
      attributes: ['date', 'amount', 'type', 'description'],
      transaction: trx,
    })
    const seenKeys = new Set<string>()
    for (const e of existingTouched) {
      const raw: unknown = e.getDataValue('date') ?? e.date
      const d =
        raw instanceof Date
          ? raw.toISOString().slice(0, 10)
          : String(raw).slice(0, 10)
      seenKeys.add(
        ingImportDuplicateKey(
          accountId,
          d,
          Number(e.amount),
          e.type as 'income' | 'expense' | 'transfer',
          e.description
        )
      )
    }

    for (const r of rows) {
      const type = inferIngTransactionType(r, r.signedAmount)
      const amount = Math.round(Math.abs(r.signedAmount) * 100) / 100
      const dupKey = ingImportDuplicateKey(accountId, r.date, amount, type, r.description)
      if (seenKeys.has(dupKey)) {
        skippedDuplicates++
        continue
      }

      const { categoryId, subcategoryId } = await ensureIngClassification(trx, userId, type, r, categoryList)

      await LedgerTx.create(
        {
          userId,
          accountId,
          categoryId,
          subcategoryId,
          description: r.description,
          amount,
          type,
          date: r.date,
          notes: r.notes,
          importSource: 'csv',
        },
        { transaction: trx }
      )

      seenKeys.add(dupKey)
      const delta = type === 'income' ? amount : -amount
      balance += delta
      imported++
      if (!firstDateImported) firstDateImported = r.date
      lastDateImported = r.date
    }

    const newest = parsed[0]
    const fromSheet = newest?.balanceAfter
    const finalBalance =
      fromSheet != null && Number.isFinite(fromSheet)
        ? Math.round(fromSheet * 100) / 100
        : Math.round(balance * 100) / 100

    const snap = statementSnapshotFromIngRows(parsed)
    await account.update(
      {
        balance: finalBalance,
        statementOpeningSaldo: snap.openingSaldo,
        statementClosingSaldo: snap.closingSaldo,
        statementPeriodFirstDate: snap.firstDate,
        statementPeriodLastDate: snap.lastDate,
      },
      { transaction: trx }
    )
  })

  const top = parsed[0]
  const balanceFromStatement =
    top?.balanceAfter != null && Number.isFinite(top.balanceAfter)
      ? Math.round(top.balanceAfter * 100) / 100
      : null

  return {
    imported,
    skippedDuplicates,
    firstDateImported,
    lastDateImported,
    balanceFromStatement,
  }
}
