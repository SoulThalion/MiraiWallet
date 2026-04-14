import { Op }                        from 'sequelize'
import { Budget, Category, Subcategory, SubcategoryBudget, Transaction, User } from '../models'
import { ApiError }                   from '../utils/ApiError'
import { UpsertBudgetDto, UpsertSubcategoryBudgetDto } from '../types'
import { getMonthCycleConfigForUser, ymToDateBounds } from '../utils/monthPeriod'
import { ERROR_CODES } from '../errors/error-codes'
import { recurringPatternKeyFromTransaction } from './transaction.service'

type SavingsPrefs = {
  recurringSavingsPatternKeys?: string[] | null
  recurringSavingsCategoryIds?: string[] | null
  recurringSavingsSubcategoryIds?: string[] | null
  recurringPatternCategoryOverrides?: Array<{
    patternKey: string
    categoryId: string
    subcategoryId?: string | null
  }> | null
}

export async function listWithSpending(userId: string, month: string) {
  const cfg = await getMonthCycleConfigForUser(userId)
  const { from, to } = ymToDateBounds(month, cfg)

  const [budgets, txs, user] = await Promise.all([
    Budget.findAll({
      where:   { userId, month },
      include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'icon', 'color'] }],
    }),
    Transaction.findAll({
      where:      { userId, isExcluded: false, type: { [Op.in]: ['expense', 'transfer'] }, date: { [Op.between]: [from, to] } },
      attributes: ['categoryId', 'subcategoryId', 'description', 'amount', 'date', 'type'],
    }),
    User.findByPk(userId, { attributes: ['id', 'recurringSavingsPatternKeys', 'recurringSavingsCategoryIds', 'recurringSavingsSubcategoryIds', 'recurringPatternCategoryOverrides'] }),
  ])
  const prefs = (user?.toJSON?.() ?? {}) as SavingsPrefs
  const savingsPatterns = new Set(Array.isArray(prefs.recurringSavingsPatternKeys) ? prefs.recurringSavingsPatternKeys : [])
  const savingsCategories = new Set(Array.isArray(prefs.recurringSavingsCategoryIds) ? prefs.recurringSavingsCategoryIds : [])
  const savingsSubcategories = new Set(Array.isArray(prefs.recurringSavingsSubcategoryIds) ? prefs.recurringSavingsSubcategoryIds : [])
  const patternOverrides = new Map(
    (Array.isArray(prefs.recurringPatternCategoryOverrides) ? prefs.recurringPatternCategoryOverrides : []).map(o => [o.patternKey, o])
  )

  const spentMap: Record<string, number> = {}
  for (const tx of txs) {
    if (tx.type === 'transfer') {
      if (tx.subcategoryId && savingsSubcategories.has(tx.subcategoryId)) {
        // ok
      } else if (tx.categoryId && savingsCategories.has(tx.categoryId)) {
        // ok
      } else {
        const key = recurringPatternKeyFromTransaction(tx)
        if (!key || !savingsPatterns.has(key)) continue
      }
    }
    const pKey = recurringPatternKeyFromTransaction(tx)
    const override = pKey ? patternOverrides.get(pKey) : undefined
    const k = override?.categoryId ?? tx.categoryId ?? 'none'
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

export async function listSubcategoryWithSpending(userId: string, month: string) {
  const cfg = await getMonthCycleConfigForUser(userId)
  const { from, to } = ymToDateBounds(month, cfg)

  const [budgets, txs, user] = await Promise.all([
    SubcategoryBudget.findAll({
      where: { userId, month },
      include: [{
        model: Subcategory,
        as: 'subcategory',
        attributes: ['id', 'name', 'icon', 'color', 'categoryId'],
        include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'icon', 'color'] }],
      }],
    }),
    Transaction.findAll({
      where: { userId, isExcluded: false, type: { [Op.in]: ['expense', 'transfer'] }, date: { [Op.between]: [from, to] } },
      attributes: ['categoryId', 'subcategoryId', 'description', 'amount', 'date', 'type'],
    }),
    User.findByPk(userId, { attributes: ['id', 'recurringSavingsPatternKeys', 'recurringSavingsCategoryIds', 'recurringSavingsSubcategoryIds', 'recurringPatternCategoryOverrides'] }),
  ])
  const prefs = (user?.toJSON?.() ?? {}) as SavingsPrefs
  const savingsPatterns = new Set(Array.isArray(prefs.recurringSavingsPatternKeys) ? prefs.recurringSavingsPatternKeys : [])
  const savingsCategories = new Set(Array.isArray(prefs.recurringSavingsCategoryIds) ? prefs.recurringSavingsCategoryIds : [])
  const savingsSubcategories = new Set(Array.isArray(prefs.recurringSavingsSubcategoryIds) ? prefs.recurringSavingsSubcategoryIds : [])
  const patternOverrides = new Map(
    (Array.isArray(prefs.recurringPatternCategoryOverrides) ? prefs.recurringPatternCategoryOverrides : []).map(o => [o.patternKey, o])
  )

  const spentMap: Record<string, number> = {}
  for (const tx of txs) {
    if (tx.type === 'transfer') {
      if (tx.subcategoryId && savingsSubcategories.has(tx.subcategoryId)) {
        // ok
      } else if (tx.categoryId && savingsCategories.has(tx.categoryId)) {
        // ok
      } else {
        const key = recurringPatternKeyFromTransaction(tx)
        if (!key || !savingsPatterns.has(key)) continue
      }
    }
    const pKey = recurringPatternKeyFromTransaction(tx)
    const override = pKey ? patternOverrides.get(pKey) : undefined
    const key = override?.subcategoryId ?? tx.subcategoryId ?? 'none'
    spentMap[key] = (spentMap[key] ?? 0) + tx.amount
  }

  return budgets.map((b) => {
    const spent = spentMap[b.subcategoryId] ?? 0
    return {
      ...b.toJSON(),
      spent,
      remaining: b.amount - spent,
      pct: b.amount > 0 ? Math.round((spent / b.amount) * 100) : 0,
    }
  })
}

export async function upsertSubcategory(userId: string, dto: UpsertSubcategoryBudgetDto): Promise<SubcategoryBudget> {
  const subcategory = await Subcategory.findOne({ where: { id: dto.subcategoryId, userId } })
  if (!subcategory) throw ApiError.notFound(ERROR_CODES.CATEGORY_NOT_FOUND, 'Subcategoría')

  const [budget, created] = await SubcategoryBudget.findOrCreate({
    where: { userId, subcategoryId: dto.subcategoryId, month: dto.month },
    defaults: { userId, subcategoryId: dto.subcategoryId, amount: dto.amount, month: dto.month },
  })
  if (!created) await budget.update({ amount: dto.amount })
  return budget
}

export async function removeSubcategory(id: string, userId: string): Promise<void> {
  const budget = await SubcategoryBudget.findOne({ where: { id, userId } })
  if (!budget) throw ApiError.notFound(ERROR_CODES.BUDGET_NOT_FOUND, 'Presupuesto de subcategoría')
  await budget.destroy()
}
