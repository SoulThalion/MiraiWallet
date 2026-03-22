'use strict'

const transactionService = require('../services/transaction.service')
const ApiResponse        = require('../utils/ApiResponse')

async function list(req, res, next) {
  try {
    const { rows, total, page, limit } = await transactionService.list(req.user.id, req.query)
    ApiResponse.paginated(res, rows, { page, limit, total })
  } catch (err) { next(err) }
}

async function getOne(req, res, next) {
  try {
    const tx = await transactionService.findById(req.params.id, req.user.id)
    ApiResponse.success(res, tx)
  } catch (err) { next(err) }
}

async function create(req, res, next) {
  try {
    const tx = await transactionService.create(req.user.id, req.body)
    ApiResponse.created(res, tx)
  } catch (err) { next(err) }
}

async function update(req, res, next) {
  try {
    const tx = await transactionService.update(req.params.id, req.user.id, req.body)
    ApiResponse.success(res, tx)
  } catch (err) { next(err) }
}

async function remove(req, res, next) {
  try {
    await transactionService.remove(req.params.id, req.user.id)
    ApiResponse.noContent(res)
  } catch (err) { next(err) }
}

async function monthlySummary(req, res, next) {
  try {
    const year    = parseInt(req.query.year ?? new Date().getFullYear(), 10)
    const summary = await transactionService.monthlySummary(req.user.id, year)
    ApiResponse.success(res, summary)
  } catch (err) { next(err) }
}

async function categoryBreakdown(req, res, next) {
  try {
    const month = req.query.month ?? new Date().toISOString().slice(0, 7)
    const data  = await transactionService.categoryBreakdown(req.user.id, month)
    ApiResponse.success(res, data)
  } catch (err) { next(err) }
}

module.exports = { list, getOne, create, update, remove, monthlySummary, categoryBreakdown }
