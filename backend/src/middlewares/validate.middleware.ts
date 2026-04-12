import { Request, Response, NextFunction } from 'express'
import { validationResult }                from 'express-validator'
import { ApiError }                        from '../utils/ApiError'

export function validate(req: Request, _res: Response, next: NextFunction): void {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    const details = errors.array().map(e => ({ field: (e as { path: string }).path, message: e.msg }))
    next(ApiError.badRequest('Validation failed', details))
    return
  }
  next()
}
