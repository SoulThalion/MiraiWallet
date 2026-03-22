'use strict'

const { verifyAccessToken } = require('../utils/jwt')
const { User }              = require('../models')
const ApiError              = require('../utils/ApiError')

/**
 * authenticate — verifies the Bearer token and attaches req.user.
 * Throws 401 if token is missing, malformed, expired, or the user no longer exists.
 */
async function authenticate(req, _res, next) {
  try {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) {
      throw ApiError.unauthorized('No token provided')
    }

    const token   = header.slice(7)
    const payload = verifyAccessToken(token)

    const user = await User.findByPk(payload.sub)
    if (!user || !user.isActive) {
      throw ApiError.unauthorized('User not found or inactive')
    }

    req.user = user
    next()
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return next(ApiError.unauthorized(err.message))
    }
    next(err)
  }
}

/**
 * authorize(...roles) — role-based guard, must run after authenticate.
 */
function authorize(...roles) {
  return (req, _res, next) => {
    if (!roles.includes(req.user?.role)) {
      return next(ApiError.forbidden('Insufficient permissions'))
    }
    next()
  }
}

module.exports = { authenticate, authorize }
