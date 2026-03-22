'use strict'

const { Op }                      = require('sequelize')
const { Budget, Category, Transaction } = require('../models')
const ApiError                    = require('../utils/ApiError')

/**
 * Get all budgets for a month, enriched with actual spending.
 */
async function listWithSpending(userId, month) {
  const [year, mon] = month.split('-')
  const from = `${year}-${mon}-01`
  const to   = new Date(parseInt(year), parseInt(mon), 0).toISOString().split('T')[0]

  const budgets = await Budget.findAll({
    where:   { userId, month },
    include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'icon', 'color'] }],
  })

  // Actual spending per category in this month
  const transactions = await Transaction.findAll({
    where: { userId, type: 'expense', date: { [Op.between]: [from, to] } },
    attributes: ['categoryId', 'amount'],
  })

  const spentMap = {}
  for (const tx of transactions) {
    const k = tx.categoryId ?? 'none'
    spentMap[k] = (spentMap[k] ?? 0) + parseFloat(tx.amount)
  }

  return budgets.map(b => ({
    ...b.toJSON(),
    spent:     spentMap[b.categoryId] ?? 0,
    remaining: b.amount - (spentMap[b.categoryId] ?? 0),
    pct:       b.amount > 0
                 ? Math.round(((spentMap[b.categoryId] ?? 0) / b.amount) * 100)
                 : 0,
  }))
}

/**
 * Create or update a budget for a given category + month (upsert).
 */
async function upsert(userId, { categoryId, amount, month, notes }) {
  // Verify category belongs to user
  const category = await Category.findOne({ where: { id: categoryId, userId } })
  if (!category) throw ApiError.notFound('Category')

  const [budget] = await Budget.findOrCreate({
    where:    { userId, categoryId, month },
    defaults: { userId, categoryId, amount, month, notes },
  })

  if (!budget.isNewRecord) await budget.update({ amount, notes })
  return budget
}

async function remove(id, userId) {
  const budget = await Budget.findOne({ where: { id, userId } })
  if (!budget) throw ApiError.notFound('Budget')
  await budget.destroy()
}

module.exports = { listWithSpending, upsert, remove }
