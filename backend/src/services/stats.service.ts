import { Op } from 'sequelize'
import { Account, Budget, Category, RecurringPatternDismissal, Subcategory, SubcategoryBudget, Transaction, User } from '../models'
import * as accountService     from './account.service'
import * as transactionService from './transaction.service'
import type { StatsMonthOverviewDto, StatsRecurringExpenseDto } from '../types'
import { dateToFiscalYm, getMonthCycleConfigForUser, toDateOnlyString, ymToDateBounds } from '../utils/monthPeriod'
import { ApiError } from '../utils/ApiError'
import { ERROR_CODES } from '../errors/error-codes'

function isYm(s: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(s)
}

const MONTH_LABEL_ES: Record<string, string> = {
  '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr', '05': 'May', '06': 'Jun',
  '07': 'Jul', '08': 'Ago', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic',
}

function monthLabelEs(mm: string): string {
  return MONTH_LABEL_ES[mm] ?? mm
}

function roundMoney2(n: number): number {
  return Math.round(n * 100) / 100
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

async function defaultFiscalYmForUser(userId: string): Promise<string> {
  const cfg = await getMonthCycleConfigForUser(userId)
  const d = new Date()
  const ymd = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
  return dateToFiscalYm(ymd, cfg) || `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`
}

const RECURRING_LOOKBACK_MONTHS = 36
/** Los más recientes primero: si hay muchos movimientos, los patrones actuales (Netflix, etc.) no deben quedar fuera. */
const RECURRING_MAX_TX = 20000
const RECURRING_MAX_RESULTS = 60

function calendarYmFromDateOnly(dateVal: unknown): string {
  const ymd = toDateOnlyString(dateVal)
  return ymd.length >= 7 ? ymd.slice(0, 7) : ''
}

function dayOfMonthFromDateOnly(dateVal: unknown): number {
  const ymd = toDateOnlyString(dateVal)
  const br = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd)
  if (!br) return 0
  return parseInt(br[3]!, 10)
}

function recurringExpenseGroupKey(tx: Transaction): string | null {
  return transactionService.recurringPatternKeyFromTransaction(tx)
}

/**
 * Agrupa gastos con la misma categoría, subcategoría, concepto (insensible a mayúsculas y espacios),
 * importe y día del mes; solo incluye grupos con ≥2 apariciones en ≥2 meses naturales distintos.
 */
