'use strict'

const { Op }                        = require('sequelize')
const { Transaction, Account, Category } = require('../models')
const ApiError                      = require('../utils/ApiError')
const { parsePagination }           = require('../utils/pagination')

async function list(userId, query) {
  const { page, limit, offset } = parsePagination(query)

  const where = { userId }
  if (query.type)       where.type       = query.type
  if (query.accountId)  where.accountId  = query.accountId
  if (query.categoryId) where.categoryId = query.categoryId
  if (query.from || query.to) {
    where.date = {}
    if (query.from) where.date[Op.gte] = query.from
    if (query.to)   where.date[Op.lte] = query.to
  }

  const { count, rows } = await Transaction.findAndCountAll({
    where,
    limit,
    offset,
    order:   [['date', 'DESC'], ['createdAt', 'DESC']],
    include: [
      { model: Account,  as: 'account',  attributes: ['id', 'name', 'color'] },
      { model: Category, as: 'category', attributes: ['id', 'name', 'icon', 'color'] },
    ],
  })

  return { rows, total: count, page, limit }
}

async function findById(id, userId) {
  const tx = await Transaction.findOne({
    where:   { id, userId },
    include: [
      { model: Account,  as: 'account',  attributes: ['id', 'name', 'color'] },
      { model: Category, as: 'category', attributes: ['id', 'name', 'icon', 'color'] },
    ],
  })
  if (!tx) throw ApiError.notFound('Transaction')
  return tx
}

async function create(userId, data) {
  // Verify account belongs to user
  const account = await Account.findOne({ where: { id: data.accountId, userId, isActive: true } })
  if (!account) throw ApiError.notFound('Account')

  const tx = await Transaction.create({ ...data, userId })

  // Adjust account balance
  const delta = data.type === 'income' ? data.amount : -data.amount
  await account.update({ balance: parseFloat(account.balance) + parseFloat(delta) })

  return findById(tx.id, userId)
}

async function update(id, userId, data) {
  const tx = await findById(id, userId)

  // If amount or type changed, revert old balance effect then apply new
  if (data.amount !== undefined || data.type !== undefined) {
    const account  = await Account.findByPk(tx.accountId)
    const oldDelta = tx.type === 'income' ? tx.amount : -tx.amount
    const newAmount = data.amount ?? tx.amount
    const newType   = data.type   ?? tx.type
    const newDelta  = newType === 'income' ? newAmount : -newAmount
    await account.update({ balance: parseFloat(account.balance) - oldDelta + parseFloat(newDelta) })
  }

  await tx.update(data)
  return findById(id, userId)
}

async function remove(id, userId) {
  const tx = await findById(id, userId)

  // Revert balance
  const account = await Account.findByPk(tx.accountId)
  const delta   = tx.type === 'income' ? -tx.amount : tx.amount
  await account.update({ balance: parseFloat(account.balance) + parseFloat(delta) })

  await tx.destroy()
}

/**
 * Monthly summary — total income, expenses and net per month for a given year.
 */
async function monthlySummary(userId, year) {
  const transactions = await Transaction.findAll({
    where: {
      userId,
      date: {
        [Op.between]: [`${year}-01-01`, `${year}-12-31`],
      },
    },
    attributes: ['type', 'amount', 'date'],
  })

  const months = Array.from({ length: 12 }, (_, i) => ({
    month:    String(i + 1).padStart(2, '0'),
    income:   0,
    expenses: 0,
  }))

  for (const tx of transactions) {
    const m = new Date(tx.date).getMonth()
    if (tx.type === 'income')  months[m].income   += parseFloat(tx.amount)
    if (tx.type === 'expense') months[m].expenses += parseFloat(tx.amount)
  }

  return months.map(m => ({ ...m, net: m.income - m.expenses }))
}

/**
 * Spending by category for a given month (YYYY-MM).
 */
async function categoryBreakdown(userId, month) {
  const [year, mon] = month.split('-')
  const from = `${year}-${mon}-01`
  const to   = new Date(year, parseInt(mon), 0).toISOString().split('T')[0]

  const transactions = await Transaction.findAll({
    where: { userId, type: 'expense', date: { [Op.between]: [from, to] } },
    include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'icon', 'color'] }],
  })

  const map = {}
  for (const tx of transactions) {
    const key = tx.categoryId ?? 'uncategorized'
    if (!map[key]) {
      map[key] = {
        categoryId: tx.categoryId,
        name:       tx.category?.name  ?? 'Sin categoría',
        icon:       tx.category?.icon  ?? '💸',
        color:      tx.category?.color ?? '#888',
        total:      0,
      }
    }
    map[key].total += parseFloat(tx.amount)
  }

  return Object.values(map).sort((a, b) => b.total - a.total)
}

module.exports = { list, findById, create, update, remove, monthlySummary, categoryBreakdown }
