import { Op } from 'sequelize'
import { Account, Budget, Category, RecurringPatternDismissal, Subcategory, Transaction, User } from '../models'
import * as accountService     from './account.service'
import * as transactionService from './transaction.service'
import type { StatsMonthOverviewDto, StatsRecurringExpenseDto } from '../types'
import { dateToFiscalYm, getMonthCycleConfigForUser, toDateOnlyString, ymToDateBounds } from '../utils/monthPeriod'
import { ApiError } from '../utils/ApiError'

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

function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

/**
 * Clave estable para agrupar: quita prefijos típicos del banco («Pago en…»), puntuación y mayúsculas
 * para que «Pago en NETFLIX.COM» y variaciones parecidas coincidan.
 */
function normalizeRecurringDescriptionKey(raw: string): string {
  let s = stripDiacritics(raw.trim()).replace(/\s+/g, ' ').toLowerCase()
  s = s.replace(
    /^(pago en|pago a|pago por|compra en|compra a|compra con|cargo en|cargo de|transferencia a|bizum a|bizum de|recibo de|domiciliacion|domiciliación)\s+/i,
    '',
  )
  s = s.replace(/[^a-z0-9]+/g, ' ')
  return s.replace(/\s+/g, ' ').trim()
}

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

/**
 * Agrupa gastos con la misma categoría, subcategoría, concepto (insensible a mayúsculas y espacios),
 * importe y día del mes; solo incluye grupos con ≥2 apariciones en ≥2 meses naturales distintos.
 */
