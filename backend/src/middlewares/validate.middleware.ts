import { Request, Response, NextFunction } from 'express'
import { validationResult }                from 'express-validator'
import { ApiError }                        from '../utils/ApiError'
import { ERROR_CODES }                     from '../errors/error-codes'

export function validate(req: Request, _res: Response, next: NextFunction): void {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    const details = errors.array().map(e => ({ field: (e as { path: string }).path, message: e.msg }))
    next(ApiError.badRequest(ERROR_CODES.VALIDATION_FAILED, 'Validación de request fallida', details))
    return
  }
  next()
}
