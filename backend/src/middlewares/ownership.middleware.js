'use strict'

const ApiError = require('../utils/ApiError')

/**
 * Generates a middleware that fetches a model by :id param and
 * verifies it belongs to the authenticated user.
 *
 * Usage:
 *   router.get('/:id', authenticate, ownsResource(Account), controller)
 *
 * After passing, req.resource holds the found instance.
 */
function ownsResource(Model, paramName = 'id') {
  return async (req, _res, next) => {
    try {
      const resource = await Model.findByPk(req.params[paramName])
      if (!resource) return next(ApiError.notFound(Model.name))

      // Admins can access any resource
      if (req.user.role === 'admin') {
        req.resource = resource
        return next()
      }

      if (resource.userId !== req.user.id) {
        return next(ApiError.forbidden())
      }

      req.resource = resource
      next()
    } catch (err) {
      next(err)
    }
  }
}

module.exports = ownsResource
