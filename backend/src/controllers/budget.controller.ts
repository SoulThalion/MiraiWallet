import { Request, Response, NextFunction } from 'express'
import * as budgetService from '../services/budget.service'
import { ApiResponse }    from '../utils/ApiResponse'
import { User }           from '../models'

type AuthReq = Request & { user: User }
const uid = (req: Request) => (req as AuthReq).user.id

export const list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const month = (req.query.month as string) ?? new Date().toISOString().slice(0, 7)
    ApiResponse.success(res, await budgetService.listWithSpending(uid(req), month))
  } catch (e) { next(e) }
}
export const upsert = async (req: Request, res: Response, next: NextFunction) => {
  try { ApiResponse.success(res, await budgetService.upsert(uid(req), req.body)) } catch (e) { next(e) }
}
export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try { await budgetService.remove(req.params.id, uid(req)); ApiResponse.noContent(res) } catch (e) { next(e) }
}
