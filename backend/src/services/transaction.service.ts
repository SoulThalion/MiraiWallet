import { Op, type OrderItem }             from 'sequelize'
import { Transaction, Account, Category, Subcategory } from '../models'
import type { StatsYearAvgCategoryDto, StatsYearAvgSubcategoryDto } from '../types'
import { ApiError }                        from '../utils/ApiError'
import { ERROR_CODES }                     from '../errors/error-codes'
import {
  dateToFiscalYm,
  getMonthCycleConfigForUser,
  toDateOnlyString,
  ymToDateBounds,
  type MonthCycleConfig,
} from '../utils/monthPeriod'
import { parsePagination, buildPaginationMeta } from '../utils/pagination'
import {
  CreateTransactionDto, UpdateTransactionDto,
  TransactionQuery, PaginationMeta, TransactionListSortBy,
} from '../types'

const ACTIVE_TX_WHERE = { isExcluded: false } as const

function roundMoney2(n: number): number {
  return Math.round(n * 100) / 100
}

function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

export function normalizeRecurringDescriptionKey(raw: string): string {
  let s = stripDiacritics(raw.trim()).replace(/\s+/g, ' ').toLowerCase()
  s = s.replace(
    /^(pago en|pago a|pago por|compra en|compra a|compra con|cargo en|cargo de|transferencia a|bizum a|bizum de|recibo de|domiciliacion|domiciliación)\s+/i,
    '',
  )
  s = s.replace(/[^a-z0-9]+/g, ' ')
  return s.replace(/\s+/g, ' ').trim()
}

function dayOfMonthFromDateOnly(dateVal: unknown): number {
  const ymd = toDateOnlyString(dateVal)
  const br = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd)
  if (!br) return 0
  return parseInt(br[3]!, 10)
}

export function recurringPatternKeyFromTransaction(tx: Pick<Transaction, 'categoryId' | 'subcategoryId' | 'amount' | 'description' | 'date'>): string | null {
  const catId = tx.categoryId ?? 'none'
  const subId = tx.subcategoryId ?? 'none'
  const rawAmt = Number(tx.amount)
  if (!Number.isFinite(rawAmt)) return null
  const amt = roundMoney2(Math.abs(rawAmt))
  const day = dayOfMonthFromDateOnly(tx.date)
  if (day < 1 || day > 31) return null
  const desc = normalizeRecurringDescriptionKey(tx.description)
  if (!desc) return null
  return `${catId}\t${subId}\t${desc}\t${amt}\t${day}`
}

export interface PatternCategoryOverride {
  patternKey: string
  categoryId: string
  subcategoryId?: string | null
}

export function buildPatternCategoryOverrideMap(raw: unknown): Map<string, PatternCategoryOverride> {
  const out = new Map<string, PatternCategoryOverride>()
  if (!Array.isArray(raw)) return out
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const patternKey = String((row as { patternKey?: unknown }).patternKey ?? '').trim()
    const categoryId = String((row as { categoryId?: unknown }).categoryId ?? '').trim()
    const subRaw = (row as { subcategoryId?: unknown }).subcategoryId
    const subcategoryId = subRaw == null ? null : String(subRaw).trim()
    if (!patternKey || !categoryId) continue
    out.set(patternKey, { patternKey, categoryId, subcategoryId: subcategoryId || null })
  }
  return out
}

/** `required: false` → LEFT JOIN: no se pierden movimientos sin categoría o con FK huérfana (el total de gastos debe cuadrar con la suma por categorías). */
const WITH_RELATIONS = [
  { model: Account,     as: 'account',     attributes: ['id', 'name', 'color'], required: false },
  { model: Category,    as: 'category',    attributes: ['id', 'name', 'icon', 'color'], required: false },
  { model: Subcategory, as: 'subcategory', attributes: ['id', 'name', 'icon', 'color'], required: false },
]

function parseOptAmount(s: string | undefined): number | undefined {
  if (s === undefined || s === '') return undefined
  const n = parseFloat(String(s))
  return Number.isFinite(n) ? n : undefined
}

function listSortDir(query: TransactionQuery, sortBy: TransactionListSortBy): 'ASC' | 'DESC' {
  const o = String(query.sortOrder ?? '').toLowerCase()
  if (o === 'asc') return 'ASC'
  if (o === 'desc') return 'DESC'
  if (sortBy === 'description' || sortBy === 'category' || sortBy === 'type' || sortBy === 'importSource') {
    return 'ASC'
  }
  return 'DESC'
}

