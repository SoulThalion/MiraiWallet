import { Request, Response, NextFunction } from 'express'
import { verifyAccessToken }               from '../utils/jwt'
import { User }                            from '../models'
import { ApiError }                        from '../utils/ApiError'
import { UserRole }                        from '../types'

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) throw ApiError.unauthorized('No token provided')

    const token   = header.slice(7)
    const payload = verifyAccessToken(token)

    const user = await User.findByPk(payload.sub)
    if (!user || !user.isActive) throw ApiError.unauthorized('User not found or inactive')

    ;(req as Request & { user: User }).user = user
    next()
  } catch (err: unknown) {
    const name = (err as Error).name
    if (name === 'JsonWebTokenError' || name === 'TokenExpiredError') {
      next(ApiError.unauthorized((err as Error).message))
    } else {
      next(err)
    }
  }
}

export function authorize(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = (req as Request & { user: User }).user
    if (!roles.includes(user?.role as UserRole)) {
      next(ApiError.forbidden('Insufficient permissions'))
    } else {
      next()
    }
  }
}
