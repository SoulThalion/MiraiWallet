import { ERROR_CODES, type ErrorCode } from '../errors/error-codes'

export class ApiError extends Error {
  public readonly statusCode: number
  public readonly code: ErrorCode
  public readonly details:    unknown | null

  constructor(statusCode: number, code: ErrorCode, message: string, details: unknown = null) {
    super(message)
    this.name       = 'ApiError'
    this.statusCode = statusCode
    this.code       = code
    this.details    = details
    Error.captureStackTrace(this, this.constructor)
  }

  static badRequest  (code: ErrorCode, message: string, details?: unknown): ApiError { return new ApiError(400, code, message, details) }
  static unauthorized(code: ErrorCode, message = 'No autorizado'):           ApiError { return new ApiError(401, code, message) }
  static forbidden   (code: ErrorCode, message = 'Prohibido'):               ApiError { return new ApiError(403, code, message) }
  static notFound    (code: ErrorCode, resource = 'Recurso'):                ApiError { return new ApiError(404, code, `${resource} no encontrado`) }
  static conflict    (code: ErrorCode, message: string):                     ApiError { return new ApiError(409, code, message) }
  static internal    (code: ErrorCode, message = 'Error interno del servidor'): ApiError { return new ApiError(500, code, message) }
  static unknown(message = 'Error interno del servidor'): ApiError {
    return new ApiError(500, ERROR_CODES.INTERNAL_ERROR, message)
  }
}