function listOrder(query: TransactionQuery): OrderItem[] {
  const raw = (query.sortBy ?? 'date') as TransactionListSortBy
  const sortBy: TransactionListSortBy =
    ['date', 'amount', 'description', 'type', 'importSource', 'category'].includes(raw) ? raw : 'date'
  const dir = listSortDir(query, sortBy)
  const tie: OrderItem[] = [['createdAt', 'DESC']]

  if (sortBy === 'category') {
    return [[{ model: Category, as: 'category' }, 'name', dir], ['date', 'DESC'], ...tie]
  }
  const col =
    sortBy === 'amount' ? 'amount'
      : sortBy === 'description' ? 'description'
        : sortBy === 'type' ? 'type'
          : sortBy === 'importSource' ? 'importSource'
            : 'date'
  return [[col, dir], ...tie]
}

export async function list(
  userId: string, query: TransactionQuery
): Promise<{ rows: Transaction[]; meta: PaginationMeta }> {
  const { page, limit, offset } = parsePagination(query)
  const where: Record<string, unknown> = { userId }

  if (query.type)        where.type         = query.type
  if (query.accountId)   where.accountId    = query.accountId
  if (query.categoryId)  where.categoryId   = query.categoryId
  if (query.importSource) where.importSource = query.importSource
  if (query.isExcluded === 'true') where.isExcluded = true
  if (query.isExcluded === 'false') where.isExcluded = false

  if (query.description?.trim()) {
    const raw = query.description.trim().replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
    where.description = { [Op.like]: `%${raw}%` }
  }

  const minA = parseOptAmount(query.minAmount)
  const maxA = parseOptAmount(query.maxAmount)
  if (minA !== undefined || maxA !== undefined) {
    const r: Record<symbol, number> = {}
    if (minA !== undefined) r[Op.gte] = minA
    if (maxA !== undefined) r[Op.lte] = maxA
    where.amount = r
  }

  if (query.from || query.to) {
    where.date = {}
    if (query.from) (where.date as Record<string, unknown>)[Op.gte as unknown as string] = query.from
    if (query.to)   (where.date as Record<string, unknown>)[Op.lte as unknown as string] = query.to
  }

  const sortBy = (query.sortBy ?? 'date') as TransactionListSortBy
  const orderByCategory = sortBy === 'category'

  const { count, rows } = await Transaction.findAndCountAll({
    where,
    limit,
    offset,
    order:   listOrder(query),
    include: WITH_RELATIONS,
    distinct: true,
    col:      'id',
    ...(orderByCategory ? { subQuery: false } : {}),
  })

  return { rows, meta: buildPaginationMeta(page, limit, count) }
}

export async function findById(id: string, userId: string): Promise<Transaction> {
  const tx = await Transaction.findOne({ where: { id, userId }, include: WITH_RELATIONS })
  if (!tx) throw ApiError.notFound(ERROR_CODES.TRANSACTION_NOT_FOUND, 'Transacción')
  return tx
}

export async function setExcluded(id: string, userId: string, isExcluded: boolean): Promise<Transaction> {
  const tx = await findById(id, userId)
  await tx.update({ isExcluded })
  return findById(id, userId)
}

export async function create(userId: string, data: CreateTransactionDto): Promise<Transaction> {
  const account = await Account.findOne({ where: { id: data.accountId, userId, isActive: true } })
  if (!account) throw ApiError.notFound(ERROR_CODES.ACCOUNT_NOT_FOUND, 'Cuenta')

  const tx    = await Transaction.create({ ...data, userId })
  const delta = data.type === 'income' ? data.amount : -data.amount
  await account.update({ balance: account.balance + delta })

  return findById(tx.id, userId)
}

export async function update(id: string, userId: string, data: UpdateTransactionDto): Promise<Transaction> {
  const tx = await findById(id, userId)

  if (tx.importSource !== 'manual') {
    throw ApiError.forbidden(ERROR_CODES.TX_EDIT_ONLY_MANUAL, 'Solo se pueden editar movimientos creados manualmente')
  }

  const nextType       = data.type ?? tx.type
  const nextCategoryId = data.categoryId !== undefined ? data.categoryId : tx.categoryId
  if (nextType === 'expense' && !nextCategoryId) {
    throw ApiError.badRequest(ERROR_CODES.TX_CATEGORY_REQUIRED_FOR_EXPENSE, 'La categoría es obligatoria para un gasto')
  }

  if (data.amount !== undefined || data.type !== undefined) {
    const account   = await Account.findByPk(tx.accountId)
    if (!account) throw ApiError.notFound(ERROR_CODES.ACCOUNT_NOT_FOUND, 'Cuenta')
    const oldDelta  = tx.type === 'income' ? tx.amount : -tx.amount
    const newAmount = data.amount ?? tx.amount
    const newType   = data.type   ?? tx.type
    const newDelta  = newType === 'income' ? newAmount : -newAmount
    await account.update({ balance: account.balance - oldDelta + newDelta })
  }

  await tx.update(data)
  return findById(id, userId)
}

