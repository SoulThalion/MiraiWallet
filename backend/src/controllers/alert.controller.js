'use strict'

const alertService = require('../services/alert.service')
const ApiResponse  = require('../utils/ApiResponse')

async function list(req, res, next) {
  try {
    const { rows, total, page, limit } = await alertService.list(req.user.id, req.query)
    ApiResponse.paginated(res, rows, { page, limit, total })
  } catch (err) { next(err) }
}

async function unreadCount(req, res, next) {
  try {
    const count = await alertService.unreadCount(req.user.id)
    ApiResponse.success(res, { count })
  } catch (err) { next(err) }
}

async function markRead(req, res, next) {
  try {
    const alert = await alertService.markRead(req.params.id, req.user.id)
    ApiResponse.success(res, alert)
  } catch (err) { next(err) }
}

async function dismiss(req, res, next) {
  try {
    await alertService.dismiss(req.params.id, req.user.id)
    ApiResponse.noContent(res)
  } catch (err) { next(err) }
}

async function dismissAll(req, res, next) {
  try {
    await alertService.dismissAll(req.user.id)
    ApiResponse.noContent(res)
  } catch (err) { next(err) }
}

module.exports = { list, unreadCount, markRead, dismiss, dismissAll }
