import { Request, Response, NextFunction } from 'express'
import { ApiError }                        from '../utils/ApiError'
import { ApiResponse }                     from '../utils/ApiResponse'
import logger                              from '../utils/logger'

interface SequelizeError extends Error {
  errors?: Array<{ path: string; message: string }>
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ApiError) {
    ApiResponse.error(res, err.statusCode, err.message, err.details ?? undefined)
    return
  }

  const seqErr = err as SequelizeError
  if (seqErr.name === 'SequelizeValidationError' || seqErr.name === 'SequelizeUniqueConstraintError') {
    const details = seqErr.errors?.map(e => ({ field: e.path, message: e.message }))
    ApiResponse.error(res, 422, 'Validation error', details)
    return
  }

  if (seqErr.name === 'JsonWebTokenError' || seqErr.name === 'TokenExpiredError') {
    ApiResponse.error(res, 401, seqErr.message)
    return
  }

  logger.error(err)
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : (err as Error).message ?? 'Internal server error'

  ApiResponse.error(res, 500, message)
}

export function notFoundHandler(req: Request, res: Response): void {
  ApiResponse.error(res, 404, `Route ${req.method} ${req.originalUrl} not found`)
}