export async function remove(id: string, userId: string): Promise<void> {
  const tx      = await findById(id, userId)
  const account = await Account.findByPk(tx.accountId)
  if (!account) throw ApiError.notFound(ERROR_CODES.ACCOUNT_NOT_FOUND, 'Cuenta')
  const delta = tx.type === 'income' ? -tx.amount : tx.amount
  await account.update({ balance: account.balance + delta })
  await tx.destroy()
}

/** Mes 0–11 desde DATEONLY (misma lógica histórica cuando el ciclo es mes calendario). */
function monthIndexFromDateOnly(dateVal: unknown): number {
  const day = toDateOnlyString(dateVal)
  const br = day ? /^(\d{4})-(\d{2})-\d{2}$/.exec(day) : null
  if (br) return parseInt(br[2]!, 10) - 1
  const d = new Date(String(dateVal ?? ''))
  return Number.isNaN(d.getTime()) ? -1 : d.getMonth()
}

export async function monthlySummary(userId: string, year: number) {
  const cfg = await getMonthCycleConfigForUser(userId)

  const months = Array.from({ length: 12 }, (_, i) => ({
    month:    String(i + 1).padStart(2, '0'),
    income:   0,
    expenses: 0,
  }))

  if (cfg.mode === 'calendar') {
    const txs = await Transaction.findAll({
      where: { userId, ...ACTIVE_TX_WHERE, date: { [Op.between]: [`${year}-01-01`, `${year}-12-31`] } },
      attributes: ['type', 'amount', 'date'],
    })
    for (const tx of txs) {
      const m = monthIndexFromDateOnly(tx.date)
      if (m < 0 || m > 11) continue
      const amt = Number(tx.amount)
      if (!Number.isFinite(amt)) continue
      if (tx.type === 'income') months[m]!.income += amt
      else months[m]!.expenses += amt
    }
  } else {
    const fromY = ymToDateBounds(`${year}-01`, cfg).from
    const toY = ymToDateBounds(`${year}-12`, cfg).to
    const txs = await Transaction.findAll({
      where: { userId, ...ACTIVE_TX_WHERE, date: { [Op.between]: [fromY, toY] } },
      attributes: ['type', 'amount', 'date'],
    })
    for (const tx of txs) {
      const ym = dateToFiscalYm(tx.date, cfg)
      if (!ym || !ym.startsWith(`${year}-`)) continue
      const mm = parseInt(ym.split('-')[1]!, 10)
      const mi = mm - 1
      if (mi < 0 || mi > 11) continue
      const amt = Number(tx.amount)
      if (!Number.isFinite(amt)) continue
      if (tx.type === 'income') months[mi]!.income += amt
      else months[mi]!.expenses += amt
    }
  }

  return months.map(mo => {
    const income = Math.round(mo.income * 100) / 100
    const expenses = Math.round(mo.expenses * 100) / 100
    const transfers = 0
    const net = Math.round((income - expenses) * 100) / 100
    return { month: mo.month, income, expenses, transfers, net }
  })
}

export type CategoryBreakdownRow = {
  categoryId: string | null
  name: string
  icon: string
  color: string
  total: number
}

export type SubcategoryBreakdownRow = {
  categoryId: string | null
  subcategoryId: string | null
  name: string
  icon: string
  color: string
  total: number
}

function aggregateAmountByCategory(txs: Transaction[]): CategoryBreakdownRow[] {
  const map: Record<string, CategoryBreakdownRow> = {}
  for (const tx of txs) {
    const key = tx.categoryId ?? 'uncategorized'
    if (!map[key]) {
      map[key] = {
        categoryId: tx.categoryId ?? null,
        name:       tx.category?.name  ?? 'Sin categoría',
        icon:       tx.category?.icon  ?? '💸',
        color:      tx.category?.color ?? '#888',
        total:      0,
      }
    }
    const amt = Number(tx.amount)
    map[key].total = roundMoney2(map[key].total + (Number.isFinite(amt) ? amt : 0))
  }
  return Object.values(map)
    .map((e) => ({ ...e, total: roundMoney2(e.total) }))
    .sort((a, b) => b.total - a.total)
}

function aggregateExpenseByCategory(txs: Transaction[]): CategoryBreakdownRow[] {
  return aggregateAmountByCategory(txs)
}

function aggregateAmountBySubcategory(txs: Transaction[]): SubcategoryBreakdownRow[] {
  const map: Record<string, SubcategoryBreakdownRow> = {}
  for (const tx of txs) {
    const key = tx.subcategoryId ?? 'none'
    if (!map[key]) {
      map[key] = {
        categoryId: tx.categoryId ?? null,
        subcategoryId: tx.subcategoryId ?? null,
        name: tx.subcategory?.name ?? 'Sin subcategoría',
        icon: tx.subcategory?.icon ?? tx.category?.icon ?? '🏷️',
        color: tx.subcategory?.color ?? tx.category?.color ?? '#888',
        total: 0,
      }
    }
    const amt = Number(tx.amount)
    map[key].total = roundMoney2(map[key].total + (Number.isFinite(amt) ? amt : 0))
  }
  return Object.values(map)
    .map((e) => ({ ...e, total: roundMoney2(e.total) }))
    .sort((a, b) => b.total - a.total)
}

