import { Response } from 'express'
import { PaginationMeta } from '../types'

export class ApiResponse {
  static success<T>(res: Response, data: T, statusCode = 200, meta?: PaginationMeta): Response {
    const body: Record<string, unknown> = { success: true, data }
    if (meta) body.meta = meta
    return res.status(statusCode).json(body)
  }

  static created<T>(res: Response, data: T): Response {
    return ApiResponse.success(res, data, 201)
  }

  static noContent(res: Response): Response {
    return res.status(204).send()
  }

  static error(res: Response, statusCode: number, code: number, message: string, details?: unknown): Response {
    const body: Record<string, unknown> = { success: false, error: { code, message } }
    if (details !== undefined) (body.error as Record<string, unknown>).details = details
    return res.status(statusCode).json(body)
  }

  static paginated<T>(res: Response, data: T[], meta: PaginationMeta): Response {
    return ApiResponse.success(res, data, 200, meta)
  }
}