function calendarYmToday(d = new Date()): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`
}

async function findRecurringExpensePatterns(userId: string): Promise<StatsRecurringExpenseDto[]> {
  const user = await User.findByPk(userId, {
    attributes: ['id', 'recurringExcludedCategoryIds', 'recurringExcludedSubcategoryIds'],
  })
  const rawExcludedCat = user?.recurringExcludedCategoryIds as unknown
  const excludedCategorySet = new Set<string>(
    Array.isArray(rawExcludedCat) ? rawExcludedCat.map(x => String(x)).filter(Boolean) : [],
  )
  const rawExcludedSub = user?.recurringExcludedSubcategoryIds as unknown
  const excludedSubcategorySet = new Set<string>(
    Array.isArray(rawExcludedSub) ? rawExcludedSub.map(x => String(x)).filter(Boolean) : [],
  )

  const dismissRows = await RecurringPatternDismissal.findAll({
    where: { userId },
    attributes: ['patternKey', 'dismissedYm'],
  })
  const dismissalMap = new Map(dismissRows.map(r => [r.patternKey, r.dismissedYm]))

  const since = new Date()
  since.setMonth(since.getMonth() - RECURRING_LOOKBACK_MONTHS)
  const fromYmd = `${since.getFullYear()}-${pad2(since.getMonth() + 1)}-${pad2(since.getDate())}`

  const txs = await Transaction.findAll({
    where: { userId, isExcluded: false, type: 'expense', date: { [Op.gte]: fromYmd } },
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
    out.push({
      categoryId:       first.categoryId ?? null,
      subcategoryId:    first.subcategoryId ?? null,
      categoryName:     first.category?.name ?? 'Sin categoría',
      subcategoryName:  first.subcategory?.name ?? null,
      categoryIcon:     first.category?.icon ?? '💸',
      categoryColor:    first.category?.color ?? '#888',
      description:      first.description.trim().replace(/\s+/g, ' '),
      amount:           roundMoney2(Math.abs(Number(first.amount))),
      dayOfMonth:       day,
      occurrenceCount:  acc.txs.length,
      distinctMonthCount: acc.months.size,
      firstDate,
      lastDate,
      patternKey,
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

/**
 * Oculta un patrón recurrente hasta que exista un movimiento en un mes natural **posterior**
 * al mes calendario en que se descartó (`dismissedYm`). No borra transacciones.
 */
export async function dismissRecurringPattern(userId: string, patternKeyRaw: string): Promise<void> {
  const patternKey = patternKeyRaw.trim().slice(0, 400)
  if (!patternKey) throw ApiError.badRequest('patternKey es obligatorio')

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

  const [summaryRows, expenseRows, incomeRows, allCategories, budgets, yearAvgs, recurringExpenses, monthCycleCfg] =
    await Promise.all([
      transactionService.monthlySummary(userId, year),
      transactionService.categoryBreakdown(userId, month),
      transactionService.categoryIncomeBreakdownMonth(userId, month),
      Category.findAll({ where: { userId }, order: [['name', 'ASC']] }),
      Budget.findAll({ where: { userId, month } }),
      transactionService.fiscalYearAvgByCategoryAndSubcategory(userId, year),
      findRecurringExpensePatterns(userId),
      getMonthCycleConfigForUser(userId),
    ])

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
    })
  }
  categories.sort((a, b) => b.spent - a.spent || a.name.localeCompare(b.name))

  const now = new Date()
  const cy = now.getFullYear()
  const cm = String(now.getMonth() + 1).padStart(2, '0')
  const todayYmd = `${cy}-${cm}-${pad2(now.getDate())}`

  /** Meses del año fiscal ya iniciados (excluye meses futuros con gasto 0 artificial). */
  const startedMonths = summaryRows.filter((row) => {
    try {
      const { from } = ymToDateBounds(`${year}-${row.month}`, monthCycleCfg)
      return from <= todayYmd
    } catch {
      return true
    }
  })
  /** Preferir meses con al menos un movimiento (gasto o ingreso); si no hay ninguno, usar solo «ya iniciados». */
  const withMovement = startedMonths.filter((r) => r.expenses > 0 || r.income > 0)
  const poolForBestMonth = withMovement.length > 0 ? withMovement : startedMonths

  let bestRow = summaryRows[0]!
  if (poolForBestMonth.length > 0) {
    bestRow = poolForBestMonth[0]!
    for (const row of poolForBestMonth.slice(1)) {
      const m = parseInt(row.month, 10)
      const bestM = parseInt(bestRow.month, 10)
      if (row.expenses < bestRow.expenses || (row.expenses === bestRow.expenses && m < bestM)) {
        bestRow = row
      }
    }
  }

  const monthlyBars = summaryRows.map(row => ({
    month: row.month,
    label: monthLabelEs(row.month),
    expenses: row.expenses,
    income:   row.income,
    net:      row.net,
    isSelectedMonth: row.month === selectedMm,
    isCurrentSystemMonth: year === cy && row.month === cm,
  }))

  let sumExp = 0
  let sumInc = 0
  for (const row of summaryRows) {
    sumExp += row.expenses
    sumInc += row.income
  }
  const yearExpenseTotal = roundMoney2(sumExp)
  const yearIncomeTotal = roundMoney2(sumInc)
  const yearlyAverageExpense = roundMoney2(sumExp / Math.max(1, yearAvgs.expenseMonthsDivisor))
  const yearIncomeAvgPerMonth = roundMoney2(sumInc / Math.max(1, yearAvgs.incomeMonthsDivisor))

  const monthExpenseTotal = roundMoney2(expenseRows.reduce((s, r) => s + r.total, 0))
  const monthBudgetTotal = roundMoney2([...budgetMap.values()].reduce((s, v) => s + v, 0))

  return {
    month,
    year,
    monthlyBars,
    categories,
    totals: {
      monthExpenseTotal,
      monthBudgetTotal,
      yearlyAverageExpense,
      bestMonthLabel: monthLabelEs(bestRow.month),
      bestMonthAmount: bestRow.expenses,
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

  const [totalBalance, allTimeTxs, categoryBreakdown, categoryIncomeBreakdown, monthlySummary, yearAvgs] =
    await Promise.all([
      accountService.totalBalance(userId),
      Transaction.findAll({
        where:      { userId, isExcluded: false },
        attributes: ['type', 'amount'],
      }),
      transactionService.categoryBreakdownAllTime(userId),
      transactionService.categoryIncomeBreakdownAllTime(userId),
      transactionService.monthlySummary(userId, y),
      transactionService.fiscalYearAvgByCategoryAndSubcategory(userId, y),
    ])

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

  let sumYearExpenses = 0
  for (const row of monthlySummary) {
    sumYearExpenses += row.expenses
  }
  sumYearExpenses = roundMoney2(sumYearExpenses)
  /** Misma fórmula que `monthOverview.totals.yearlyAverageExpense`: total gastos del año / meses con ≥1 gasto (sin meses futuros en el año en curso). */
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
