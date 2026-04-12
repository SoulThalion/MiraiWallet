import { Op }                              from 'sequelize'
import { Transaction, Account, Category, Subcategory } from '../models'
import { ApiError }                        from '../utils/ApiError'
import { parsePagination, buildPaginationMeta } from '../utils/pagination'
import {
  CreateTransactionDto, UpdateTransactionDto,
  TransactionQuery, PaginationMeta,
} from '../types'

/** `required: false` → LEFT JOIN: no se pierden movimientos sin categoría o con FK huérfana (el total de gastos debe cuadrar con la suma por categorías). */
const WITH_RELATIONS = [
  { model: Account,     as: 'account',     attributes: ['id', 'name', 'color'], required: false },
  { model: Category,    as: 'category',    attributes: ['id', 'name', 'icon', 'color'], required: false },
  { model: Subcategory, as: 'subcategory', attributes: ['id', 'name', 'icon', 'color'], required: false },
]

export async function list(
  userId: string, query: TransactionQuery
): Promise<{ rows: Transaction[]; meta: PaginationMeta }> {
  const { page, limit, offset } = parsePagination(query)
  const where: Record<string, unknown> = { userId }

  if (query.type)       where.type       = query.type
  if (query.accountId)  where.accountId  = query.accountId
  if (query.categoryId) where.categoryId = query.categoryId
  if (query.from || query.to) {
    where.date = {}
    if (query.from) (where.date as Record<string, unknown>)[Op.gte as unknown as string] = query.from
    if (query.to)   (where.date as Record<string, unknown>)[Op.lte as unknown as string] = query.to
  }

  const { count, rows } = await Transaction.findAndCountAll({
    where, limit, offset,
    order:   [['date', 'DESC'], ['createdAt', 'DESC']],
    include: WITH_RELATIONS,
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

/** Mes 0–11 desde DATEONLY `YYYY-MM-DD` sin pasar por `Date` (evita desfases UTC). */
function monthIndexFromDateOnly(dateVal: unknown): number {
  const s = String(dateVal ?? '')
  const m = /^(\d{4})-(\d{2})-\d{2}$/.exec(s)
  if (m) return parseInt(m[2], 10) - 1
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? 0 : d.getMonth()
}

export async function monthlySummary(userId: string, year: number) {
  const txs = await Transaction.findAll({
    where: { userId, date: { [Op.between]: [`${year}-01-01`, `${year}-12-31`] } },
    attributes: ['type', 'amount', 'date'],
  })

  const months = Array.from({ length: 12 }, (_, i) => ({
    month:    String(i + 1).padStart(2, '0'),
    income:   0,
    expenses: 0,
  }))

  for (const tx of txs) {
    const m = monthIndexFromDateOnly(tx.date)
    if (m < 0 || m > 11) continue
    const amt = Number(tx.amount)
    if (!Number.isFinite(amt)) continue
    if (tx.type === 'income') months[m].income += amt
    else months[m].expenses += amt
  }
  return months.map(mo => {
    const income = Math.round(mo.income * 100) / 100
    const expenses = Math.round(mo.expenses * 100) / 100
    const transfers = 0
    const net = Math.round((income - expenses) * 100) / 100
    return { month: mo.month, income, expenses, transfers, net }
  })
}

/** Último día del mes `YYYY-MM` como `YYYY-MM-DD` en calendario local (evita `toISOString()` UTC). */
function lastDateOfCalendarMonthYm(yearStr: string, monPadded: string): string {
  const y = parseInt(yearStr, 10)
  const m = parseInt(monPadded, 10)
  const lastDay = new Date(y, m, 0).getDate()
  return `${yearStr}-${monPadded}-${String(lastDay).padStart(2, '0')}`
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
  const [year, mon] = month.split('-')
  const from = `${year}-${mon}-01`
  const to     = lastDateOfCalendarMonthYm(year, mon)

  const txs = await Transaction.findAll({
    where:   { userId, type: 'expense', date: { [Op.between]: [from, to] } },
    include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'icon', 'color'], required: false }],
  })

  return aggregateExpenseByCategory(txs)
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
