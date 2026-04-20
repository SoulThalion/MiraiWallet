import { Op } from 'sequelize'
import { Budget, Category, Subcategory, SubcategoryBudget, Transaction, User } from '../models'
import { ApplyBudgetRecommendationDto, BudgetRecommendationProfile, BudgetRecommendationQueryDto } from '../types'
import { ApiError } from '../utils/ApiError'
import { ERROR_CODES } from '../errors/error-codes'
import * as transactionService from './transaction.service'
import * as statsService from './stats.service'

interface SuggestionLine {
  categoryId: string
  name: string
  icon: string
  color: string
  defaultMonthlyBudget: number
  currentBudget: number
  monthlyAverageSpent: number
  suggestedBudget: number
  delta: number
  confidence: number
  reasons: string[]
  subcategories: Array<{
    subcategoryId: string
    name: string
    icon: string
    color: string
    currentBudget: number
    monthlyAverageSpent: number
    suggestedBudget: number
    delta: number
    confidence: number
    reasons: string[]
  }>
}

interface RecommendationResult {
  month: string
  profile: BudgetRecommendationProfile
  targetSavingsRate: number
  incomeAverage: number
  expenseAverage: number
  suggestedTotalBudget: number
  estimatedSavingsAmount: number
  lines: SuggestionLine[]
  /** Suma mensual por categoría de patrones auto + reglas manuales + planificado (piso). */
  recurringFloorByCategoryId: Record<string, number>
  horizons: {
    monthlySuggestedTotal: number
    semesterSuggestedTotal: number
    annualSuggestedTotal: number
    /** v1: semestre/año = escala lineal desde el total mensual sugerido (×6 / ×12). */
    linearScaledFromMonthly: boolean
  }
}

const PROFILE_DEFAULT_SAVINGS: Record<BudgetRecommendationProfile, number> = {
  conservative: 0.25,
  balanced: 0.2,
  flexible: 0.12,
}

function round2(n: number): number {
  return Math.max(0, Math.round(n * 100) / 100)
}

