import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupDb, teardownDb } from '../helpers/setup'
import { createUser }          from '../helpers/factories'
import { authenticate, authorize } from '../../src/middlewares/auth.middleware'
import { errorHandler }            from '../../src/middlewares/error.middleware'
import { ApiError }                from '../../src/utils/ApiError'
import { createTokenPair, signAccessToken } from '../../src/utils/jwt'
import type { Request, Response, NextFunction } from 'express'

beforeAll(setupDb)
afterAll(teardownDb)
beforeEach(async () => {
  const { User } = await import('../../src/models')
  await User.destroy({ where: {}, truncate: true })
})

// ── Mock helpers ─────────────────────────────────────────
function mockReq(token?: string): Request {
  return { headers: { authorization: token ? `Bearer ${token}` : undefined } } as unknown as Request
}

function mockRes() {
  const res = { _status: 0 as number, _body: null as unknown }
  res.status = function(s: number) { this._status = s; return this }
  res.json   = function(b: unknown) { this._body  = b; return this }
  res.send   = function()           { return this }
  return res as unknown as Response & { _status: number; _body: unknown }
}

// ── authenticate ─────────────────────────────────────────
describe('authenticate middleware', () => {
  it('calls next(401) when no token', async () => {
    const next = vi.fn() as NextFunction
    await authenticate(mockReq(), mockRes(), next)
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }))
  })

  it('calls next(401) for malformed token', async () => {
    const next = vi.fn() as NextFunction
    await authenticate(mockReq('bad.token.here'), mockRes(), next)
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }))
  })

  it('attaches user to req for valid token', async () => {
    const user  = await createUser()
    const token = createTokenPair(user).accessToken
    const req   = mockReq(token)
    const next  = vi.fn() as NextFunction
    await authenticate(req, mockRes(), next)
    expect(next).toHaveBeenCalledWith()               // no error arg
    expect((req as Request & { user: { id: string } }).user.id).toBe(user.id)
  })

  it('calls next(401) for inactive user', async () => {
    const user  = await createUser({ isActive: false })
    const token = signAccessToken({ sub: user.id, role: user.role })
    const next  = vi.fn() as NextFunction
    await authenticate(mockReq(token), mockRes(), next)
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }))
  })
})

// ── authorize ────────────────────────────────────────────
describe('authorize middleware', () => {
  const makeReq = (role: string) =>
    ({ user: { role } } as unknown as Request)

  it('allows matching role → next()', () => {
    const next = vi.fn() as NextFunction
    authorize('admin')(makeReq('admin'), mockRes(), next)
    expect(next).toHaveBeenCalledWith()
  })

  it('blocks wrong role → next(403)', () => {
    const next = vi.fn() as NextFunction
    authorize('admin')(makeReq('user'), mockRes(), next)
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }))
  })

  it('accepts any of multiple roles', () => {
    const next = vi.fn() as NextFunction
    authorize('admin', 'user')(makeReq('user'), mockRes(), next)
    expect(next).toHaveBeenCalledWith()
  })
})

// ── errorHandler ─────────────────────────────────────────
describe('errorHandler middleware', () => {
  const next = vi.fn() as NextFunction

  it('serialises ApiError with correct status', () => {
    const res = mockRes()
    errorHandler(ApiError.notFound('Widget'), {} as Request, res, next)
    expect(res._status).toBe(404)
    const body = res._body as { success: boolean; error: { message: string } }
    expect(body.success).toBe(false)
    expect(body.error.message).toContain('Widget')
  })

  it('returns 422 for Sequelize validation errors', () => {
    const res = mockRes()
    const err = { name: 'SequelizeValidationError', errors: [{ path: 'email', message: 'invalid' }] }
    errorHandler(err, {} as Request, res, next)
    expect(res._status).toBe(422)
    const body = res._body as { error: { details: unknown[] } }
    expect(body.error.details).toHaveLength(1)
  })

  it('returns 500 for unknown errors', () => {
    const res = mockRes()
    errorHandler(new Error('boom'), {} as Request, res, next)
    expect(res._status).toBe(500)
    expect((res._body as { success: boolean }).success).toBe(false)
  })
})
