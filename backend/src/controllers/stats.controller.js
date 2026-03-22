'use strict'

const statsService = require('../services/stats.service')
const ApiResponse  = require('../utils/ApiResponse')

async function dashboard(req, res, next) {
  try {
    const data = await statsService.dashboard(req.user.id)
    ApiResponse.success(res, data)
  } catch (err) { next(err) }
}

module.exports = { dashboard }
