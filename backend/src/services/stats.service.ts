import { Op } from 'sequelize'
import { Account, Transaction } from '../models'
import * as accountService     from './account.service'
import * as transactionService from './transaction.service'

function isYm(s: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(s)
}

/**
 * @param monthOverride `YYYY-MM` desde el cliente para alinear ingresos/gastos con el calendario del usuario.
 */
export async function dashboard(userId: string, monthOverride?: string) {
  const now = new Date()
  const month = monthOverride && isYm(monthOverride)
    ? monthOverride
    : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
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
