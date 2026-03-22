'use strict'

const ApiError    = require('../utils/ApiError')
const ApiResponse = require('../utils/ApiResponse')
const logger      = require('../utils/logger')

/**
 * Global error handler — must be registered last with app.use().
 * Converts every thrown value into a consistent JSON error response.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Known operational error
  if (err instanceof ApiError) {
    return ApiResponse.error(res, err.statusCode, err.message, err.details)
  }

  // Sequelize validation errors
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    const details = err.errors?.map(e => ({ field: e.path, message: e.message }))
    return ApiResponse.error(res, 422, 'Validation error', details)
  }

  // JWT errors (shouldn't reach here if auth middleware handles them, but just in case)
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return ApiResponse.error(res, 401, err.message)
  }

  // Unknown / programming error — log and hide internals in prod
  logger.error(err)
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message

  return ApiResponse.error(res, 500, message)
}

/**
 * 404 handler — catches requests that fell through all routes.
 */
function notFoundHandler(req, res) {
  ApiResponse.error(res, 404, `Route ${req.method} ${req.originalUrl} not found`)
}

module.exports = { errorHandler, notFoundHandler }
