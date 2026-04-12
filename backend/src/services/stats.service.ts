import { Op } from 'sequelize'
import { Account, Budget, Category, Transaction } from '../models'
import * as accountService     from './account.service'
import * as transactionService from './transaction.service'
import type { StatsMonthOverviewDto } from '../types'
import { dateToFiscalYm, getMonthCycleConfigForUser } from '../utils/monthPeriod'

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

  const [summaryRows, expenseRows, incomeRows, allCategories, budgets] = await Promise.all([
    transactionService.monthlySummary(userId, year),
    transactionService.categoryBreakdown(userId, month),
    transactionService.categoryIncomeBreakdownMonth(userId, month),
    Category.findAll({ where: { userId }, order: [['name', 'ASC']] }),
    Budget.findAll({ where: { userId, month } }),
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
  for (const row of summaryRows) sumExp += row.expenses
  const yearlyAverageExpense = roundMoney2(sumExp / 12)

  let bestIdx = 0
  let bestVal = Infinity
  summaryRows.forEach((row, i) => {
    if (row.expenses < bestVal) {
      bestVal = row.expenses
      bestIdx = i
    }
  })
  const bestRow = summaryRows[bestIdx]!

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
    },
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

  const [totalBalance, allTimeTxs, categoryBreakdown, categoryIncomeBreakdown, monthlySummary] =
    await Promise.all([
      accountService.totalBalance(userId),
      Transaction.findAll({
        where:      { userId },
        attributes: ['type', 'amount'],
      }),
      transactionService.categoryBreakdownAllTime(userId),
      transactionService.categoryIncomeBreakdownAllTime(userId),
      transactionService.monthlySummary(userId, y),
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
  }
}