function ymListBackwards(month: string, months = 12): string[] {
  const m = /^(\d{4})-(\d{2})$/.exec(month)
  if (!m) return []
  const yy = Number(m[1])
  const mm = Number(m[2])
  const out: string[] = []
  for (let i = months - 1; i >= 0; i -= 1) {
    const date = new Date(yy, mm - 1 - i, 1)
    out.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`)
  }
  return out
}

function percentile90(values: number[]): number {
  if (values.length === 0) return 0
  const arr = [...values].sort((a, b) => a - b)
  const idx = Math.min(arr.length - 1, Math.ceil(arr.length * 0.9) - 1)
  return arr[idx]
}

function avg(values: number[]): number {
  if (!values.length) return 0
  return values.reduce((s, x) => s + x, 0) / values.length
}

function stdDev(values: number[]): number {
  if (values.length <= 1) return 0
  const m = avg(values)
  return Math.sqrt(avg(values.map((v) => (v - m) ** 2)))
}

function isEssential(name: string): boolean {
  const n = name.toLowerCase()
  return n.includes('hogar') || n.includes('vivienda') || n.includes('comida') || n.includes('transporte') || n.includes('salud')
}

function normalizeProfile(profile?: string): BudgetRecommendationProfile {
  if (!profile) return 'balanced'
  if (profile === 'conservative' || profile === 'balanced' || profile === 'flexible') return profile
  throw ApiError.badRequest(ERROR_CODES.BUDGET_RECOMMENDATION_PROFILE_INVALID, 'Perfil de recomendación inválido')
}

async function buildRecommendation(user: User, dto: BudgetRecommendationQueryDto): Promise<RecommendationResult> {
  const profile = normalizeProfile(dto.profile)
  const targetSavingsRate = Math.min(0.6, Math.max(0.05, Number(dto.targetSavingsRate ?? PROFILE_DEFAULT_SAVINGS[profile])))
  const months = ymListBackwards(dto.month, 12)
  if (!months.length || !/^\d{4}-(0[1-9]|1[0-2])$/.test(dto.month)) {
    throw ApiError.badRequest(ERROR_CODES.BUDGET_RECOMMENDATION_MONTH_INVALID, 'Mes inválido para recomendaciones')
  }

  const [categories, currentBudgets, currentSubBudgets] = await Promise.all([
    Category.findAll({
      where: { userId: user.id },
      include: [{ model: Subcategory, as: 'subcategories', attributes: ['id', 'name', 'icon', 'color'] }],
      attributes: ['id', 'name', 'icon', 'color', 'monthlyBudget', 'type'],
    }),
    Budget.findAll({ where: { userId: user.id, month: dto.month } }),
    SubcategoryBudget.findAll({ where: { userId: user.id, month: dto.month } }),
  ])
  const patternOverrides = transactionService.buildPatternCategoryOverrideMap(user.recurringPatternCategoryOverrides as unknown)
  const [rolling, autoPatterns, manualRules, plannedCommitments] = await Promise.all([
    transactionService.rolling12ByCategoryAndSubcategory(user.id, dto.month, {
    includeTransferPatternKeys: user.recurringSavingsPatternKeys ?? [],
    includeTransferCategoryIds: user.recurringSavingsCategoryIds ?? [],
    includeTransferSubcategoryIds: user.recurringSavingsSubcategoryIds ?? [],
    patternCategoryOverrides: patternOverrides,
    }),
    statsService.findRecurringExpensePatterns(user.id),
    statsService.listRecurringManualRules(user.id),
    statsService.listPlannedCommitments(user.id),
  ])

  const recurringFloorByCategoryId: Record<string, number> = {}
  const addFloor = (categoryId: string | null | undefined, amt: number) => {
    if (!categoryId) return
    const v = round2(Math.max(0, amt))
    if (v <= 0) return
    recurringFloorByCategoryId[categoryId] = round2((recurringFloorByCategoryId[categoryId] ?? 0) + v)
  }
  for (const p of autoPatterns) {
    if (p.isSavings) continue
    addFloor(p.categoryId ?? undefined, p.amount)
  }
  for (const r of manualRules) {
    const nominal = r.maxAmount ?? r.minAmount ?? 0
    addFloor(r.categoryId, Number(nominal) || 0)
  }
  for (const c of plannedCommitments) {
    if (c.kind === 'one_shot' && c.dueYm === dto.month) {
      addFloor(c.categoryId ?? undefined, c.amount)
    } else if (c.kind === 'recurring' && c.cadence) {
      const monthsIn = c.cadence === 'quarterly' ? 3 : c.cadence === 'semiannual' ? 6 : 12
      addFloor(c.categoryId ?? undefined, c.amount / monthsIn)
    }
  }

  const excludedCategoryIds = new Set(user.budgetExcludedCategoryIds ?? [])
  const excludedSubcategoryIds = new Set(user.budgetExcludedSubcategoryIds ?? [])
  const incomeAverage = rolling.incomeMonthsDivisor > 0
    ? round2(rolling.incomeTotalWindow / Math.max(1, rolling.incomeMonthsDivisor))
    : 0
  const outflowAverage = rolling.expenseMonthsDivisor > 0
    ? round2(rolling.expenseTotalWindow / Math.max(1, rolling.expenseMonthsDivisor))
    : 0
  const currentBudgetTotal = currentBudgets.reduce((s, b) => s + (Number(b.amount) || 0), 0)
  const defaultBudgetTotal = categories.reduce((s, c) => s + (Number(c.monthlyBudget ?? 0) || 0), 0)
  const suggestedTotalBudget = round2(
    incomeAverage > 0
      ? incomeAverage * (1 - targetSavingsRate)
      : Math.max(outflowAverage, currentBudgetTotal, defaultBudgetTotal)
  )
  const expenseAverageForExplain = outflowAverage
  const yearAvgByCategory = new Map(rolling.expenseCategories.map((r) => [r.categoryId, r]))
  const yearAvgIncomeByCategory = new Map(rolling.incomeCategories.map((r) => [r.categoryId, r]))
  const yearAvgBySubcategory = new Map(
    rolling.expenseSubcategories
      .filter((r) => r.subcategoryId)
      .map((r) => [r.subcategoryId as string, r])
  )
  const categoryWeightTotal = rolling.expenseCategories.reduce((s, r) => s + (r.avgPerMonth || 0), 0)

  const budgetMap = new Map(currentBudgets.map((b) => [b.categoryId, Number(b.amount) || 0]))
  const subBudgetMap = new Map(currentSubBudgets.map((b) => [b.subcategoryId, Number(b.amount) || 0]))

  const categoriesForRecommendation = categories.filter((cat) => {
    if ((cat as unknown as { type?: 'income' | 'expense' }).type !== 'income') return true
    const expMean = Number(yearAvgByCategory.get(cat.id)?.avgPerMonth ?? 0) || 0
    const incMean = Number(yearAvgIncomeByCategory.get(cat.id)?.avgPerMonth ?? 0) || 0
    return expMean > incMean
  })

  const lines: SuggestionLine[] = categoriesForRecommendation.map((cat) => {
    const catId = cat.id
    const catRolling = yearAvgByCategory.get(catId)
    const mean = Number(catRolling?.avgPerMonth ?? 0) || 0
    const totalYear = Number(catRolling?.totalYear ?? 0) || 0
    const hasHistory = totalYear > 0 && rolling.expenseMonthsDivisor > 0

    let baseline = mean
    if (isEssential(cat.name)) baseline = Math.max(mean * 1.05, mean * 1.1)
    else baseline = profile === 'conservative' ? mean * 0.85 : profile === 'balanced' ? mean * 0.92 : mean
    if (baseline <= 0) baseline = Number(cat.monthlyBudget ?? 0) || 0

    const weight = categoryWeightTotal > 0 ? (mean / categoryWeightTotal) : 0
    const fallbackWeightBase = categoriesForRecommendation.reduce((s, c) => s + (Number(c.monthlyBudget ?? 0) || 0), 0)
    const fallbackWeight = fallbackWeightBase > 0
      ? (Number(cat.monthlyBudget ?? 0) || 0) / fallbackWeightBase
      : 1 / Math.max(1, categoriesForRecommendation.length)
    const budgetByWeight = suggestedTotalBudget * (categoryWeightTotal > 0 ? weight : fallbackWeight)
    const floorCat = recurringFloorByCategoryId[catId] ?? 0
    let suggested = round2(Math.max(baseline, budgetByWeight, budgetMap.get(catId) ?? 0, floorCat))
    const reasons: string[] = []
    if (excludedCategoryIds.has(catId)) {
      suggested = 0
      reasons.push('Categoría excluida por el usuario')
    } else if (!hasHistory) {
      reasons.push('Sin histórico de gasto suficiente en ventana activa')
      reasons.push('Se mantiene base en presupuesto actual hasta tener más datos')
    } else {
      reasons.push(`Media móvil ${round2(mean)} EUR en ${rolling.expenseMonthsDivisor} mes(es) con datos`)
      reasons.push(`Ajuste ${profile} con objetivo ahorro ${round2(targetSavingsRate * 100)}%`)
      if (floorCat > 0) {
        reasons.push(`Piso recurrentes/planificado ~${round2(floorCat)} EUR en esta categoría`)
      }
    }

    const subcategories = (cat.subcategories ?? []).map((sub) => {
      const subId = sub.id
      const subRolling = yearAvgBySubcategory.get(subId)
      const subMean = Number(subRolling?.avgPerMonth ?? 0) || 0
      const subTotalYear = Number(subRolling?.totalYear ?? 0) || 0
      const subHasHistory = subTotalYear > 0 && rolling.expenseMonthsDivisor > 0
      const ratio = mean > 0 ? subMean / mean : 0
      let subSuggested = round2(Math.max(suggested * ratio, subBudgetMap.get(subId) ?? 0))
      if (subMean > 0) subSuggested = Math.max(subSuggested, round2(subMean * 0.9))
      const subReasons: string[] = [`Peso histórico ${round2(ratio * 100)}% en categoría`]
      if (excludedCategoryIds.has(catId) || excludedSubcategoryIds.has(subId)) {
        subSuggested = 0
        subReasons.push('Subcategoría excluida por el usuario')
      } else if (!subHasHistory) {
        subReasons.push('Sin histórico suficiente; se conserva referencia actual')
      }
      return {
        subcategoryId: subId,
        name: sub.name,
        icon: sub.icon,
        color: sub.color,
        currentBudget: round2(subBudgetMap.get(subId) ?? 0),
        monthlyAverageSpent: round2(subMean),
        suggestedBudget: round2(subSuggested),
        delta: round2(subSuggested - (subBudgetMap.get(subId) ?? 0)),
        confidence: round2((subHasHistory ? 0.72 : 0.35) * 100),
        reasons: subReasons,
      }
    })

    return {
      categoryId: catId,
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      defaultMonthlyBudget: Number(cat.monthlyBudget ?? 0) || 0,
      currentBudget: round2(budgetMap.get(catId) ?? 0),
      monthlyAverageSpent: round2(mean),
      suggestedBudget: suggested,
      delta: round2(suggested - (budgetMap.get(catId) ?? 0)),
      confidence: round2((hasHistory ? 0.78 : 0.35) * 100),
      reasons,
      subcategories,
    }
  })

  const monthlySuggestedTotal = round2(lines.reduce((s, l) => s + l.suggestedBudget, 0))

  return {
    month: dto.month,
    profile,
    targetSavingsRate: round2(targetSavingsRate),
    incomeAverage: round2(incomeAverage),
    expenseAverage: round2(expenseAverageForExplain),
    suggestedTotalBudget: round2(suggestedTotalBudget),
    estimatedSavingsAmount: round2(incomeAverage * targetSavingsRate),
    lines,
    recurringFloorByCategoryId,
    horizons: {
      monthlySuggestedTotal,
      semesterSuggestedTotal: round2(monthlySuggestedTotal * 6),
      annualSuggestedTotal: round2(monthlySuggestedTotal * 12),
      linearScaledFromMonthly: true,
    },
  }
}

export async function getRecommendations(userId: string, dto: BudgetRecommendationQueryDto): Promise<RecommendationResult> {
  const user = await User.findByPk(userId)
  if (!user) throw ApiError.notFound(ERROR_CODES.USER_NOT_FOUND, 'Usuario')
  return buildRecommendation(user, dto)
}

export async function applyRecommendations(userId: string, dto: ApplyBudgetRecommendationDto): Promise<{ appliedCategories: number; appliedSubcategories: number; month: string }> {
  const user = await User.findByPk(userId)
  if (!user) throw ApiError.notFound(ERROR_CODES.USER_NOT_FOUND, 'Usuario')
  const mode = dto.mode ?? 'all'
  if (!['all', 'categories', 'subcategories'].includes(mode)) {
    throw ApiError.badRequest(ERROR_CODES.BUDGET_RECOMMENDATION_APPLY_INVALID, 'Modo de aplicación inválido')
  }

  const reco = await buildRecommendation(user, dto)
  const pickCat = new Set(dto.categoryIds ?? [])
  const pickSub = new Set(dto.subcategoryIds ?? [])

  let appliedCategories = 0
  let appliedSubcategories = 0
  for (const line of reco.lines) {
    const shouldApplyCat = mode === 'all' || (mode === 'categories' && pickCat.has(line.categoryId))
    if (shouldApplyCat) {
      const [row, created] = await Budget.findOrCreate({
        where: { userId, categoryId: line.categoryId, month: reco.month },
        defaults: { userId, categoryId: line.categoryId, month: reco.month, amount: line.suggestedBudget },
      })
      if (!created) await row.update({ amount: line.suggestedBudget })
      appliedCategories += 1
    }

    for (const sub of line.subcategories) {
      const shouldApplySub = mode === 'all' || (mode === 'subcategories' && pickSub.has(sub.subcategoryId))
      if (!shouldApplySub) continue
      const [row, created] = await SubcategoryBudget.findOrCreate({
        where: { userId, subcategoryId: sub.subcategoryId, month: reco.month },
        defaults: { userId, subcategoryId: sub.subcategoryId, month: reco.month, amount: sub.suggestedBudget },
      })
      if (!created) await row.update({ amount: sub.suggestedBudget })
      appliedSubcategories += 1
    }
  }

  return { appliedCategories, appliedSubcategories, month: reco.month }
}
