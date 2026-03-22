'use strict'

const { validationResult } = require('express-validator')
const ApiError             = require('../utils/ApiError')

/**
 * Reads the result of express-validator chains and throws 400 if any field failed.
 * Usage: router.post('/path', [...validatorChain], validate, controller)
 */
function validate(req, _res, next) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    const details = errors.array().map(e => ({ field: e.path, message: e.msg }))
    return next(ApiError.badRequest('Validation failed', details))
  }
  next()
}

module.exports = validate
