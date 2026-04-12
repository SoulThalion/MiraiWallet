import { Request, Response, NextFunction } from 'express'
import * as authService from '../services/auth.service'
import { ApiResponse }  from '../utils/ApiResponse'
import { User }         from '../models'

type AuthReq = Request & { user: User }

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try { ApiResponse.created(res, await authService.register(req.body)) }
  catch (err) { next(err) }
}

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try { ApiResponse.success(res, await authService.login(req.body)) }
  catch (err) { next(err) }
}

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try { ApiResponse.success(res, await authService.refresh(req.body.refreshToken)) }
  catch (err) { next(err) }
}

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try { await authService.logout((req as AuthReq).user.id); ApiResponse.noContent(res) }
  catch (err) { next(err) }
}

export const me = async (req: Request, res: Response, next: NextFunction) => {
  try { ApiResponse.success(res, await authService.getProfile((req as AuthReq).user.id)) }
  catch (err) { next(err) }
}

export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try { ApiResponse.success(res, await authService.updateProfile((req as AuthReq).user, req.body)) }
  catch (err) { next(err) }
}

export const changePassword = async (req: Request, res: Response, next: NextFunction) => {
  try { await authService.changePassword((req as AuthReq).user, req.body); ApiResponse.noContent(res) }
  catch (err) { next(err) }
}
