import { Request, Response, NextFunction } from 'express'
import { ApiError }                        from '../utils/ApiError'
import { ApiResponse }                     from '../utils/ApiResponse'
import logger                              from '../utils/logger'
import { ERROR_CODES }                     from '../errors/error-codes'

interface SequelizeError extends Error {
  errors?: Array<{ path: string; message: string }>
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ApiError) {
    ApiResponse.error(res, err.statusCode, err.code, err.message, err.details ?? undefined)
    return
  }

  const seqErr = err as SequelizeError
  if (seqErr.name === 'SequelizeValidationError' || seqErr.name === 'SequelizeUniqueConstraintError') {
    const details = seqErr.errors?.map(e => ({ field: e.path, message: e.message }))
    ApiResponse.error(res, 422, ERROR_CODES.VALIDATION_ERROR, 'Error de validación', details)
    return
  }

  if (seqErr.name === 'JsonWebTokenError' || seqErr.name === 'TokenExpiredError') {
    ApiResponse.error(res, 401, ERROR_CODES.AUTH_TOKEN_INVALID, 'Token inválido o expirado')
    return
  }

  logger.error(err)
  const message = process.env.NODE_ENV === 'production'
    ? 'Error interno del servidor'
    : (err as Error).message ?? 'Error interno del servidor'

  ApiResponse.error(res, 500, ERROR_CODES.INTERNAL_ERROR, message)
}

export function notFoundHandler(req: Request, res: Response): void {
  ApiResponse.error(res, 404, ERROR_CODES.ROUTE_NOT_FOUND, `Ruta ${req.method} ${req.originalUrl} no encontrada`)
}
