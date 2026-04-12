import { Op }           from 'sequelize'
import { Transaction }  from '../models'
import * as accountService     from './account.service'
import * as transactionService from './transaction.service'

export async function dashboard(userId: string) {
  const now     = new Date()
  const month   = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const from    = `${month}-01`
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const to      = `${month}-${String(lastDay).padStart(2, '0')}`

  const [totalBalance, monthlyTxs] = await Promise.all([
    accountService.totalBalance(userId),
    Transaction.findAll({
      where:      { userId, date: { [Op.between]: [from, to] } },
      attributes: ['type', 'amount'],
    }),
  ])

  let income = 0, expenses = 0
  for (const tx of monthlyTxs) {
    if (tx.type === 'income')  income   += tx.amount
    if (tx.type === 'expense') expenses += tx.amount
  }

  const [categoryBreakdown, monthlySummary] = await Promise.all([
    transactionService.categoryBreakdown(userId, month),
    transactionService.monthlySummary(userId, now.getFullYear()),
  ])

  return { balance: totalBalance, month, income, expenses, saved: income - expenses, categoryBreakdown, monthlySummary }
}
