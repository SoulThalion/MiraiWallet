import { Request, Response, NextFunction } from 'express'
import * as alertService from '../services/alert.service'
import { ApiResponse }   from '../utils/ApiResponse'
import { User }          from '../models'

type AuthReq = Request & { user: User }
const uid = (req: Request) => (req as AuthReq).user.id

export const list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows, meta } = await alertService.list(uid(req), req.query)
    ApiResponse.paginated(res, rows, meta)
  } catch (e) { next(e) }
}
export const unreadCount = async (req: Request, res: Response, next: NextFunction) => {
  try { ApiResponse.success(res, { count: await alertService.unreadCount(uid(req)) }) } catch (e) { next(e) }
}
export const markRead = async (req: Request, res: Response, next: NextFunction) => {
  try { ApiResponse.success(res, await alertService.markRead(req.params.id, uid(req))) } catch (e) { next(e) }
}
export const dismiss = async (req: Request, res: Response, next: NextFunction) => {
  try { await alertService.dismiss(req.params.id, uid(req)); ApiResponse.noContent(res) } catch (e) { next(e) }
}
export const dismissAll = async (req: Request, res: Response, next: NextFunction) => {
  try { await alertService.dismissAll(uid(req)); ApiResponse.noContent(res) } catch (e) { next(e) }
}