function calendarYmToday(d = new Date()): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`
}

/**
 * Mejor mes (mínimo importe mensual del tipo) en ventana móvil:
 * - Solo meses con movimiento del tipo (>0)
 * - Últimos 12 meses con datos hasta `anchorYm`
 * - Excluye siempre el mes fiscal actual (incompleto)
 */
async function bestMonthRolling(
  userId: string,
  anchorYm: string,
  monthCycleCfg: Awaited<ReturnType<typeof getMonthCycleConfigForUser>>,
  kind: 'expense' | 'income',
): Promise<{ label: string; amount: number }> {
  const nowYmd = toDateOnlyString(new Date())
  const currentFiscalYm = dateToFiscalYm(nowYmd, monthCycleCfg)
  const anchor = /^\d{4}-(0[1-9]|1[0-2])$/.test(anchorYm) ? anchorYm : (currentFiscalYm ?? anchorYm)
  const { to: toAnchor } = ymToDateBounds(anchor, monthCycleCfg)
  const fromProbe = ymToDateBounds(`${String(parseInt(anchor.slice(0, 4), 10) - 4)}-01`, monthCycleCfg).from

  const txs = await Transaction.findAll({
    where: {
      userId,
      isExcluded: false,
      type: kind,
      date: { [Op.between]: [fromProbe, toAnchor] },
    },
    attributes: ['date', 'amount'],
  })

  const byYm = new Map<string, number>()
  for (const tx of txs) {
    const ym = dateToFiscalYm(tx.date, monthCycleCfg)
    if (!ym || ym > anchor) continue
    if (currentFiscalYm && ym === currentFiscalYm) continue
    const amt = Number(tx.amount)
    if (!Number.isFinite(amt) || amt <= 0) continue
    byYm.set(ym, roundMoney2((byYm.get(ym) ?? 0) + amt))
  }

  const windowYms = [...byYm.keys()].sort((a, b) => b.localeCompare(a)).slice(0, 12)
  if (windowYms.length === 0) return { label: '—', amount: 0 }

  /**
   * Si el mes más antiguo de la ventana es el mes en que empezó la actividad del usuario
   * y ese primer movimiento cayó después del inicio del periodo fiscal, lo tratamos como
   * mes parcial de arranque y lo excluimos para el KPI de mínimo mensual.
   */
  const firstTx = await Transaction.findOne({
    where: { userId, isExcluded: false, type: kind },
    attributes: ['date'],
    order: [['date', 'ASC']],
  })
  let candidateYms = [...windowYms]
  if (firstTx) {
    const firstYmd = toDateOnlyString(firstTx.date)
    const firstYm = dateToFiscalYm(firstYmd, monthCycleCfg)
    const oldestYm = candidateYms[candidateYms.length - 1]
    if (firstYm && oldestYm && firstYm === oldestYm) {
      try {
        const { from } = ymToDateBounds(oldestYm, monthCycleCfg)
        if (firstYmd > from) {
          candidateYms = candidateYms.filter(ym => ym !== oldestYm)
        }
      } catch {
        // Si el periodo no es válido por algún motivo, mantenemos el comportamiento base.
      }
    }
  }
  if (candidateYms.length === 0) return { label: '—', amount: 0 }

  let bestYm = candidateYms[0]!
  let bestAmount = byYm.get(bestYm) ?? 0
  for (const ym of candidateYms.slice(1)) {
    const amt = byYm.get(ym) ?? 0
    if (amt < bestAmount || (amt === bestAmount && ym < bestYm)) {
      bestYm = ym
      bestAmount = amt
    }
  }

  const [y, mm] = bestYm.split('-')
  return { label: `${monthLabelEs(mm)} ${y}`, amount: roundMoney2(bestAmount) }
}

async function findRecurringExpensePatterns(userId: string): Promise<StatsRecurringExpenseDto[]> {
  const user = await User.findByPk(userId, {
    attributes: [
      'id',
      'recurringExcludedCategoryIds',
      'recurringExcludedSubcategoryIds',
      'recurringSavingsPatternKeys',
      'recurringSavingsCategoryIds',
      'recurringSavingsSubcategoryIds',
      'recurringPatternCategoryOverrides',
    ],
  })
  const rawExcludedCat = user?.recurringExcludedCategoryIds as unknown
  const excludedCategorySet = new Set<string>(
    Array.isArray(rawExcludedCat) ? rawExcludedCat.map(x => String(x)).filter(Boolean) : [],
  )
  const rawExcludedSub = user?.recurringExcludedSubcategoryIds as unknown
  const excludedSubcategorySet = new Set<string>(
    Array.isArray(rawExcludedSub) ? rawExcludedSub.map(x => String(x)).filter(Boolean) : [],
  )
  const rawSavingsPatterns = user?.recurringSavingsPatternKeys as unknown
  const savingsPatternSet = new Set<string>(
    Array.isArray(rawSavingsPatterns) ? rawSavingsPatterns.map(x => String(x)).filter(Boolean) : [],
  )
  const rawSavingsCategoryIds = user?.recurringSavingsCategoryIds as unknown
  const savingsCategorySet = new Set<string>(
    Array.isArray(rawSavingsCategoryIds) ? rawSavingsCategoryIds.map(x => String(x)).filter(Boolean) : [],
  )
  const rawSavingsSubcategoryIds = user?.recurringSavingsSubcategoryIds as unknown
  const savingsSubcategorySet = new Set<string>(
    Array.isArray(rawSavingsSubcategoryIds) ? rawSavingsSubcategoryIds.map(x => String(x)).filter(Boolean) : [],
  )
  const overrideMap = transactionService.buildPatternCategoryOverrideMap(user?.recurringPatternCategoryOverrides as unknown)
  const [allCategories, allSubcategories] = await Promise.all([
    Category.findAll({ where: { userId }, attributes: ['id', 'name', 'icon', 'color'] }),
    Subcategory.findAll({ where: { userId }, attributes: ['id', 'name', 'icon', 'color', 'categoryId'] }),
  ])
  const catById = new Map(allCategories.map(c => [c.id, c]))
  const subById = new Map(allSubcategories.map(s => [s.id, s]))

  const dismissRows = await RecurringPatternDismissal.findAll({
    where: { userId },
    attributes: ['patternKey', 'dismissedYm'],
  })
  const dismissalMap = new Map(dismissRows.map(r => [r.patternKey, r.dismissedYm]))

  const since = new Date()
  since.setMonth(since.getMonth() - RECURRING_LOOKBACK_MONTHS)
  const fromYmd = `${since.getFullYear()}-${pad2(since.getMonth() + 1)}-${pad2(since.getDate())}`

  const txs = await Transaction.findAll({
    where: { userId, isExcluded: false, type: { [Op.in]: ['expense', 'transfer'] }, date: { [Op.gte]: fromYmd } },
    include: [
      { model: Category, as: 'category', attributes: ['id', 'name', 'icon', 'color'], required: false },
      { model: Subcategory, as: 'subcategory', attributes: ['id', 'name'], required: false },
    ],
    order: [['date', 'DESC']],
    limit: RECURRING_MAX_TX,
  })

  type Acc = { txs: Transaction[]; months: Set<string> }
  const groups = new Map<string, Acc>()

  for (const tx of txs) {
    if (tx.categoryId && excludedCategorySet.has(tx.categoryId)) continue
    if (tx.subcategoryId && excludedSubcategorySet.has(tx.subcategoryId)) continue
    const key = recurringExpenseGroupKey(tx)
    if (!key) continue
    const ym = calendarYmFromDateOnly(tx.date)
    if (!/^\d{4}-\d{2}$/.test(ym)) continue
    const acc = groups.get(key) ?? { txs: [], months: new Set() }
    acc.txs.push(tx)
    acc.months.add(ym)
    groups.set(key, acc)
  }

  const out: StatsRecurringExpenseDto[] = []
  for (const [, acc] of groups) {
    if (acc.txs.length < 2 || acc.months.size < 2) continue
    const sorted = [...acc.txs].sort((a, b) =>
      toDateOnlyString(a.date).localeCompare(toDateOnlyString(b.date)),
    )
    const first = sorted[0]!
    const dates = sorted.map(t => toDateOnlyString(t.date))
    const firstDate = dates[0]!
    const lastDate = dates[dates.length - 1]!
    const day = dayOfMonthFromDateOnly(first.date)
    const patternKey = recurringExpenseGroupKey(first)
    if (!patternKey) continue
    const override = overrideMap.get(patternKey)
    const effectiveCat = override?.categoryId ? catById.get(override.categoryId) : null
    const effectiveSub = override?.subcategoryId ? subById.get(override.subcategoryId) : null
    const effectiveCatFromSub = effectiveSub ? catById.get(effectiveSub.categoryId) : null
    const categoryId = effectiveCatFromSub?.id ?? effectiveCat?.id ?? first.categoryId ?? null
    const subcategoryId = effectiveSub?.id ?? (override && !override.subcategoryId ? null : (first.subcategoryId ?? null))
    const categoryName = effectiveCatFromSub?.name ?? effectiveCat?.name ?? first.category?.name ?? 'Sin categoría'
    const categoryIcon = effectiveCatFromSub?.icon ?? effectiveCat?.icon ?? first.category?.icon ?? '💸'
    const categoryColor = effectiveCatFromSub?.color ?? effectiveCat?.color ?? first.category?.color ?? '#888'
    const subcategoryName = effectiveSub?.name ?? (
      subcategoryId ? (first.subcategory?.name ?? null) : null
    )
    out.push({
      categoryId,
      subcategoryId,
      categoryName,
      subcategoryName,
      categoryIcon,
      categoryColor,
      description:      first.description.trim().replace(/\s+/g, ' '),
      amount:           roundMoney2(Math.abs(Number(first.amount))),
      dayOfMonth:       day,
      occurrenceCount:  acc.txs.length,
      distinctMonthCount: acc.months.size,
      firstDate,
      lastDate,
      patternKey,
      isSavings:
        savingsPatternSet.has(patternKey)
        || (first.subcategoryId ? savingsSubcategorySet.has(first.subcategoryId) : false)
        || (first.categoryId ? savingsCategorySet.has(first.categoryId) : false),
    })
  }

  const keysToClearDismissal: string[] = []
  const visible: StatsRecurringExpenseDto[] = []
  for (const row of out) {
    const dismissYm = dismissalMap.get(row.patternKey)
    const lastYm = row.lastDate.slice(0, 7)
    if (dismissYm) {
      if (lastYm > dismissYm) {
        keysToClearDismissal.push(row.patternKey)
        visible.push(row)
      }
    } else {
      visible.push(row)
    }
  }

  if (keysToClearDismissal.length > 0) {
    await RecurringPatternDismissal.destroy({
      where: { userId, patternKey: { [Op.in]: [...new Set(keysToClearDismissal)] } },
    })
  }

  visible.sort((a, b) => {
    if (b.distinctMonthCount !== a.distinctMonthCount) return b.distinctMonthCount - a.distinctMonthCount
    if (b.occurrenceCount !== a.occurrenceCount) return b.occurrenceCount - a.occurrenceCount
    return a.description.localeCompare(b.description)
  })

  return visible.slice(0, RECURRING_MAX_RESULTS)
}

export async function setRecurringPatternSavings(userId: string, patternKeyRaw: string, isSavings: boolean): Promise<void> {
  const patternKey = patternKeyRaw.trim().slice(0, 400)
  if (!patternKey) throw ApiError.badRequest(ERROR_CODES.IMPORT_PATTERN_KEY_REQUIRED, 'patternKey es obligatorio')
  const user = await User.findByPk(userId, { attributes: ['id', 'recurringSavingsPatternKeys'] })
  if (!user) throw ApiError.notFound(ERROR_CODES.USER_NOT_FOUND, 'Usuario')
  const current = new Set(Array.isArray(user.recurringSavingsPatternKeys) ? user.recurringSavingsPatternKeys : [])
  if (isSavings) current.add(patternKey)
  else current.delete(patternKey)
  await user.update({ recurringSavingsPatternKeys: [...current] })
}

export async function setRecurringPatternCategory(
  userId: string,
  patternKeyRaw: string,
  categoryId: string | null,
  subcategoryId: string | null,
): Promise<void> {
  const patternKey = patternKeyRaw.trim().slice(0, 400)
  if (!patternKey) throw ApiError.badRequest(ERROR_CODES.IMPORT_PATTERN_KEY_REQUIRED, 'patternKey es obligatorio')
  const user = await User.findByPk(userId, { attributes: ['id', 'recurringPatternCategoryOverrides'] })
  if (!user) throw ApiError.notFound(ERROR_CODES.USER_NOT_FOUND, 'Usuario')

  if (!categoryId) {
    const current = transactionService.buildPatternCategoryOverrideMap(user.recurringPatternCategoryOverrides as unknown)
    current.delete(patternKey)
    await user.update({ recurringPatternCategoryOverrides: [...current.values()] })
    return
  }

  const cat = await Category.findOne({ where: { id: categoryId, userId }, attributes: ['id'] })
  if (!cat) throw ApiError.badRequest(ERROR_CODES.CATEGORY_NOT_FOUND, 'Categoría inválida para reclasificación')
  let nextSubcategoryId: string | null = null
  if (subcategoryId) {
    const sub = await Subcategory.findOne({ where: { id: subcategoryId, userId }, attributes: ['id', 'categoryId'] })
    if (!sub || sub.categoryId !== categoryId) {
      throw ApiError.badRequest(ERROR_CODES.CATEGORY_NOT_FOUND, 'Subcategoría inválida para la categoría seleccionada')
    }
    nextSubcategoryId = sub.id
  }
  const current = transactionService.buildPatternCategoryOverrideMap(user.recurringPatternCategoryOverrides as unknown)
  current.set(patternKey, { patternKey, categoryId, subcategoryId: nextSubcategoryId })
  await user.update({ recurringPatternCategoryOverrides: [...current.values()] })
}

/**
 * Oculta un patrón recurrente hasta que exista un movimiento en un mes natural **posterior**
 * al mes calendario en que se descartó (`dismissedYm`). No borra transacciones.
 */
export async function dismissRecurringPattern(userId: string, patternKeyRaw: string): Promise<void> {
  const patternKey = patternKeyRaw.trim().slice(0, 400)
  if (!patternKey) throw ApiError.badRequest(ERROR_CODES.IMPORT_PATTERN_KEY_REQUIRED, 'patternKey es obligatorio')

  const dismissedYm = calendarYmToday()
  const existing = await RecurringPatternDismissal.findOne({ where: { userId, patternKey } })
  if (existing) await existing.update({ dismissedYm })
  else await RecurringPatternDismissal.create({ userId, patternKey, dismissedYm })
}

/**
 * Payload dedicado a la vista Estadísticas: barras anuales, desglose del mes (gasto/presupuesto/ingreso por categoría) y totales.
 * No depende de que existan filas de `Budget` por categoría: el gasto viene de transacciones del mes.
 */
export async function monthOverview(userId: string, monthOverride?: string): Promise<StatsMonthOverviewDto> {
  const month = monthOverride && isYm(monthOverride)
    ? monthOverride
    : await defaultFiscalYmForUser(userId)
  const [yStr, mStr] = month.split('-')
  const year = parseInt(yStr, 10)
  const selectedMm = mStr

  const [summaryRows, allCategories, budgets, subBudgets, recurringExpenses, monthCycleCfg, userPrefs] =
    await Promise.all([
      transactionService.monthlySummary(userId, year),
      Category.findAll({
        where: { userId },
        order: [['name', 'ASC']],
        include: [{
          model: Subcategory,
          as: 'subcategories',
          attributes: ['id', 'name', 'icon', 'color'],
          required: false,
        }],
      }),
      Budget.findAll({ where: { userId, month } }),
      SubcategoryBudget.findAll({ where: { userId, month } }),
      findRecurringExpensePatterns(userId),
      getMonthCycleConfigForUser(userId),
      User.findByPk(userId, {
        attributes: [
          'id',
          'recurringSavingsPatternKeys',
          'recurringSavingsCategoryIds',
          'recurringSavingsSubcategoryIds',
          'recurringPatternCategoryOverrides',
        ],
      }),
    ])
  const patternCategoryOverrides = transactionService.buildPatternCategoryOverrideMap(
    userPrefs?.recurringPatternCategoryOverrides as unknown
  )
  const [expenseRows, incomeRows, expenseSubRows, incomeSubRows, yearAvgs] = await Promise.all([
    transactionService.categoryBreakdown(userId, month, { patternCategoryOverrides }),
    transactionService.categoryIncomeBreakdownMonth(userId, month, { patternCategoryOverrides }),
    transactionService.subcategoryBreakdownMonth(userId, month, 'expense', { patternCategoryOverrides }),
    transactionService.subcategoryBreakdownMonth(userId, month, 'income', { patternCategoryOverrides }),
    transactionService.rolling12ByCategoryAndSubcategory(userId, month, {
      includeTransferPatternKeys: userPrefs?.recurringSavingsPatternKeys ?? [],
      includeTransferCategoryIds: userPrefs?.recurringSavingsCategoryIds ?? [],
      includeTransferSubcategoryIds: userPrefs?.recurringSavingsSubcategoryIds ?? [],
      patternCategoryOverrides,
    }),
  ])
  const bestExpenseMonthRolling = await bestMonthRolling(userId, month, monthCycleCfg, 'expense')
  const bestIncomeMonthRolling = await bestMonthRolling(userId, month, monthCycleCfg, 'income')

  const expenseMap = new Map<string, number>()
  const expenseMeta = new Map<string, { name: string; icon: string; color: string }>()
  for (const r of expenseRows) {
    const id = r.categoryId ?? 'uncategorized'
    expenseMap.set(id, r.total)
    expenseMeta.set(id, { name: r.name, icon: r.icon, color: r.color })
  }
  const incomeMap = new Map<string, number>()
  for (const r of incomeRows) {
    const id = r.categoryId ?? 'uncategorized'
    incomeMap.set(id, r.total)
  }
  const budgetMap = new Map<string, number>()
  for (const b of budgets) {
    budgetMap.set(b.categoryId, roundMoney2(Number(b.amount)))
  }
  const subBudgetMap = new Map<string, number>()
  for (const b of subBudgets) {
    subBudgetMap.set(b.subcategoryId, roundMoney2(Number(b.amount)))
  }
  const excludedSubcategorySet = new Set(userPrefs?.budgetExcludedSubcategoryIds ?? [])
  const expSubByCat = new Map<string, typeof expenseSubRows>()
  for (const r of expenseSubRows) {
    const cid = r.categoryId ?? 'uncategorized'
    expSubByCat.set(cid, [...(expSubByCat.get(cid) ?? []), r])
  }
  const incSubByCat = new Map<string, typeof incomeSubRows>()
  for (const r of incomeSubRows) {
    const cid = r.categoryId ?? 'uncategorized'
    incSubByCat.set(cid, [...(incSubByCat.get(cid) ?? []), r])
  }

  const catById = new Map(allCategories.map(c => [c.id, c]))
  const rowIds = new Set<string>()
  for (const c of allCategories) rowIds.add(c.id)
  for (const b of budgets) rowIds.add(b.categoryId)
  for (const r of expenseRows) rowIds.add(r.categoryId ?? 'uncategorized')
  for (const r of incomeRows) rowIds.add(r.categoryId ?? 'uncategorized')

  const categories: StatsMonthOverviewDto['categories'] = []
  for (const id of rowIds) {
    if (id === 'uncategorized') {
      const spent = expenseMap.get('uncategorized') ?? 0
      const inc = incomeMap.get('uncategorized') ?? 0
      if (spent <= 0 && inc <= 0) continue
      const meta = expenseMeta.get('uncategorized') ?? { name: 'Sin categoría', icon: '💸', color: '#888' }
      categories.push({
        id: 'uncategorized',
        name: meta.name,
        icon: meta.icon,
        color: meta.color,
        spent,
        budget: 0,
        incomeInCategory: inc,
        subcategories: [],
      })
      continue
    }
    const cat = catById.get(id)
    const spent = expenseMap.get(id) ?? 0
    const bud = budgetMap.get(id) ?? 0
    const inc = incomeMap.get(id) ?? 0
    if (!cat && spent <= 0 && bud <= 0 && inc <= 0) continue
    categories.push({
      id,
      name: cat?.name ?? expenseMeta.get(id)?.name ?? 'Categoría',
      icon: cat?.icon ?? expenseMeta.get(id)?.icon ?? '💰',
      color: cat?.color ?? expenseMeta.get(id)?.color ?? '#1A8CFF',
      spent,
      budget: bud,
      incomeInCategory: inc,
      subcategories: (() => {
        const catSubs = (cat?.subcategories ?? []).filter((s) => !excludedSubcategorySet.has(s.id))
        const expRows = expSubByCat.get(id) ?? []
        const incRows = incSubByCat.get(id) ?? []
        const byId = new Map<string, {
          id: string
          name: string
          icon: string
          color: string
          spent: number
          budget: number
          incomeInCategory: number
        }>()
        for (const r of expRows) {
          if (!r.subcategoryId) continue
          byId.set(r.subcategoryId, {
            id: r.subcategoryId,
            name: r.name,
            icon: r.icon,
            color: r.color,
            spent: roundMoney2(r.total),
            budget: roundMoney2(subBudgetMap.get(r.subcategoryId) ?? 0),
            incomeInCategory: 0,
          })
        }
        for (const s of catSubs) {
          if (byId.has(s.id)) continue
          byId.set(s.id, {
            id: s.id,
            name: s.name,
            icon: s.icon,
            color: s.color,
            spent: 0,
            budget: roundMoney2(subBudgetMap.get(s.id) ?? 0),
            incomeInCategory: 0,
          })
        }
        for (const r of incRows) {
          if (!r.subcategoryId) continue
          const prev = byId.get(r.subcategoryId)
          byId.set(r.subcategoryId, {
            id: r.subcategoryId,
            name: prev?.name ?? r.name,
            icon: prev?.icon ?? r.icon,
            color: prev?.color ?? r.color,
            spent: prev?.spent ?? 0,
            budget: prev?.budget ?? roundMoney2(subBudgetMap.get(r.subcategoryId) ?? 0),
            incomeInCategory: roundMoney2(r.total),
          })
        }
        return [...byId.values()].sort((a, b) => b.spent - a.spent || a.name.localeCompare(b.name))
      })(),
    })
  }
  categories.sort((a, b) => b.spent - a.spent || a.name.localeCompare(b.name))

  const now = new Date()
  const cy = now.getFullYear()
  const cm = String(now.getMonth() + 1).padStart(2, '0')

  const monthlyBars = summaryRows.map(row => ({
    month: row.month,
    label: monthLabelEs(row.month),
    expenses: row.expenses,
    income:   row.income,
    net:      row.net,
    isSelectedMonth: row.month === selectedMm,
    isCurrentSystemMonth: year === cy && row.month === cm,
  }))

  const yearExpenseTotal = roundMoney2(yearAvgs.expenseTotalWindow)
  const yearIncomeTotal = roundMoney2(yearAvgs.incomeTotalWindow)
  const yearlyAverageExpense = roundMoney2(yearExpenseTotal / Math.max(1, yearAvgs.expenseMonthsDivisor))
  const yearlyAverageIncome = roundMoney2(yearIncomeTotal / Math.max(1, yearAvgs.incomeMonthsDivisor))
  const yearIncomeAvgPerMonth = roundMoney2(yearIncomeTotal / Math.max(1, yearAvgs.incomeMonthsDivisor))

  const monthExpenseTotal = roundMoney2(expenseRows.reduce((s, r) => s + r.total, 0))
  const monthIncomeTotal = roundMoney2(incomeRows.reduce((s, r) => s + r.total, 0))
  const monthBudgetTotal = roundMoney2([...budgetMap.values()].reduce((s, v) => s + v, 0))

  return {
    month,
    year,
    monthlyBars,
    categories,
    totals: {
      monthExpenseTotal,
      monthIncomeTotal,
      monthBudgetTotal,
      yearlyAverageExpense,
      yearlyAverageIncome,
      bestMonthLabel: bestExpenseMonthRolling.label,
      bestMonthAmount: bestExpenseMonthRolling.amount,
      bestIncomeMonthLabel: bestIncomeMonthRolling.label,
      bestIncomeMonthAmount: bestIncomeMonthRolling.amount,
      yearExpenseTotal,
      yearIncomeTotal,
      yearIncomeAvgPerMonth,
    },
    expenseCategoryYearAvg: yearAvgs.expenseCategories,
    expenseSubcategoryYearAvg: yearAvgs.expenseSubcategories,
    incomeCategoryYearAvg: yearAvgs.incomeCategories,
    incomeSubcategoryYearAvg: yearAvgs.incomeSubcategories,
    recurringExpenses,
  }
}

/**
 * @param monthOverride `YYYY-MM` desde el cliente para alinear ingresos/gastos con el calendario del usuario.
 */
export async function dashboard(userId: string, monthOverride?: string) {
  const month = monthOverride && isYm(monthOverride)
    ? monthOverride
    : await defaultFiscalYmForUser(userId)
  const [yStr] = month.split('-')
  const y = parseInt(yStr, 10)

  const [totalBalance, allTimeTxs, categoryBreakdown, categoryIncomeBreakdown, monthlySummary, userPrefs] =
    await Promise.all([
      accountService.totalBalance(userId),
      Transaction.findAll({
        where:      { userId, isExcluded: false },
        attributes: ['type', 'amount'],
      }),
      transactionService.categoryBreakdownAllTime(userId),
      transactionService.categoryIncomeBreakdownAllTime(userId),
      transactionService.monthlySummary(userId, y),
      User.findByPk(userId, {
        attributes: [
          'id',
          'recurringSavingsPatternKeys',
          'recurringSavingsCategoryIds',
          'recurringSavingsSubcategoryIds',
          'recurringPatternCategoryOverrides',
        ],
      }),
    ])
  const yearAvgs = await transactionService.rolling12ByCategoryAndSubcategory(userId, month, {
    includeTransferPatternKeys: userPrefs?.recurringSavingsPatternKeys ?? [],
    includeTransferCategoryIds: userPrefs?.recurringSavingsCategoryIds ?? [],
    includeTransferSubcategoryIds: userPrefs?.recurringSavingsSubcategoryIds ?? [],
    patternCategoryOverrides: transactionService.buildPatternCategoryOverrideMap(userPrefs?.recurringPatternCategoryOverrides as unknown),
  })

  let income = 0, expenses = 0
  for (const tx of allTimeTxs) {
    const amt = Number(tx.amount)
    if (!Number.isFinite(amt)) continue
    if (tx.type === 'income') income += amt
    else expenses += amt
  }

  /** ingresos − gastos (los gastos incluyen movimientos negativos del extracto, p. ej. traspasos a ahorro). */
  const netCashflow = Math.round((income - expenses) * 100) / 100
  const transfersToSavings = 0

  let statementSnapshot: {
    openingSaldo: number
    closingSaldo: number
    delta: number
    firstDate: string | null
    lastDate: string | null
  } | null = null
  const stmtAccount = await Account.findOne({
    where: {
      userId,
      isActive: true,
      statementClosingSaldo: { [Op.ne]: null },
    },
    order: [['updatedAt', 'DESC']],
  })
  if (stmtAccount) {
    const o = stmtAccount.statementOpeningSaldo
    const c = stmtAccount.statementClosingSaldo
    if (o != null && c != null && Number.isFinite(o) && Number.isFinite(c)) {
      const delta = Math.round((c - o) * 100) / 100
      statementSnapshot = {
        openingSaldo: o,
        closingSaldo: c,
        delta,
        firstDate: stmtAccount.statementPeriodFirstDate ?? null,
        lastDate: stmtAccount.statementPeriodLastDate ?? null,
      }
    }
  }

  const sumYearExpenses = roundMoney2(yearAvgs.expenseTotalWindow)
  /** Misma fórmula que `monthOverview.totals.yearlyAverageExpense`: total gastos de los últimos 12 meses con datos / meses con gasto (1..12). */
  const yearlyAverageExpense = roundMoney2(
    sumYearExpenses / Math.max(1, yearAvgs.expenseMonthsDivisor),
  )

  if (process.env.DEBUG_DASHBOARD === '1') {
    const uidShort = typeof userId === 'string' ? userId.slice(0, 8) : '?'
    console.log('[stats/dashboard]', {
      userId: uidShort,
      txCount: allTimeTxs.length,
      income,
      expenses,
      transfersToSavings: 0,
      netCashflow,
      statementDelta: statementSnapshot?.delta,
      balanceAccounts: totalBalance,
      categoryRows: categoryBreakdown.length,
      month,
    })
  }

  return {
    balance: totalBalance,
    month,
    income,
    expenses,
    netCashflow,
    transfersToSavings,
    statementSnapshot,
    categoryBreakdown,
    categoryIncomeBreakdown,
    monthlySummary,
    yearlyAverageExpense,
    /** Meses fiscales del año con al menos un gasto (divisor de la media anterior). */
    expenseMonthsWithData: yearAvgs.expenseMonthsDivisor,
  }
}
