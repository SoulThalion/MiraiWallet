import { Request, Response, NextFunction } from 'express'
import * as categoryService from '../services/category.service'
import { ApiResponse }      from '../utils/ApiResponse'
import { User }             from '../models'

type AuthReq = Request & { user: User }
const uid = (req: Request) => (req as AuthReq).user.id

export const list   = async (req: Request, res: Response, next: NextFunction) => {
  try { ApiResponse.success(res, await categoryService.list(uid(req))) } catch (e) { next(e) }
}
export const getOne = async (req: Request, res: Response, next: NextFunction) => {
  try { ApiResponse.success(res, await categoryService.findById(req.params.id, uid(req))) } catch (e) { next(e) }
}
export const create = async (req: Request, res: Response, next: NextFunction) => {
  try { ApiResponse.created(res, await categoryService.create(uid(req), req.body)) } catch (e) { next(e) }
}
export const update = async (req: Request, res: Response, next: NextFunction) => {
  try { ApiResponse.success(res, await categoryService.update(req.params.id, uid(req), req.body)) } catch (e) { next(e) }
}
export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try { await categoryService.remove(req.params.id, uid(req)); ApiResponse.noContent(res) } catch (e) { next(e) }
}
