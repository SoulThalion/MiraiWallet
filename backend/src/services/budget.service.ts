import { Op }                        from 'sequelize'
import { Budget, Category, Subcategory, SubcategoryBudget, Transaction, User } from '../models'
import { ApiError }                   from '../utils/ApiError'
import {
  BudgetPaceCategoryDto,
  BudgetPaceDto,
  BudgetPaceMode,
  BudgetPaceStatus,
  BudgetPaceThresholds,
  UpsertBudgetDto,
  UpsertSubcategoryBudgetDto,
} from '../types'
import { dateToFiscalYm, getMonthCycleConfigForUser, toDateOnlyString, ymToDateBounds } from '../utils/monthPeriod'
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
  budgetPaceMode?: BudgetPaceMode
  budgetPaceThresholds?: BudgetPaceThresholds | null
  budgetExcludedCategoryIds?: string[] | null
}

function roundMoney2(n: number): number {
  return Math.round(n * 100) / 100
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

function parseDateOnly(ymd: string): Date {
  return new Date(`${ymd}T00:00:00`)
}

function diffDaysInclusive(fromYmd: string, toYmd: string): number {
  const from = parseDateOnly(fromYmd).getTime()
  const to = parseDateOnly(toYmd).getTime()
  return Math.floor((to - from) / 86400000) + 1
}

function todayYmd(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function defaultPaceThresholdsByMode(mode: BudgetPaceMode): BudgetPaceThresholds {
  if (mode === 'strict') return { warnPct: 5, riskPct: 10, criticalPct: 20 }
  if (mode === 'custom') return { warnPct: 10, riskPct: 20, criticalPct: 35 }
  return { warnPct: 15, riskPct: 30, criticalPct: 45 }
}

function paceStatus(actualSpent: number, expectedSpent: number, thresholds: BudgetPaceThresholds): { pct: number; status: BudgetPaceStatus } {
  const pct = expectedSpent <= 0
    ? (actualSpent > 0 ? 999 : 0)
    : ((actualSpent - expectedSpent) / expectedSpent) * 100
  if (pct > thresholds.criticalPct) return { pct: roundMoney2(pct), status: 'critical' }
  if (pct > thresholds.riskPct) return { pct: roundMoney2(pct), status: 'risk' }
  if (pct > thresholds.warnPct) return { pct: roundMoney2(pct), status: 'warn' }
  return { pct: roundMoney2(pct), status: 'ok' }
}

type PaceTx = Pick<Transaction, 'categoryId' | 'subcategoryId' | 'description' | 'amount' | 'date' | 'type'>

function shouldIncludeTransferAsSavings(tx: PaceTx, savingsCategories: Set<string>, savingsSubcategories: Set<string>, savingsPatterns: Set<string>): boolean {
  if (tx.type !== 'transfer') return true
  if (tx.subcategoryId && savingsSubcategories.has(tx.subcategoryId)) return true
  if (tx.categoryId && savingsCategories.has(tx.categoryId)) return true
  const key = recurringPatternKeyFromTransaction(tx)
  return Boolean(key && savingsPatterns.has(key))
}

export async function getBudgetPace(userId: string, month: string): Promise<BudgetPaceDto> {
  const cfg = await getMonthCycleConfigForUser(userId)
  const { from, to } = ymToDateBounds(month, cfg)
  const nowYmd = todayYmd()
  const currentFiscalYm = dateToFiscalYm(nowYmd, cfg)
  const asOfDate = (currentFiscalYm && month === currentFiscalYm)
    ? (nowYmd < from ? from : (nowYmd > to ? to : nowYmd))
    : to
  const daysTotal = Math.max(1, diffDaysInclusive(from, to))
  const daysElapsed = clamp(diffDaysInclusive(from, asOfDate), 1, daysTotal)
  const daysRemaining = Math.max(0, daysTotal - daysElapsed)
  const periodProgressPct = roundMoney2((daysElapsed / daysTotal) * 100)

  const [user, budgets] = await Promise.all([
    User.findByPk(userId, {
      attributes: [
        'id',
        'recurringSavingsPatternKeys',
        'recurringSavingsCategoryIds',
        'recurringSavingsSubcategoryIds',
        'recurringPatternCategoryOverrides',
        'budgetPaceMode',
        'budgetPaceThresholds',
        'budgetExcludedCategoryIds',
      ],
    }),
    Budget.findAll({
      where: { userId, month },
      include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'icon', 'color'] }],
    }),
  ])

  const prefs = (user?.toJSON?.() ?? {}) as SavingsPrefs
  const mode: BudgetPaceMode = prefs.budgetPaceMode ?? 'flexible'
  const baseThresholds = defaultPaceThresholdsByMode(mode)
  const custom = prefs.budgetPaceThresholds
  const thresholds = mode === 'custom' && custom
    ? {
      warnPct: Number(custom.warnPct) || baseThresholds.warnPct,
      riskPct: Number(custom.riskPct) || baseThresholds.riskPct,
      criticalPct: Number(custom.criticalPct) || baseThresholds.criticalPct,
    }
    : baseThresholds
  const excludedCategoryIds = new Set(Array.isArray(prefs.budgetExcludedCategoryIds) ? prefs.budgetExcludedCategoryIds : [])
  const savingsPatterns = new Set(Array.isArray(prefs.recurringSavingsPatternKeys) ? prefs.recurringSavingsPatternKeys : [])
  const savingsCategories = new Set(Array.isArray(prefs.recurringSavingsCategoryIds) ? prefs.recurringSavingsCategoryIds : [])
  const savingsSubcategories = new Set(Array.isArray(prefs.recurringSavingsSubcategoryIds) ? prefs.recurringSavingsSubcategoryIds : [])
  const patternOverrides = new Map(
    (Array.isArray(prefs.recurringPatternCategoryOverrides) ? prefs.recurringPatternCategoryOverrides : []).map((o) => [o.patternKey, o])
  )

  const budgetRows = budgets
    .filter((b) => !excludedCategoryIds.has(b.categoryId))
    .map((b) => {
      const category = (b as unknown as {
        category?: { name?: string; icon?: string; color?: string }
      }).category
      return {
      categoryId: b.categoryId,
      name: category?.name ?? 'Categoría',
      icon: category?.icon ?? '📂',
      color: category?.color ?? '#1A8CFF',
      budget: roundMoney2(Number(b.amount) || 0),
      }
    })
    .filter((r) => r.budget > 0)

  const budgetMap = new Map(budgetRows.map((r) => [r.categoryId, r]))
  const totalBudget = roundMoney2(budgetRows.reduce((s, r) => s + r.budget, 0))

  const histFrom = ymToDateBounds(`${String(Math.max(1970, Number(month.slice(0, 4)) - 2))}-01`, cfg).from
  const txs = await Transaction.findAll({
    where: {
      userId,
      isExcluded: false,
      type: { [Op.in]: ['expense', 'transfer'] },
      date: { [Op.between]: [histFrom, asOfDate] },
    },
    attributes: ['categoryId', 'subcategoryId', 'description', 'amount', 'date', 'type'],
    order: [['date', 'ASC']],
  })

  let actualSpent = 0
  const spentByCategory = new Map<string, number>()
  const histMonthTotals = new Map<string, number>()
  const histMonthCumAtDay = new Map<string, number>()

  for (const tx of txs) {
    if (!shouldIncludeTransferAsSavings(tx, savingsCategories, savingsSubcategories, savingsPatterns)) continue
    const pKey = recurringPatternKeyFromTransaction(tx)
    const override = pKey ? patternOverrides.get(pKey) : undefined
    const effectiveCategoryId = override?.categoryId ?? tx.categoryId ?? null
    if (!effectiveCategoryId || excludedCategoryIds.has(effectiveCategoryId)) continue
    const budgetCategory = budgetMap.get(effectiveCategoryId)
    if (!budgetCategory) continue
    const amount = roundMoney2(Math.abs(Number(tx.amount) || 0))
    if (amount <= 0) continue
    const txYmd = toDateOnlyString(tx.date)
    const txFiscalYm = dateToFiscalYm(txYmd, cfg)
    if (!txFiscalYm) continue

    if (txYmd >= from && txYmd <= asOfDate && txFiscalYm === month) {
      actualSpent = roundMoney2(actualSpent + amount)
      spentByCategory.set(effectiveCategoryId, roundMoney2((spentByCategory.get(effectiveCategoryId) ?? 0) + amount))
    }

    if (txFiscalYm >= month) continue
    const bounds = ymToDateBounds(txFiscalYm, cfg)
    const monthDaysTotal = Math.max(1, diffDaysInclusive(bounds.from, bounds.to))
    const cutDay = clamp(daysElapsed, 1, monthDaysTotal)
    const dayIndex = clamp(diffDaysInclusive(bounds.from, txYmd), 1, monthDaysTotal)
    histMonthTotals.set(txFiscalYm, roundMoney2((histMonthTotals.get(txFiscalYm) ?? 0) + amount))
    if (dayIndex <= cutDay) {
      histMonthCumAtDay.set(txFiscalYm, roundMoney2((histMonthCumAtDay.get(txFiscalYm) ?? 0) + amount))
    }
  }

  const expectedSpentLinear = roundMoney2(totalBudget * (daysElapsed / daysTotal))
  const orderedHistMonths = [...histMonthTotals.keys()].sort((a, b) => b.localeCompare(a)).slice(0, 12)
  const ratios = orderedHistMonths
    .map((ym) => {
      const total = histMonthTotals.get(ym) ?? 0
      if (total <= 0) return null
      const cum = histMonthCumAtDay.get(ym) ?? 0
      return clamp(cum / total, 0, 1.5)
    })
    .filter((v): v is number => typeof v === 'number')
  const weightedProgress = ratios.length > 0
    ? clamp(ratios.reduce((s, r) => s + r, 0) / ratios.length, 0, 1.5)
    : (daysElapsed / daysTotal)
  const expectedSpentWeighted = roundMoney2(totalBudget * weightedProgress)

  const linear = paceStatus(actualSpent, expectedSpentLinear, thresholds)
  const weighted = paceStatus(actualSpent, expectedSpentWeighted, thresholds)

  const categories: BudgetPaceCategoryDto[] = budgetRows
    .map((row) => {
      const actual = roundMoney2(spentByCategory.get(row.categoryId) ?? 0)
      const expectedLinearCat = roundMoney2(row.budget * (daysElapsed / daysTotal))
      const expectedWeightedCat = roundMoney2(row.budget * weightedProgress)
      const linearCat = paceStatus(actual, expectedLinearCat, thresholds)
      const weightedCat = paceStatus(actual, expectedWeightedCat, thresholds)
      return {
        categoryId: row.categoryId,
        name: row.name,
        icon: row.icon,
        color: row.color,
        budget: row.budget,
        actualSpent: actual,
        expectedSpentLinear: expectedLinearCat,
        expectedSpentWeighted: expectedWeightedCat,
        pacePctLinear: linearCat.pct,
        pacePctWeighted: weightedCat.pct,
        statusLinear: linearCat.status,
        statusWeighted: weightedCat.status,
      }
    })
    .sort((a, b) => b.actualSpent - a.actualSpent || a.name.localeCompare(b.name))

  return {
    month,
    asOfDate,
    daysElapsed,
    daysTotal,
    daysRemaining,
    periodProgressPct,
    budgetPaceMode: mode,
    thresholds,
    actualSpent,
    totalBudget,
    expectedSpentLinear,
    expectedSpentWeighted,
    paceDeltaLinear: roundMoney2(actualSpent - expectedSpentLinear),
    paceDeltaWeighted: roundMoney2(actualSpent - expectedSpentWeighted),
    pacePctLinear: linear.pct,
    pacePctWeighted: weighted.pct,
    statusLinear: linear.status,
    statusWeighted: weighted.status,
    categories,
  }
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
