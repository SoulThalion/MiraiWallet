'use strict'

/**
 * Operational API error.
 * All known HTTP errors should be thrown as ApiError so the
 * global error handler can serialize them consistently.
 */
class ApiError extends Error {
  /**
   * @param {number} statusCode  HTTP status code
   * @param {string} message     Human-readable message
   * @param {any}    [details]   Optional extra details (validation errors, etc.)
   */
  constructor(statusCode, message, details = null) {
    super(message)
    this.name       = 'ApiError'
    this.statusCode = statusCode
    this.details    = details
    Error.captureStackTrace(this, this.constructor)
  }

  // ── Factory helpers ─────────────────────────────────────
  static badRequest(message, details)  { return new ApiError(400, message, details) }
  static unauthorized(message = 'Unauthorized') { return new ApiError(401, message) }
  static forbidden(message  = 'Forbidden')      { return new ApiError(403, message) }
  static notFound(resource  = 'Resource')       { return new ApiError(404, `${resource} not found`) }
  static conflict(message)             { return new ApiError(409, message) }
  static internal(message = 'Internal server error') { return new ApiError(500, message) }
}

module.exports = ApiError
