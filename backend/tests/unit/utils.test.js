'use strict'

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── ApiError ─────────────────────────────────────────────
describe('ApiError', () => {
  let ApiError
  beforeEach(async () => {
    ApiError = (await import('../../src/utils/ApiError.js')).default
  })

  it('creates an error with statusCode and message', () => {
    const err = new ApiError(404, 'Not found')
    expect(err.statusCode).toBe(404)
    expect(err.message).toBe('Not found')
    expect(err.name).toBe('ApiError')
  })

  it('factory: badRequest returns 400', () => {
    const err = ApiError.badRequest('bad', { field: 'email' })
    expect(err.statusCode).toBe(400)
    expect(err.details).toEqual({ field: 'email' })
  })

  it('factory: unauthorized returns 401', () => {
    expect(ApiError.unauthorized().statusCode).toBe(401)
  })

  it('factory: forbidden returns 403', () => {
    expect(ApiError.forbidden().statusCode).toBe(403)
  })

  it('factory: notFound returns 404 with resource name', () => {
    const err = ApiError.notFound('Transaction')
    expect(err.statusCode).toBe(404)
    expect(err.message).toContain('Transaction')
  })

  it('factory: conflict returns 409', () => {
    expect(ApiError.conflict('duplicate').statusCode).toBe(409)
  })

  it('factory: internal returns 500', () => {
    expect(ApiError.internal().statusCode).toBe(500)
  })

  it('is an instance of Error', () => {
    expect(new ApiError(400, 'x')).toBeInstanceOf(Error)
  })
})

// ── ApiResponse ───────────────────────────────────────────
describe('ApiResponse', () => {
  let ApiResponse
  beforeEach(async () => {
    ApiResponse = (await import('../../src/utils/ApiResponse.js')).default
  })

  function mockRes() {
    const res = { _status: 0, _body: null }
    res.status = (s) => { res._status = s; return res }
    res.json   = (b) => { res._body = b;   return res }
    res.send   = (b) => { res._body = b;   return res }
    return res
  }

  it('success sends 200 with { success: true, data }', () => {
    const res = mockRes()
    ApiResponse.success(res, { id: 1 })
    expect(res._status).toBe(200)
    expect(res._body.success).toBe(true)
    expect(res._body.data).toEqual({ id: 1 })
  })

  it('created sends 201', () => {
    const res = mockRes()
    ApiResponse.created(res, { id: 2 })
    expect(res._status).toBe(201)
  })

  it('noContent sends 204', () => {
    const res = mockRes()
    ApiResponse.noContent(res)
    expect(res._status).toBe(204)
  })

  it('error sends { success: false, error }', () => {
    const res = mockRes()
    ApiResponse.error(res, 422, 'Validation failed', [{ field: 'email' }])
    expect(res._status).toBe(422)
    expect(res._body.success).toBe(false)
    expect(res._body.error.message).toBe('Validation failed')
    expect(res._body.error.details).toHaveLength(1)
  })

  it('paginated includes meta with pagination info', () => {
    const res = mockRes()
    ApiResponse.paginated(res, [1, 2], { page: 2, limit: 10, total: 25 })
    expect(res._body.meta.page).toBe(2)
    expect(res._body.meta.totalPages).toBe(3)
    expect(res._body.meta.hasNext).toBe(true)
    expect(res._body.meta.hasPrev).toBe(true)
  })
})

// ── jwt utils ─────────────────────────────────────────────
describe('jwt utils', () => {
  let jwt
  beforeEach(async () => {
    jwt = await import('../../src/utils/jwt.js')
  })

  const fakeUser = { id: 'abc-123', role: 'user' }

  it('signAccessToken returns a string', () => {
    const token = jwt.signAccessToken({ sub: fakeUser.id, role: fakeUser.role })
    expect(typeof token).toBe('string')
    expect(token.split('.')).toHaveLength(3)
  })

  it('verifyAccessToken decodes the payload', () => {
    const token   = jwt.signAccessToken({ sub: fakeUser.id, role: fakeUser.role })
    const payload = jwt.verifyAccessToken(token)
    expect(payload.sub).toBe(fakeUser.id)
    expect(payload.role).toBe(fakeUser.role)
  })

  it('verifyAccessToken throws on tampered token', () => {
    const token = jwt.signAccessToken({ sub: 'x' }) + 'tampered'
    expect(() => jwt.verifyAccessToken(token)).toThrow()
  })

  it('createTokenPair returns accessToken and refreshToken', () => {
    const pair = jwt.createTokenPair(fakeUser)
    expect(pair).toHaveProperty('accessToken')
    expect(pair).toHaveProperty('refreshToken')
    expect(pair.tokenType).toBe('Bearer')
  })

  it('refresh token verifies with refresh secret', () => {
    const pair    = jwt.createTokenPair(fakeUser)
    const payload = jwt.verifyRefreshToken(pair.refreshToken)
    expect(payload.sub).toBe(fakeUser.id)
  })
})

// ── pagination ────────────────────────────────────────────
describe('parsePagination', () => {
  let parsePagination
  beforeEach(async () => {
    ({ parsePagination } = await import('../../src/utils/pagination.js'))
  })

  it('defaults to page=1, limit=20', () => {
    const { page, limit, offset } = parsePagination({})
    expect(page).toBe(1)
    expect(limit).toBe(20)
    expect(offset).toBe(0)
  })

  it('parses page and limit from query', () => {
    const { page, limit, offset } = parsePagination({ page: '3', limit: '10' })
    expect(page).toBe(3)
    expect(limit).toBe(10)
    expect(offset).toBe(20)
  })

  it('clamps page to minimum 1', () => {
    const { page } = parsePagination({ page: '-5' })
    expect(page).toBe(1)
  })

  it('clamps limit to maximum 100', () => {
    const { limit } = parsePagination({ limit: '999' })
    expect(limit).toBe(100)
  })

  it('clamps limit to minimum 1', () => {
    const { limit } = parsePagination({ limit: '0' })
    expect(limit).toBe(1)
  })
})
