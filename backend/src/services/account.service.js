'use strict'

const { Account } = require('../models')
const ApiError    = require('../utils/ApiError')

async function list(userId) {
  return Account.findAll({
    where:   { userId, isActive: true },
    order:   [['createdAt', 'ASC']],
  })
}

async function findById(id, userId) {
  const account = await Account.findOne({ where: { id, userId } })
  if (!account) throw ApiError.notFound('Account')
  return account
}

async function create(userId, data) {
  return Account.create({ ...data, userId })
}

async function update(id, userId, data) {
  const account = await findById(id, userId)
  return account.update(data)
}

async function remove(id, userId) {
  const account = await findById(id, userId)
  // Soft delete — keep records for reporting
  await account.update({ isActive: false })
}

async function totalBalance(userId) {
  const accounts = await Account.findAll({ where: { userId, isActive: true } })
  return accounts.reduce((sum, a) => sum + a.balance, 0)
}

module.exports = { list, findById, create, update, remove, totalBalance }
