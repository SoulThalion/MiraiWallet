import { Request, Response, NextFunction } from 'express'
import * as txService   from '../services/transaction.service'
import { ApiResponse }  from '../utils/ApiResponse'
import { User }         from '../models'
import { TransactionQuery } from '../types'

type AuthReq = Request & { user: User }
const uid = (req: Request) => (req as AuthReq).user.id

export const list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows, meta } = await txService.list(uid(req), req.query as TransactionQuery)
    ApiResponse.paginated(res, rows, meta)
  } catch (e) { next(e) }
}
export const getOne = async (req: Request, res: Response, next: NextFunction) => {
  try { ApiResponse.success(res, await txService.findById(req.params.id, uid(req))) } catch (e) { next(e) }
}
export const create = async (req: Request, res: Response, next: NextFunction) => {
  try { ApiResponse.created(res, await txService.create(uid(req), req.body)) } catch (e) { next(e) }
}
export const update = async (req: Request, res: Response, next: NextFunction) => {
  try { ApiResponse.success(res, await txService.update(req.params.id, uid(req), req.body)) } catch (e) { next(e) }
}
export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try { await txService.remove(req.params.id, uid(req)); ApiResponse.noContent(res) } catch (e) { next(e) }
}
export const monthlySummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const year = parseInt((req.query.year as string) ?? String(new Date().getFullYear()), 10)
    ApiResponse.success(res, await txService.monthlySummary(uid(req), year))
  } catch (e) { next(e) }
}
export const categoryBreakdown = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const month = (req.query.month as string) ?? new Date().toISOString().slice(0, 7)
    ApiResponse.success(res, await txService.categoryBreakdown(uid(req), month))
  } catch (e) { next(e) }
}
