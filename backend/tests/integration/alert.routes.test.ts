import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request   from 'supertest'
import { createApp }  from '../../src/app'
import { setupDb, teardownDb }         from '../helpers/setup'
import { createUser, createAlert }     from '../helpers/factories'
import { createTokenPair }             from '../../src/utils/jwt'
import { User, Alert }                 from '../../src/models'
import type { Express } from 'express'

let app: Express
let user: import('../../src/models/User').User
let token: string

beforeAll(async () => { await setupDb(); app = createApp() })
afterAll(teardownDb)

// ✅ Bug 2 fix: clean ALL alerts + users before each test
beforeEach(async () => {
  await Alert.destroy({ where: {} })
  await User.destroy({ where: {}, truncate: true })
  user  = await createUser()
  token = createTokenPair(user).accessToken
})

const BASE = '/api/v1/alerts'
const auth = (t: string) => ({ Authorization: `Bearer ${t}` })

describe('GET /alerts', () => {
  it('200 — returns only non-dismissed alerts', async () => {
    await createAlert(user.id)
    await createAlert(user.id, { isDismissed: true })
    const res = await request(app).get(BASE).set(auth(token))
    expect(res.status).toBe(200)
    expect(res.body.data.every((a: { isDismissed: boolean }) => !a.isDismissed)).toBe(true)
  })

  it('401 — requires auth', async () => {
    expect((await request(app).get(BASE)).status).toBe(401)
  })
})

describe('GET /alerts/unread-count', () => {
  it('200 — correct count', async () => {
    await createAlert(user.id, { isRead: false })
    await createAlert(user.id, { isRead: true })
    const res = await request(app).get(`${BASE}/unread-count`).set(auth(token))
    expect(res.status).toBe(200)
    expect(res.body.data.count).toBe(1)
  })
})

describe('PATCH /alerts/:id/read', () => {
  it('200 — isRead becomes true', async () => {
    const alert = await createAlert(user.id, { isRead: false })
    const res   = await request(app).patch(`${BASE}/${alert.id}/read`).set(auth(token))
    expect(res.status).toBe(200)
    expect(res.body.data.isRead).toBe(true)
  })

  it('404 — unknown alert', async () => {
    const res = await request(app).patch(`${BASE}/00000000-0000-0000-0000-000000000000/read`).set(auth(token))
    expect(res.status).toBe(404)
  })
})

describe('DELETE /alerts/:id', () => {
  it('204 — dismisses alert', async () => {
    const alert = await createAlert(user.id)
    expect((await request(app).delete(`${BASE}/${alert.id}`).set(auth(token))).status).toBe(204)
  })
})

// ✅ Bug 1 fix verified: dismiss-all is a static route BEFORE /:id
describe('DELETE /alerts/dismiss-all', () => {
  it('204 — dismisses all and list returns empty', async () => {
    await createAlert(user.id)
    await createAlert(user.id)
    const res = await request(app).delete(`${BASE}/dismiss-all`).set(auth(token))
    expect(res.status).toBe(204)     // was 404 before the fix

    const check = await request(app).get(BASE).set(auth(token))
    expect(check.body.meta.total).toBe(0)   // was failing due to stale data
  })

  it('does not dismiss alerts of other users', async () => {
    const other      = await createUser()
    const otherToken = createTokenPair(other).accessToken
    await createAlert(other.id)

    await request(app).delete(`${BASE}/dismiss-all`).set(auth(token))

    const check = await request(app).get(BASE).set(auth(otherToken))
    expect(check.body.meta.total).toBe(1)
  })
})