export async function categoryBreakdown(
  userId: string,
  month: string,
  opts?: { patternCategoryOverrides?: Array<PatternCategoryOverride> | Map<string, PatternCategoryOverride> }
) {
  const cfg = await getMonthCycleConfigForUser(userId)
  const { from, to } = ymToDateBounds(month, cfg)

  const txs = await Transaction.findAll({
    where:   { userId, ...ACTIVE_TX_WHERE, type: 'expense', date: { [Op.between]: [from, to] } },
    include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'icon', 'color'], required: false }],
  })
  const overrideMap = opts?.patternCategoryOverrides instanceof Map
    ? opts.patternCategoryOverrides
    : new Map((opts?.patternCategoryOverrides ?? []).map((r) => [r.patternKey, r]))
  const overrideCategoryIds = [...new Set([...overrideMap.values()].map(v => v.categoryId).filter(Boolean))]
  const overrideCategories = overrideCategoryIds.length
    ? await Category.findAll({ where: { userId, id: { [Op.in]: overrideCategoryIds } }, attributes: ['id', 'name', 'icon', 'color'] })
    : []
  const overrideCategoryById = new Map(overrideCategories.map(c => [c.id, c]))
  const map: Record<string, CategoryBreakdownRow> = {}
  for (const tx of txs) {
    const pKey = recurringPatternKeyFromTransaction(tx)
    const override = pKey ? overrideMap.get(pKey) : undefined
    const cat = override?.categoryId ? overrideCategoryById.get(override.categoryId) : null
    const key = cat?.id ?? override?.categoryId ?? tx.categoryId ?? 'uncategorized'
    if (!map[key]) {
      map[key] = {
        categoryId: key === 'uncategorized' ? null : key,
        name: cat?.name ?? tx.category?.name ?? 'Sin categoría',
        icon: cat?.icon ?? tx.category?.icon ?? '💸',
        color: cat?.color ?? tx.category?.color ?? '#888',
        total: 0,
      }
    }
    map[key].total = roundMoney2(map[key].total + (Number.isFinite(Number(tx.amount)) ? Number(tx.amount) : 0))
  }
  return Object.values(map)
    .map((e) => ({ ...e, total: roundMoney2(e.total) }))
    .sort((a, b) => b.total - a.total)
}

/** Ingresos del mes `YYYY-MM` agrupados por categoría (misma ventana que `categoryBreakdown`). */
export async function categoryIncomeBreakdownMonth(
  userId: string,
  month: string,
  opts?: { patternCategoryOverrides?: Array<PatternCategoryOverride> | Map<string, PatternCategoryOverride> }
) {
  const cfg = await getMonthCycleConfigForUser(userId)
  const { from, to } = ymToDateBounds(month, cfg)

  const txs = await Transaction.findAll({
    where:   { userId, ...ACTIVE_TX_WHERE, type: 'income', date: { [Op.between]: [from, to] } },
    include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'icon', 'color'], required: false }],
  })

  const overrideMap = opts?.patternCategoryOverrides instanceof Map
    ? opts.patternCategoryOverrides
    : new Map((opts?.patternCategoryOverrides ?? []).map((r) => [r.patternKey, r]))
  const overrideCategoryIds = [...new Set([...overrideMap.values()].map(v => v.categoryId).filter(Boolean))]
  const overrideCategories = overrideCategoryIds.length
    ? await Category.findAll({ where: { userId, id: { [Op.in]: overrideCategoryIds } }, attributes: ['id', 'name', 'icon', 'color'] })
    : []
  const overrideCategoryById = new Map(overrideCategories.map(c => [c.id, c]))
  const map: Record<string, CategoryBreakdownRow> = {}
  for (const tx of txs) {
    const pKey = recurringPatternKeyFromTransaction(tx)
    const override = pKey ? overrideMap.get(pKey) : undefined
    const cat = override?.categoryId ? overrideCategoryById.get(override.categoryId) : null
    const key = cat?.id ?? override?.categoryId ?? tx.categoryId ?? 'uncategorized'
    if (!map[key]) {
      map[key] = {
        categoryId: key === 'uncategorized' ? null : key,
        name: cat?.name ?? tx.category?.name ?? 'Sin categoría',
        icon: cat?.icon ?? tx.category?.icon ?? '💸',
        color: cat?.color ?? tx.category?.color ?? '#888',
        total: 0,
      }
    }
    map[key].total = roundMoney2(map[key].total + (Number.isFinite(Number(tx.amount)) ? Number(tx.amount) : 0))
  }
  return Object.values(map)
    .map((e) => ({ ...e, total: roundMoney2(e.total) }))
    .sort((a, b) => b.total - a.total)
}

