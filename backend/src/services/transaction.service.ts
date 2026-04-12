import { Op, type OrderItem }             from 'sequelize'
import { Transaction, Account, Category, Subcategory } from '../models'
import { ApiError }                        from '../utils/ApiError'
import {
  dateToFiscalYm,
  getMonthCycleConfigForUser,
  toDateOnlyString,
  ymToDateBounds,
} from '../utils/monthPeriod'
import { parsePagination, buildPaginationMeta } from '../utils/pagination'
import {
  CreateTransactionDto, UpdateTransactionDto,
  TransactionQuery, PaginationMeta, TransactionListSortBy,
} from '../types'

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
  if (!tx) throw ApiError.notFound('Transaction')
  return tx
}

export async function create(userId: string, data: CreateTransactionDto): Promise<Transaction> {
  const account = await Account.findOne({ where: { id: data.accountId, userId, isActive: true } })
  if (!account) throw ApiError.notFound('Account')

  const tx    = await Transaction.create({ ...data, userId })
  const delta = data.type === 'income' ? data.amount : -data.amount
  await account.update({ balance: account.balance + delta })

  return findById(tx.id, userId)
}

export async function update(id: string, userId: string, data: UpdateTransactionDto): Promise<Transaction> {
  const tx = await findById(id, userId)

  if (tx.importSource !== 'manual') {
    throw ApiError.forbidden('Solo se pueden editar movimientos creados manualmente')
  }

  const nextType       = data.type ?? tx.type
  const nextCategoryId = data.categoryId !== undefined ? data.categoryId : tx.categoryId
  if (nextType === 'expense' && !nextCategoryId) {
    throw ApiError.badRequest('La categoría es obligatoria para un gasto')
  }

  if (data.amount !== undefined || data.type !== undefined) {
    const account   = await Account.findByPk(tx.accountId)
    if (!account) throw ApiError.notFound('Account')
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
  if (!account) throw ApiError.notFound('Account')
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
      where: { userId, date: { [Op.between]: [`${year}-01-01`, `${year}-12-31`] } },
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
      where: { userId, date: { [Op.between]: [fromY, toY] } },
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

function roundMoney2(n: number): number {
  return Math.round(n * 100) / 100
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

export async function categoryBreakdown(userId: string, month: string) {
  const cfg = await getMonthCycleConfigForUser(userId)
  const { from, to } = ymToDateBounds(month, cfg)

  const txs = await Transaction.findAll({
    where:   { userId, type: 'expense', date: { [Op.between]: [from, to] } },
    include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'icon', 'color'], required: false }],
  })

  return aggregateExpenseByCategory(txs)
}

/** Ingresos del mes `YYYY-MM` agrupados por categoría (misma ventana que `categoryBreakdown`). */
export async function categoryIncomeBreakdownMonth(userId: string, month: string) {
  const cfg = await getMonthCycleConfigForUser(userId)
  const { from, to } = ymToDateBounds(month, cfg)

  const txs = await Transaction.findAll({
    where:   { userId, type: 'income', date: { [Op.between]: [from, to] } },
    include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'icon', 'color'], required: false }],
  })

  return aggregateAmountByCategory(txs)
}

/** Gastos acumulados por categoría (sin filtro de fechas). */
export async function categoryBreakdownAllTime(userId: string) {
  const txs = await Transaction.findAll({
    where:   { userId, type: 'expense' },
    include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'icon', 'color'], required: false }],
  })
  return aggregateExpenseByCategory(txs)
}

/** Ingresos acumulados por categoría (sin filtro de fechas). */
export async function categoryIncomeBreakdownAllTime(userId: string) {
  const txs = await Transaction.findAll({
    where:   { userId, type: 'income' },
    include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'icon', 'color'], required: false }],
  })
  return aggregateAmountByCategory(txs)
}
