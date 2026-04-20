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

export const setRecurringPatternSavings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as Request & { user: User }).user.id
    const patternKey = typeof req.body?.patternKey === 'string' ? req.body.patternKey : ''
    const isSavings = Boolean(req.body?.isSavings)
    await statsService.setRecurringPatternSavings(userId, patternKey, isSavings)
    ApiResponse.noContent(res)
  } catch (e) { next(e) }
}

export const setRecurringPatternCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as Request & { user: User }).user.id
    const patternKey = typeof req.body?.patternKey === 'string' ? req.body.patternKey : ''
    const categoryId = typeof req.body?.categoryId === 'string' ? req.body.categoryId : null
    const subcategoryId = typeof req.body?.subcategoryId === 'string' ? req.body.subcategoryId : null
    await statsService.setRecurringPatternCategory(userId, patternKey, categoryId, subcategoryId)
    ApiResponse.noContent(res)
  } catch (e) { next(e) }
}

export const listRecurringManualRules = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as Request & { user: User }).user.id
    ApiResponse.success(res, await statsService.listRecurringManualRules(userId))
  } catch (e) { next(e) }
}

export const createRecurringManualRule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as Request & { user: User }).user.id
    ApiResponse.success(res, await statsService.createRecurringManualRule(userId, req.body ?? {}))
  } catch (e) { next(e) }
}

export const updateRecurringManualRule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as Request & { user: User }).user.id
    const ruleId = typeof req.params?.ruleId === 'string' ? req.params.ruleId : ''
    ApiResponse.success(res, await statsService.updateRecurringManualRule(userId, ruleId, req.body ?? {}))
  } catch (e) { next(e) }
}

export const deleteRecurringManualRule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as Request & { user: User }).user.id
    const ruleId = typeof req.params?.ruleId === 'string' ? req.params.ruleId : ''
    await statsService.deleteRecurringManualRule(userId, ruleId)
    ApiResponse.noContent(res)
  } catch (e) { next(e) }
}

export const forecastSimulate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as Request & { user: User }).user.id
    const month = String(req.query.month ?? '')
    const pct = req.query.expenseMultiplierPct != null ? Number(req.query.expenseMultiplierPct) : 0
    ApiResponse.success(res, await statsService.simulateExpenseForecast(userId, month, pct))
  } catch (e) { next(e) }
}

export const listPlannedCommitments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as Request & { user: User }).user.id
    ApiResponse.success(res, await statsService.listPlannedCommitments(userId))
  } catch (e) { next(e) }
}

export const createPlannedCommitment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as Request & { user: User }).user.id
    ApiResponse.success(res, await statsService.createPlannedCommitment(userId, req.body ?? {}))
  } catch (e) { next(e) }
}

export const updatePlannedCommitment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as Request & { user: User }).user.id
    const commitmentId = typeof req.params?.commitmentId === 'string' ? req.params.commitmentId : ''
    ApiResponse.success(res, await statsService.updatePlannedCommitment(userId, commitmentId, req.body ?? {}))
  } catch (e) { next(e) }
}

export const deletePlannedCommitment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as Request & { user: User }).user.id
    const commitmentId = typeof req.params?.commitmentId === 'string' ? req.params.commitmentId : ''
    await statsService.deletePlannedCommitment(userId, commitmentId)
    ApiResponse.noContent(res)
  } catch (e) { next(e) }
}
