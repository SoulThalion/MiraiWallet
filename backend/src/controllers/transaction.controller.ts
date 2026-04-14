import { Request, Response, NextFunction } from 'express'
import * as txService   from '../services/transaction.service'
import * as txImport    from '../services/transaction-import.service'
import { ApiResponse }  from '../utils/ApiResponse'
import { User }         from '../models'
import { TransactionQuery } from '../types'
import { ERROR_CODES } from '../errors/error-codes'

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
export const setExcluded = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const isExcluded = Boolean((req.body as { isExcluded?: boolean }).isExcluded)
    ApiResponse.success(res, await txService.setExcluded(req.params.id, uid(req), isExcluded))
  } catch (e) { next(e) }
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

type FileReq = Request & { file?: Express.Multer.File }

export const importIngXlsx = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const f = (req as FileReq).file
    if (!f?.buffer?.length) {
      ApiResponse.error(res, 400, ERROR_CODES.IMPORT_EXCEL_READ_FAILED, 'Adjunta un archivo Excel (.xlsx) con el campo «file».')
      return
    }
    const accountId = String((req.body as { accountId?: string }).accountId ?? '').trim()
    if (!accountId) {
      ApiResponse.error(res, 400, ERROR_CODES.ACCOUNT_NOT_FOUND, 'Indica la cuenta destino (accountId).')
      return
    }
    const data = await txImport.importIngMovementsXlsx(uid(req), accountId, f.buffer)
    ApiResponse.success(res, data)
  } catch (e) { next(e) }
}

export const syncBalanceIngXlsx = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const f = (req as FileReq).file
    if (!f?.buffer?.length) {
      ApiResponse.error(res, 400, ERROR_CODES.IMPORT_EXCEL_READ_FAILED, 'Adjunta un archivo Excel (.xlsx) con el campo «file».')
      return
    }
    const accountId = String((req.body as { accountId?: string }).accountId ?? '').trim()
    if (!accountId) {
      ApiResponse.error(res, 400, ERROR_CODES.ACCOUNT_NOT_FOUND, 'Indica la cuenta destino (accountId).')
      return
    }
    const data = await txImport.syncBalanceFromIngXlsx(uid(req), accountId, f.buffer)
    ApiResponse.success(res, data)
  } catch (e) { next(e) }
}
