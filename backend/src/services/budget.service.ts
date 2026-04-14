import { Op }                        from 'sequelize'
import { Budget, Category, Transaction } from '../models'
import { ApiError }                   from '../utils/ApiError'
import { UpsertBudgetDto }            from '../types'
import { getMonthCycleConfigForUser, ymToDateBounds } from '../utils/monthPeriod'
import { ERROR_CODES } from '../errors/error-codes'

export async function listWithSpending(userId: string, month: string) {
  const cfg = await getMonthCycleConfigForUser(userId)
  const { from, to } = ymToDateBounds(month, cfg)

  const [budgets, txs] = await Promise.all([
    Budget.findAll({
      where:   { userId, month },
      include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'icon', 'color'] }],
    }),
    Transaction.findAll({
      where:      { userId, isExcluded: false, type: 'expense', date: { [Op.between]: [from, to] } },
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
  if (!category) throw ApiError.notFound(ERROR_CODES.CATEGORY_NOT_FOUND, 'Categoría')

  const [budget, created] = await Budget.findOrCreate({
    where:    { userId, categoryId: dto.categoryId, month: dto.month },
    defaults: { userId, categoryId: dto.categoryId, amount: dto.amount, month: dto.month, notes: dto.notes },
  })

  if (!created) await budget.update({ amount: dto.amount, notes: dto.notes })
  return budget
}

export async function remove(id: string, userId: string): Promise<void> {
  const budget = await Budget.findOne({ where: { id, userId } })
  if (!budget) throw ApiError.notFound(ERROR_CODES.BUDGET_NOT_FOUND, 'Presupuesto')
  await budget.destroy()
}
