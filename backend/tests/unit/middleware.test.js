'use strict'

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupDb, teardownDb } from '../helpers/setup.js'
import { createUser }          from '../helpers/factories.js'
import { authenticate, authorize } from '../../src/middlewares/auth.middleware.js'
import { errorHandler }            from '../../src/middlewares/error.middleware.js'
import ApiError                    from '../../src/utils/ApiError.js'
import { createTokenPair, signAccessToken } from '../../src/utils/jwt.js'

beforeAll(setupDb)
afterAll(teardownDb)

// ── Helpers ───────────────────────────────────────────────
function mockReq(token) {
  return { headers: { authorization: token ? `Bearer ${token}` : undefined } }
}
function mockRes() {
  const res = { _status: 0, _body: null }
  res.status = (s) => { res._status = s; return res }
  res.json   = (b) => { res._body = b;   return res }
  res.send   = ()  => res
  return res
}

// ── authenticate ──────────────────────────────────────────
describe('authenticate middleware', () => {
  it('calls next with 401 when no token', async () => {
    const next = vi.fn()
    await authenticate(mockReq(null), mockRes(), next)
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }))
  })

  it('calls next with 401 for invalid token', async () => {
    const next = vi.fn()
    await authenticate(mockReq('bad.token.here'), mockRes(), next)
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }))
  })

  it('attaches user to req for valid token', async () => {
    const user  = await createUser()
    const token = createTokenPair(user).accessToken
    const req   = mockReq(token)
    const next  = vi.fn()
    await authenticate(req, mockRes(), next)
    expect(next).toHaveBeenCalledWith()  // no error
    expect(req.user.id).toBe(user.id)
  })

  it('calls next with 401 for inactive user', async () => {
    const user  = await createUser({ isActive: false })
    const token = signAccessToken({ sub: user.id, role: user.role })
    const next  = vi.fn()
    await authenticate(mockReq(token), mockRes(), next)
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }))
  })
})

// ── authorize ─────────────────────────────────────────────
describe('authorize middleware', () => {
  it('allows matching role', () => {
    const req  = { user: { role: 'admin' } }
    const next = vi.fn()
    authorize('admin')(req, mockRes(), next)
    expect(next).toHaveBeenCalledWith()
  })

  it('blocks non-matching role with 403', () => {
    const req  = { user: { role: 'user' } }
    const next = vi.fn()
    authorize('admin')(req, mockRes(), next)
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }))
  })

  it('accepts multiple roles', () => {
    const req  = { user: { role: 'user' } }
    const next = vi.fn()
    authorize('admin', 'user')(req, mockRes(), next)
    expect(next).toHaveBeenCalledWith()
  })
})

// ── errorHandler ──────────────────────────────────────────
describe('errorHandler middleware', () => {
  it('returns correct status for ApiError', () => {
    const res  = mockRes()
    const next = vi.fn()
    errorHandler(ApiError.notFound('Widget'), {}, res, next)
    expect(res._status).toBe(404)
    expect(res._body.success).toBe(false)
    expect(res._body.error.message).toContain('Widget')
  })

  it('returns 422 for Sequelize validation errors', () => {
    const res  = mockRes()
    const err  = { name: 'SequelizeValidationError', errors: [{ path: 'email', message: 'invalid' }] }
    errorHandler(err, {}, res, vi.fn())
    expect(res._status).toBe(422)
    expect(res._body.error.details).toHaveLength(1)
  })

  it('returns 500 for unknown errors', () => {
    const res = mockRes()
    errorHandler(new Error('boom'), {}, res, vi.fn())
    expect(res._status).toBe(500)
    expect(res._body.success).toBe(false)
  })
})
