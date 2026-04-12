import { Request, Response, NextFunction } from 'express'
import * as budgetService from '../services/budget.service'
import { ApiResponse }    from '../utils/ApiResponse'
import { User }           from '../models'

type AuthReq = Request & { user: User }
const uid = (req: Request) => (req as AuthReq).user.id

function currentMonthLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export const list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const month = (req.query.month as string) ?? currentMonthLocal()
    ApiResponse.success(res, await budgetService.listWithSpending(uid(req), month))
  } catch (e) { next(e) }
}
export const upsert = async (req: Request, res: Response, next: NextFunction) => {
  try { ApiResponse.success(res, await budgetService.upsert(uid(req), req.body)) } catch (e) { next(e) }
}
export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try { await budgetService.remove(req.params.id, uid(req)); ApiResponse.noContent(res) } catch (e) { next(e) }
}