export async function subcategoryBreakdownMonth(
  userId: string,
  month: string,
  kind: 'expense' | 'income',
  opts?: { patternCategoryOverrides?: Array<PatternCategoryOverride> | Map<string, PatternCategoryOverride> }
) {
  const cfg = await getMonthCycleConfigForUser(userId)
  const { from, to } = ymToDateBounds(month, cfg)
  const txs = await Transaction.findAll({
    where: { userId, ...ACTIVE_TX_WHERE, type: kind, date: { [Op.between]: [from, to] } },
    include: [
      { model: Category, as: 'category', attributes: ['id', 'name', 'icon', 'color'], required: false },
      { model: Subcategory, as: 'subcategory', attributes: ['id', 'name', 'icon', 'color', 'categoryId'], required: false },
    ],
  })
  const overrideMap = opts?.patternCategoryOverrides instanceof Map
    ? opts.patternCategoryOverrides
    : new Map((opts?.patternCategoryOverrides ?? []).map((r) => [r.patternKey, r]))
  const overrideCategoryIds = [...new Set([...overrideMap.values()].map(v => v.categoryId).filter(Boolean))]
  const overrideSubcategoryIds = [...new Set([...overrideMap.values()].map(v => v.subcategoryId).filter((x): x is string => !!x))]
  const [overrideCategories, overrideSubcategories] = await Promise.all([
    overrideCategoryIds.length
      ? Category.findAll({ where: { userId, id: { [Op.in]: overrideCategoryIds } }, attributes: ['id', 'name', 'icon', 'color'] })
      : Promise.resolve([]),
    overrideSubcategoryIds.length
      ? Subcategory.findAll({ where: { userId, id: { [Op.in]: overrideSubcategoryIds } }, attributes: ['id', 'name', 'icon', 'color', 'categoryId'] })
      : Promise.resolve([]),
  ])
  const overrideCategoryById = new Map(overrideCategories.map(c => [c.id, c]))
  const overrideSubById = new Map(overrideSubcategories.map(s => [s.id, s]))
  const normalized = txs.map((tx) => {
    const pKey = recurringPatternKeyFromTransaction(tx)
    const override = pKey ? overrideMap.get(pKey) : undefined
    if (!override) return tx
    const cat = override.categoryId ? overrideCategoryById.get(override.categoryId) : undefined
    const sub = override.subcategoryId ? overrideSubById.get(override.subcategoryId) : undefined
    return {
      ...tx,
      categoryId: (sub?.categoryId ?? cat?.id ?? override.categoryId) as string | null,
      subcategoryId: (sub?.id ?? (override.subcategoryId ?? null)) as string | null,
      category: (cat ?? tx.category) as Transaction['category'],
      subcategory: (sub ?? tx.subcategory) as Transaction['subcategory'],
    } as Transaction
  })
  return aggregateAmountBySubcategory(normalized)
}

/** Gastos acumulados por categoría (sin filtro de fechas). */
export async function categoryBreakdownAllTime(userId: string) {
  const txs = await Transaction.findAll({
    where:   { userId, ...ACTIVE_TX_WHERE, type: 'expense' },
    include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'icon', 'color'], required: false }],
  })
  return aggregateExpenseByCategory(txs)
}

/** Ingresos acumulados por categoría (sin filtro de fechas). */
export async function categoryIncomeBreakdownAllTime(userId: string) {
  const txs = await Transaction.findAll({
    where:   { userId, ...ACTIVE_TX_WHERE, type: 'income' },
    include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'icon', 'color'], required: false }],
  })
  return aggregateAmountByCategory(txs)
}

type CatAgg = { total: number; name: string; icon: string; color: string }
type SubAgg = {
  total: number
  categoryId: string
  subcategoryId: string | null
  categoryName: string
  name: string
  icon: string
  color: string
}

function mapToYearAvgCategories(m: Map<string, CatAgg>, monthsDivisor: number): StatsYearAvgCategoryDto[] {
  const d = Math.max(1, monthsDivisor)
  return [...m.entries()]
    .map(([categoryId, v]) => ({
      categoryId,
      name: v.name,
      icon: v.icon,
      color: v.color,
      totalYear: roundMoney2(v.total),
      avgPerMonth: roundMoney2(v.total / d),
    }))
    .filter(r => r.totalYear > 0)
    .sort((a, b) => b.totalYear - a.totalYear || a.name.localeCompare(b.name))
}

