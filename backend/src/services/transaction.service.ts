import { Op }                              from 'sequelize'
import { Transaction, Account, Category }  from '../models'
import { ApiError }                        from '../utils/ApiError'
import { parsePagination, buildPaginationMeta } from '../utils/pagination'
import {
  CreateTransactionDto, UpdateTransactionDto,
  TransactionQuery, PaginationMeta,
} from '../types'

const WITH_RELATIONS = [
  { model: Account,  as: 'account',  attributes: ['id', 'name', 'color'] },
  { model: Category, as: 'category', attributes: ['id', 'name', 'icon', 'color'] },
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

export async function monthlySummary(userId: string, year: number) {
  const txs = await Transaction.findAll({
    where: { userId, date: { [Op.between]: [`${year}-01-01`, `${year}-12-31`] } },
    attributes: ['type', 'amount', 'date'],
  })

  const months = Array.from({ length: 12 }, (_, i) => ({
    month:    String(i + 1).padStart(2, '0'),
    income:   0,
    expenses: 0,
    net:      0,
  }))

  for (const tx of txs) {
    const m = new Date(tx.date).getMonth()
    if (tx.type === 'income')  months[m].income   += tx.amount
    if (tx.type === 'expense') months[m].expenses += tx.amount
  }
  return months.map(m => ({ ...m, net: m.income - m.expenses }))
}

export async function categoryBreakdown(userId: string, month: string) {
  const [year, mon] = month.split('-')
  const from = `${year}-${mon}-01`
  const to   = new Date(parseInt(year), parseInt(mon), 0).toISOString().split('T')[0]

  const txs = await Transaction.findAll({
    where:   { userId, type: 'expense', date: { [Op.between]: [from, to] } },
    include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'icon', 'color'] }],
  })

  const map: Record<string, { categoryId: string | null; name: string; icon: string; color: string; total: number }> = {}
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
    map[key].total += tx.amount
  }
  return Object.values(map).sort((a, b) => b.total - a.total)
}
