import { Request, Response, NextFunction } from 'express'
import * as statsService from '../services/stats.service'
import { ApiResponse }   from '../utils/ApiResponse'
import { User }          from '../models'

export const dashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as Request & { user: User }).user.id
    const month = typeof req.query.month === 'string' ? req.query.month : undefined
    ApiResponse.success(res, await statsService.dashboard(userId, month))
  } catch (e) { next(e) }
}

export const monthOverview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as Request & { user: User }).user.id
    const month = typeof req.query.month === 'string' ? req.query.month : undefined
    ApiResponse.success(res, await statsService.monthOverview(userId, month))
  } catch (e) { next(e) }
}

export const dismissRecurringPattern = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as Request & { user: User }).user.id
    const patternKey = typeof req.body?.patternKey === 'string' ? req.body.patternKey : ''
    await statsService.dismissRecurringPattern(userId, patternKey)
    ApiResponse.noContent(res)
  } catch (e) { next(e) }
}
