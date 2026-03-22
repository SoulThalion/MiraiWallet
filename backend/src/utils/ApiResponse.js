'use strict'

/**
 * Standardises every JSON response.
 *
 * Success shape:
 *   { success: true,  data: <payload>, meta: <optional pagination> }
 *
 * Error shape:
 *   { success: false, error: { message, details } }
 */
class ApiResponse {
  static success(res, data = null, statusCode = 200, meta = null) {
    const body = { success: true, data }
    if (meta) body.meta = meta
    return res.status(statusCode).json(body)
  }

  static created(res, data) {
    return ApiResponse.success(res, data, 201)
  }

  static noContent(res) {
    return res.status(204).send()
  }

  static error(res, statusCode, message, details = null) {
    const body = { success: false, error: { message } }
    if (details) body.error.details = details
    return res.status(statusCode).json(body)
  }

  static paginated(res, data, { page, limit, total }) {
    const totalPages = Math.ceil(total / limit)
    return ApiResponse.success(res, data, 200, {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    })
  }
}

module.exports = ApiResponse
