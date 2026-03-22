'use strict'

const { Op }                               = require('sequelize')
const { Transaction, Account, Category }   = require('../models')
const accountService                       = require('./account.service')
const transactionService                   = require('./transaction.service')

/**
 * Dashboard summary — balance, monthly income/expenses, top categories.
 */
async function dashboard(userId) {
  const now      = new Date()
  const month    = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const from     = `${month}-01`
  const lastDay  = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const to       = `${month}-${lastDay}`

  const [totalBalance, monthlyTx] = await Promise.all([
    accountService.totalBalance(userId),
    Transaction.findAll({
      where:      { userId, date: { [Op.between]: [from, to] } },
      attributes: ['type', 'amount'],
    }),
  ])

  let income   = 0
  let expenses = 0
  for (const tx of monthlyTx) {
    if (tx.type === 'income')  income   += parseFloat(tx.amount)
    if (tx.type === 'expense') expenses += parseFloat(tx.amount)
  }

  const [categoryBreakdown, monthlySummary] = await Promise.all([
    transactionService.categoryBreakdown(userId, month),
    transactionService.monthlySummary(userId, now.getFullYear()),
  ])

  return {
    balance:          totalBalance,
    month,
    income,
    expenses,
    saved:            income - expenses,
    categoryBreakdown,
    monthlySummary,
  }
}

module.exports = { dashboard }