function mapToYearAvgSubcategories(m: Map<string, SubAgg>, monthsDivisor: number): StatsYearAvgSubcategoryDto[] {
  const d = Math.max(1, monthsDivisor)
  return [...m.values()]
    .map(v => ({
      categoryId: v.categoryId,
      subcategoryId: v.subcategoryId,
      categoryName: v.categoryName,
      name: v.name,
      icon: v.icon,
      color: v.color,
      totalYear: roundMoney2(v.total),
      avgPerMonth: roundMoney2(v.total / d),
    }))
    .filter(r => r.totalYear > 0)
    .sort((a, b) => b.totalYear - a.totalYear || a.categoryName.localeCompare(b.categoryName) || a.name.localeCompare(b.name))
}

/**
 * Ventana móvil: últimos N meses fiscales con al menos un movimiento del tipo indicado,
 * hasta `anchorYm` inclusive (puede cruzar años).
 */
function lastNActiveFiscalMonths(
  txs: Transaction[],
  anchorYm: string,
  n: number,
  cfg: MonthCycleConfig,
  kind: 'expense' | 'income',
  savingsPatterns?: Set<string>,
  savingsCategories?: Set<string>,
  savingsSubcategories?: Set<string>,
): string[] {
  const active = new Set<string>()
  for (const tx of txs) {
    if (kind === 'expense') {
      const isSavingsTransfer = tx.type === 'transfer'
        && (!!savingsPatterns?.size || !!savingsCategories?.size || !!savingsSubcategories?.size)
        && (() => {
          if (tx.subcategoryId && savingsSubcategories?.has(tx.subcategoryId)) return true
          if (tx.categoryId && savingsCategories?.has(tx.categoryId)) return true
          const key = recurringPatternKeyFromTransaction(tx)
          return !!key && (savingsPatterns?.has(key) ?? false)
        })()
      if (tx.type !== 'expense' && !isSavingsTransfer) continue
    } else if (tx.type !== kind) {
      continue
    }
    const ym = dateToFiscalYm(tx.date, cfg)
    if (!ym || ym > anchorYm) continue
    active.add(ym)
  }
  return [...active].sort((a, b) => b.localeCompare(a)).slice(0, Math.max(1, n))
}

/**
 * Ventana móvil de medias/categorías: últimos 12 meses fiscales con datos por tipo (gasto/ingreso),
 * hasta `anchorYm` inclusive (puede mezclar dos años).
 */
