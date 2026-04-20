import { Request, Response, NextFunction } from 'express'
import * as budgetService from '../services/budget.service'
import * as recommendationService from '../services/budget-recommendation.service'
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

export const listSubcategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const month = (req.query.month as string) ?? currentMonthLocal()
    ApiResponse.success(res, await budgetService.listSubcategoryWithSpending(uid(req), month))
  } catch (e) { next(e) }
}

export const upsertSubcategory = async (req: Request, res: Response, next: NextFunction) => {
  try { ApiResponse.success(res, await budgetService.upsertSubcategory(uid(req), req.body)) } catch (e) { next(e) }
}

export const removeSubcategory = async (req: Request, res: Response, next: NextFunction) => {
  try { await budgetService.removeSubcategory(req.params.id, uid(req)); ApiResponse.noContent(res) } catch (e) { next(e) }
}

export const recommendations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const month = (req.query.month as string) ?? currentMonthLocal()
    const profile = req.query.profile as 'conservative' | 'balanced' | 'flexible' | undefined
    const targetSavingsRateRaw = req.query.targetSavingsRate as string | undefined
    const targetSavingsRate = targetSavingsRateRaw === undefined ? undefined : Number(targetSavingsRateRaw)
    ApiResponse.success(res, await recommendationService.getRecommendations(uid(req), { month, profile, targetSavingsRate }))
  } catch (e) { next(e) }
}

export const applyRecommendations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    ApiResponse.success(res, await recommendationService.applyRecommendations(uid(req), req.body))
  } catch (e) { next(e) }
}

export const pace = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const month = (req.query.month as string) ?? currentMonthLocal()
    ApiResponse.success(res, await budgetService.getBudgetPace(uid(req), month))
  } catch (e) { next(e) }
}
