'use strict'

const { Alert }        = require('../models')
const ApiError         = require('../utils/ApiError')
const { parsePagination } = require('../utils/pagination')

async function list(userId, query) {
  const { page, limit, offset } = parsePagination(query, { page: 1, limit: 50 })
  const where = { userId, isDismissed: false }
  if (query.type) where.type = query.type

  const { count, rows } = await Alert.findAndCountAll({
    where,
    order:  [['createdAt', 'DESC']],
    limit,
    offset,
  })

  return { rows, total: count, page, limit }
}

async function findById(id, userId) {
  const alert = await Alert.findOne({ where: { id, userId } })
  if (!alert) throw ApiError.notFound('Alert')
  return alert
}

async function create(userId, data) {
  return Alert.create({ ...data, userId })
}

async function markRead(id, userId) {
  const alert = await findById(id, userId)
  return alert.update({ isRead: true })
}

async function dismiss(id, userId) {
  const alert = await findById(id, userId)
  return alert.update({ isDismissed: true })
}

async function dismissAll(userId) {
  await Alert.update(
    { isDismissed: true },
    { where: { userId, isDismissed: false } }
  )
}

async function unreadCount(userId) {
  return Alert.count({ where: { userId, isRead: false, isDismissed: false } })
}

module.exports = { list, findById, create, markRead, dismiss, dismissAll, unreadCount }