export async function rolling12ByCategoryAndSubcategory(
  userId: string,
  anchorYm: string,
  opts?: {
    includeTransferPatternKeys?: string[] | Set<string>
    includeTransferCategoryIds?: string[] | Set<string>
    includeTransferSubcategoryIds?: string[] | Set<string>
    patternCategoryOverrides?: Array<PatternCategoryOverride> | Map<string, PatternCategoryOverride>
  }
): Promise<{
  expenseCategories: StatsYearAvgCategoryDto[]
  expenseSubcategories: StatsYearAvgSubcategoryDto[]
  incomeCategories: StatsYearAvgCategoryDto[]
  incomeSubcategories: StatsYearAvgSubcategoryDto[]
  /** Meses con gasto usados en la ventana móvil (1..12). */
  expenseMonthsDivisor: number
  /** Meses con ingreso usados en la ventana móvil (1..12). */
  incomeMonthsDivisor: number
  /** Total gastos en esos meses de gasto (denominador de `expenseMonthsDivisor`). */
  expenseTotalWindow: number
  /** Total ingresos en esos meses de ingreso (denominador de `incomeMonthsDivisor`). */
  incomeTotalWindow: number
}> {
  const cfg = await getMonthCycleConfigForUser(userId)
  const anchor = /^\d{4}-(0[1-9]|1[0-2])$/.test(anchorYm) ? anchorYm : dateToFiscalYm(toDateOnlyString(new Date()), cfg)!
  const nowYmd = toDateOnlyString(new Date())
  const currentFiscalYm = dateToFiscalYm(nowYmd, cfg)
  const { to: toAnchor } = ymToDateBounds(anchor, cfg)
  /** Margen amplio para poder reunir 12 meses con datos aunque haya huecos. */
  const fromProbe = ymToDateBounds(`${String(parseInt(anchor.slice(0, 4), 10) - 4)}-01`, cfg).from

  const savingsPatterns = new Set(
    Array.isArray(opts?.includeTransferPatternKeys)
      ? opts?.includeTransferPatternKeys
      : (opts?.includeTransferPatternKeys instanceof Set ? [...opts.includeTransferPatternKeys] : [])
  )
  const savingsCategories = new Set(
    Array.isArray(opts?.includeTransferCategoryIds)
      ? opts?.includeTransferCategoryIds
      : (opts?.includeTransferCategoryIds instanceof Set ? [...opts.includeTransferCategoryIds] : [])
  )
  const savingsSubcategories = new Set(
    Array.isArray(opts?.includeTransferSubcategoryIds)
      ? opts?.includeTransferSubcategoryIds
      : (opts?.includeTransferSubcategoryIds instanceof Set ? [...opts.includeTransferSubcategoryIds] : [])
  )
  const hasTransferSavingsRules = savingsPatterns.size > 0 || savingsCategories.size > 0 || savingsSubcategories.size > 0
  const patternOverrides = opts?.patternCategoryOverrides instanceof Map
    ? opts.patternCategoryOverrides
    : new Map((opts?.patternCategoryOverrides ?? []).map((r) => [r.patternKey, r]))

  const overrideCategoryIds = [...new Set([...patternOverrides.values()].map(v => v.categoryId).filter(Boolean))]
  const overrideSubcategoryIds = [...new Set([...patternOverrides.values()].map(v => v.subcategoryId).filter((x): x is string => !!x))]
  const [overrideCategories, overrideSubcategories] = await Promise.all([
    overrideCategoryIds.length
      ? Category.findAll({ where: { userId, id: { [Op.in]: overrideCategoryIds } }, attributes: ['id', 'name', 'icon', 'color'] })
      : Promise.resolve([]),
    overrideSubcategoryIds.length
      ? Subcategory.findAll({ where: { userId, id: { [Op.in]: overrideSubcategoryIds } }, attributes: ['id', 'name', 'icon', 'color', 'categoryId'] })
      : Promise.resolve([]),
  ])
  const overrideCategoryById = new Map(overrideCategories.map(c => [c.id, c]))
  const overrideSubById = new Map(overrideSubcategories.map(s => [s.id, s]))

  const typeFilter: Array<'expense' | 'income' | 'transfer'> =
    hasTransferSavingsRules ? ['expense', 'income', 'transfer'] : ['expense', 'income']

  const txs = await Transaction.findAll({
    where: {
      userId,
      ...ACTIVE_TX_WHERE,
      type: { [Op.in]: typeFilter },
      date: { [Op.between]: [fromProbe, toAnchor] },
    },
    include: [
      { model: Category, as: 'category', attributes: ['id', 'name', 'icon', 'color'], required: false },
      { model: Subcategory, as: 'subcategory', attributes: ['id', 'name', 'icon', 'color'], required: false },
    ],
  })
  const expenseMonths = new Set(
    lastNActiveFiscalMonths(txs, anchor, 12, cfg, 'expense', savingsPatterns, savingsCategories, savingsSubcategories)
  )
  const incomeMonths = new Set(lastNActiveFiscalMonths(txs, anchor, 12, cfg, 'income'))

  /** Misma regla que para KPI de gastos: nunca contar el periodo fiscal en curso. */
  if (currentFiscalYm) {
    expenseMonths.delete(currentFiscalYm)
    incomeMonths.delete(currentFiscalYm)
  }

  /** Descarta el mes más antiguo si es parcial de arranque para el tipo (primer movimiento después del inicio del periodo). */
  const trimPartialStartMonth = (months: Set<string>, kind: 'expense' | 'income') => {
    if (months.size === 0) return
    const oldestYm = [...months].sort((a, b) => a.localeCompare(b))[0]
    if (!oldestYm) return
    let firstDate = ''
    for (const tx of txs) {
      if (kind === 'expense') {
        const isSavingsTransfer = tx.type === 'transfer'
          && hasTransferSavingsRules
          && (() => {
            if (tx.subcategoryId && savingsSubcategories.has(tx.subcategoryId)) return true
            if (tx.categoryId && savingsCategories.has(tx.categoryId)) return true
            const key = recurringPatternKeyFromTransaction(tx)
            return !!key && savingsPatterns.has(key)
          })()
        if (tx.type !== 'expense' && !isSavingsTransfer) continue
      } else if (tx.type !== kind) {
        continue
      }
      const ymd = toDateOnlyString(tx.date)
      if (!ymd) continue
      if (!firstDate || ymd < firstDate) firstDate = ymd
    }
    if (!firstDate) return
    const firstYm = dateToFiscalYm(firstDate, cfg)
    if (!firstYm || firstYm !== oldestYm) return
    try {
      const { from } = ymToDateBounds(oldestYm, cfg)
      if (firstDate > from) months.delete(oldestYm)
    } catch {
      // Si falla el parseo del periodo, mantenemos la selección original.
    }
  }
  trimPartialStartMonth(expenseMonths, 'expense')
  trimPartialStartMonth(incomeMonths, 'income')

  const expCat = new Map<string, CatAgg>()
  const expSub = new Map<string, SubAgg>()
  const incCat = new Map<string, CatAgg>()
  const incSub = new Map<string, SubAgg>()
  let expenseTotalWindow = 0
  let incomeTotalWindow = 0

  const subKey = (cid: string, sid: string | null) => `${cid}\t${sid ?? ''}`

  for (const tx of txs) {
    const ym = dateToFiscalYm(tx.date, cfg)
    if (!ym || ym > anchor) continue
    const amt = Number(tx.amount)
    if (!Number.isFinite(amt)) continue

    const isSavingsTransfer = tx.type === 'transfer' && hasTransferSavingsRules
      && (() => {
        if (tx.subcategoryId && savingsSubcategories.has(tx.subcategoryId)) return true
        if (tx.categoryId && savingsCategories.has(tx.categoryId)) return true
        const key = recurringPatternKeyFromTransaction(tx)
        return !!key && savingsPatterns.has(key)
      })()

    const pKey = recurringPatternKeyFromTransaction(tx)
    const override = pKey ? patternOverrides.get(pKey) : undefined
    let catId = tx.categoryId ?? 'uncategorized'
    let cname = tx.category?.name ?? 'Sin categoría'
    let cicon = tx.category?.icon ?? '💸'
    let ccolor = tx.category?.color ?? '#888'
    let effectiveSubId = tx.subcategoryId ?? null
    if (override) {
      const cat = overrideCategoryById.get(override.categoryId)
      if (cat) {
        catId = cat.id
        cname = cat.name
        cicon = cat.icon
        ccolor = cat.color
      } else {
        catId = override.categoryId
      }
      if (override.subcategoryId) {
        const sub = overrideSubById.get(override.subcategoryId)
        if (sub) {
          effectiveSubId = sub.id
          const cat = overrideCategoryById.get(sub.categoryId)
          if (cat) {
            catId = cat.id
            cname = cat.name
            cicon = cat.icon
            ccolor = cat.color
          }
        } else {
          effectiveSubId = override.subcategoryId
        }
      } else {
        effectiveSubId = null
      }
    }

    if ((tx.type === 'expense' || isSavingsTransfer) && expenseMonths.has(ym)) {
      expenseTotalWindow = roundMoney2(expenseTotalWindow + amt)
      const ec = expCat.get(catId) ?? { total: 0, name: cname, icon: cicon, color: ccolor }
      ec.total = roundMoney2(ec.total + amt)
      expCat.set(catId, ec)

      const sid = effectiveSubId
      const sk = subKey(catId, sid)
      const sname = sid ? (tx.subcategory?.name ?? 'Subcategoría') : 'Sin subcategoría'
      const sicon = sid ? (tx.subcategory?.icon ?? cicon) : cicon
      const scolor = sid ? (tx.subcategory?.color ?? ccolor) : ccolor
      const es = expSub.get(sk) ?? {
        total: 0,
        categoryId: catId,
        subcategoryId: sid,
        categoryName: cname,
        name: sname,
        icon: sicon,
        color: scolor,
      }
      es.total = roundMoney2(es.total + amt)
      expSub.set(sk, es)
    } else if (tx.type === 'income' && incomeMonths.has(ym)) {
      incomeTotalWindow = roundMoney2(incomeTotalWindow + amt)
      const ic = incCat.get(catId) ?? { total: 0, name: cname, icon: cicon, color: ccolor }
      ic.total = roundMoney2(ic.total + amt)
      incCat.set(catId, ic)

      const sid = tx.subcategoryId ?? null
      const sk = subKey(catId, sid)
      const sname = sid ? (tx.subcategory?.name ?? 'Subcategoría') : 'Sin subcategoría'
      const sicon = sid ? (tx.subcategory?.icon ?? cicon) : cicon
      const scolor = sid ? (tx.subcategory?.color ?? ccolor) : ccolor
      const ins = incSub.get(sk) ?? {
        total: 0,
        categoryId: catId,
        subcategoryId: sid,
        categoryName: cname,
        name: sname,
        icon: sicon,
        color: scolor,
      }
      ins.total = roundMoney2(ins.total + amt)
      incSub.set(sk, ins)
    }
  }

  const expenseMonthsDivisor = Math.max(1, expenseMonths.size)
  const incomeMonthsDivisor = Math.max(1, incomeMonths.size)

  return {
    expenseCategories: mapToYearAvgCategories(expCat, expenseMonthsDivisor),
    expenseSubcategories: mapToYearAvgSubcategories(expSub, expenseMonthsDivisor),
    incomeCategories: mapToYearAvgCategories(incCat, incomeMonthsDivisor),
    incomeSubcategories: mapToYearAvgSubcategories(incSub, incomeMonthsDivisor),
    expenseMonthsDivisor,
    incomeMonthsDivisor,
    expenseTotalWindow: roundMoney2(expenseTotalWindow),
    incomeTotalWindow: roundMoney2(incomeTotalWindow),
  }
}
