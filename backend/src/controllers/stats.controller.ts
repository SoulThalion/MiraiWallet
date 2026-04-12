import { Request, Response, NextFunction } from 'express'
import * as statsService from '../services/stats.service'
import { ApiResponse }   from '../utils/ApiResponse'
import { User }          from '../models'

export const dashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as Request & { user: User }).user.id
    ApiResponse.success(res, await statsService.dashboard(userId))
  } catch (e) { next(e) }
}
