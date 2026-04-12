import { describe, it, expect, vi } from 'vitest'
import { ApiError }     from '../../src/utils/ApiError'
import { ApiResponse }  from '../../src/utils/ApiResponse'
import { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken, createTokenPair } from '../../src/utils/jwt'
import { parsePagination, buildPaginationMeta } from '../../src/utils/pagination'

// ── ApiError ─────────────────────────────────────────────
describe('ApiError', () => {
  it('stores statusCode and message', () => {
    const e = new ApiError(404, 'Not found')
    expect(e.statusCode).toBe(404)
    expect(e.message).toBe('Not found')
    expect(e.name).toBe('ApiError')
  })

  it('is instanceof Error', () => {
    expect(new ApiError(400, 'x')).toBeInstanceOf(Error)
  })

  it('badRequest → 400 with details', () => {
    const e = ApiError.badRequest('bad', { field: 'email' })
    expect(e.statusCode).toBe(400)
    expect(e.details).toEqual({ field: 'email' })
  })

  it('unauthorized → 401', () => { expect(ApiError.unauthorized().statusCode).toBe(401) })
  it('forbidden   → 403', () => { expect(ApiError.forbidden().statusCode).toBe(403) })

  it('notFound → 404 with resource name in message', () => {
    const e = ApiError.notFound('Transaction')
    expect(e.statusCode).toBe(404)
    expect(e.message).toContain('Transaction')
  })

  it('conflict → 409', () => { expect(ApiError.conflict('dup').statusCode).toBe(409) })
  it('internal → 500', () => { expect(ApiError.internal().statusCode).toBe(500) })
})

// ── ApiResponse ───────────────────────────────────────────
describe('ApiResponse', () => {
  const mockRes = () => {
    const res = { _status: 0, _body: null as unknown }
    res.status = (s: number) => { res._status = s; return res }
    res.json   = (b: unknown) => { res._body = b;  return res }
    res.send   = () => res
    return res as unknown as import('express').Response & { _status: number; _body: unknown }
  }

  it('success → 200 with { success: true, data }', () => {
    const res = mockRes()
    ApiResponse.success(res, { id: 1 })
    expect(res._status).toBe(200)
    expect((res._body as { success: boolean; data: unknown }).success).toBe(true)
    expect((res._body as { data: unknown }).data).toEqual({ id: 1 })
  })

  it('created → 201', () => {
    const res = mockRes()
    ApiResponse.created(res, { id: 2 })
    expect(res._status).toBe(201)
  })

  it('noContent → 204', () => {
    const res = mockRes()
    ApiResponse.noContent(res)
    expect(res._status).toBe(204)
  })

  it('error → { success: false, error }', () => {
    const res = mockRes()
    ApiResponse.error(res, 422, 'Validation failed', [{ field: 'email' }])
    expect(res._status).toBe(422)
    const body = res._body as { success: boolean; error: { message: string; details: unknown[] } }
    expect(body.success).toBe(false)
    expect(body.error.message).toBe('Validation failed')
    expect(body.error.details).toHaveLength(1)
  })

  it('paginated includes meta', () => {
    const res = mockRes()
    ApiResponse.paginated(res, [1, 2], { page: 2, limit: 10, total: 25, totalPages: 3, hasNext: true, hasPrev: true })
    const body = res._body as { meta: { page: number; totalPages: number; hasNext: boolean; hasPrev: boolean } }
    expect(body.meta.page).toBe(2)
    expect(body.meta.totalPages).toBe(3)
    expect(body.meta.hasNext).toBe(true)
    expect(body.meta.hasPrev).toBe(true)
  })
})

// ── JWT utils ─────────────────────────────────────────────
describe('jwt', () => {
  const fakeUser = { id: 'abc-123', role: 'user' as const }

  it('signAccessToken returns 3-part string', () => {
    const t = signAccessToken({ sub: fakeUser.id, role: fakeUser.role })
    expect(t.split('.')).toHaveLength(3)
  })

  it('verifyAccessToken decodes sub and role', () => {
    const t = signAccessToken({ sub: fakeUser.id, role: fakeUser.role })
    const p = verifyAccessToken(t)
    expect(p.sub).toBe(fakeUser.id)
    expect(p.role).toBe(fakeUser.role)
  })

  it('verifyAccessToken throws on tampered token', () => {
    const t = signAccessToken({ sub: 'x', role: 'user' }) + 'tampered'
    expect(() => verifyAccessToken(t)).toThrow()
  })

  it('createTokenPair returns accessToken + refreshToken + tokenType', () => {
    const pair = createTokenPair(fakeUser as import('../../src/models/User').User)
    expect(pair).toHaveProperty('accessToken')
    expect(pair).toHaveProperty('refreshToken')
    expect(pair.tokenType).toBe('Bearer')
  })

  it('refreshToken verifies with refresh secret', () => {
    const pair = createTokenPair(fakeUser as import('../../src/models/User').User)
    const p    = verifyRefreshToken(pair.refreshToken)
    expect(p.sub).toBe(fakeUser.id)
  })

  it('signRefreshToken / verifyRefreshToken round-trips', () => {
    const t = signRefreshToken({ sub: 'xyz', role: 'admin' })
    expect(verifyRefreshToken(t).sub).toBe('xyz')
  })
})

// ── Pagination ────────────────────────────────────────────
describe('parsePagination', () => {
  it('defaults: page=1, limit=20, offset=0', () => {
    const r = parsePagination({})
    expect(r).toEqual({ page: 1, limit: 20, offset: 0 })
  })

  it('parses page + limit, computes offset', () => {
    const r = parsePagination({ page: '3', limit: '10' })
    expect(r.page).toBe(3)
    expect(r.limit).toBe(10)
    expect(r.offset).toBe(20)
  })

  it('clamps page to minimum 1', () => {
    expect(parsePagination({ page: '-5' }).page).toBe(1)
  })

  it('clamps limit to maximum 100', () => {
    expect(parsePagination({ limit: '999' }).limit).toBe(100)
  })

  it('clamps limit to minimum 1', () => {
    expect(parsePagination({ limit: '0' }).limit).toBe(1)
  })
})

describe('buildPaginationMeta', () => {
  it('computes totalPages, hasNext, hasPrev', () => {
    const m = buildPaginationMeta(2, 10, 25)
    expect(m.totalPages).toBe(3)
    expect(m.hasNext).toBe(true)
    expect(m.hasPrev).toBe(true)
  })

  it('hasNext=false on last page', () => {
    expect(buildPaginationMeta(3, 10, 25).hasNext).toBe(false)
  })

  it('hasPrev=false on first page', () => {
    expect(buildPaginationMeta(1, 10, 25).hasPrev).toBe(false)
  })
})
