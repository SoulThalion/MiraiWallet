import { Op }                        from 'sequelize'
import { Budget, Category, Transaction } from '../models'
import { ApiError }                   from '../utils/ApiError'
import { UpsertBudgetDto }            from '../types'

export async function listWithSpending(userId: string, month: string) {
  const [year, mon] = month.split('-')
  const from = `${year}-${mon}-01`
  const to   = new Date(parseInt(year), parseInt(mon), 0).toISOString().split('T')[0]

  const [budgets, txs] = await Promise.all([
    Budget.findAll({
      where:   { userId, month },
      include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'icon', 'color'] }],
    }),
    Transaction.findAll({
      where:      { userId, type: 'expense', date: { [Op.between]: [from, to] } },
      attributes: ['categoryId', 'amount'],
    }),
  ])

  const spentMap: Record<string, number> = {}
  for (const tx of txs) {
    const k = tx.categoryId ?? 'none'
    spentMap[k] = (spentMap[k] ?? 0) + tx.amount
  }

  return budgets.map(b => {
    const spent = spentMap[b.categoryId] ?? 0
    return {
      ...b.toJSON(),
      spent,
      remaining: b.amount - spent,
      pct:       b.amount > 0 ? Math.round((spent / b.amount) * 100) : 0,
    }
  })
}

export async function upsert(userId: string, dto: UpsertBudgetDto): Promise<Budget> {
  const category = await Category.findOne({ where: { id: dto.categoryId, userId } })
  if (!category) throw ApiError.notFound('Category')

  const [budget, created] = await Budget.findOrCreate({
    where:    { userId, categoryId: dto.categoryId, month: dto.month },
    defaults: { userId, categoryId: dto.categoryId, amount: dto.amount, month: dto.month, notes: dto.notes },
  })

  if (!created) await budget.update({ amount: dto.amount, notes: dto.notes })
  return budget
}

export async function remove(id: string, userId: string): Promise<void> {
  const budget = await Budget.findOne({ where: { id, userId } })
  if (!budget) throw ApiError.notFound('Budget')
  await budget.destroy()
}
