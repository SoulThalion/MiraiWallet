'use strict'

const budgetService = require('../services/budget.service')
const ApiResponse   = require('../utils/ApiResponse')

async function list(req, res, next) {
  try {
    const month   = req.query.month ?? new Date().toISOString().slice(0, 7)
    const budgets = await budgetService.listWithSpending(req.user.id, month)
    ApiResponse.success(res, budgets)
  } catch (err) { next(err) }
}

async function upsert(req, res, next) {
  try {
    const budget = await budgetService.upsert(req.user.id, req.body)
    ApiResponse.success(res, budget)
  } catch (err) { next(err) }
}

async function remove(req, res, next) {
  try {
    await budgetService.remove(req.params.id, req.user.id)
    ApiResponse.noContent(res)
  } catch (err) { next(err) }
}

module.exports = { list, upsert, remove }
