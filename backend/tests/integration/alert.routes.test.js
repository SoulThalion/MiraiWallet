'use strict'

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request   from 'supertest'
import createApp from '../../src/app.js'
import { setupDb, teardownDb }         from '../helpers/setup.js'
import { createUser, createAlert }     from '../helpers/factories.js'
import { createTokenPair }             from '../../src/utils/jwt.js'

let app, user, token

beforeAll(async () => { await setupDb(); app = createApp() })
afterAll(teardownDb)
beforeEach(async () => {
  user  = await createUser()
  token = createTokenPair(user).accessToken
})

const BASE = '/api/v1/alerts'
const auth = (t) => ({ Authorization: `Bearer ${t}` })

describe('GET /api/v1/alerts', () => {
  it('200 — returns active alerts', async () => {
    await createAlert(user.id)
    await createAlert(user.id, { isDismissed: true })
    const res = await request(app).get(BASE).set(auth(token))
    expect(res.status).toBe(200)
    expect(res.body.data.every(a => !a.isDismissed)).toBe(true)
  })

  it('401 — requires auth', async () => {
    const res = await request(app).get(BASE)
    expect(res.status).toBe(401)
  })
})

describe('GET /api/v1/alerts/unread-count', () => {
  it('200 — returns correct unread count', async () => {
    await createAlert(user.id, { isRead: false })
    await createAlert(user.id, { isRead: true })
    const res = await request(app).get(`${BASE}/unread-count`).set(auth(token))
    expect(res.status).toBe(200)
    expect(res.body.data.count).toBe(1)
  })
})

describe('PATCH /api/v1/alerts/:id/read', () => {
  it('200 — marks alert as read', async () => {
    const alert = await createAlert(user.id, { isRead: false })
    const res   = await request(app).patch(`${BASE}/${alert.id}/read`).set(auth(token))
    expect(res.status).toBe(200)
    expect(res.body.data.isRead).toBe(true)
  })

  it('404 — unknown alert id', async () => {
    const res = await request(app).patch(`${BASE}/00000000-0000-0000-0000-000000000000/read`).set(auth(token))
    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/v1/alerts/:id', () => {
  it('204 — dismisses alert', async () => {
    const alert = await createAlert(user.id)
    const res   = await request(app).delete(`${BASE}/${alert.id}`).set(auth(token))
    expect(res.status).toBe(204)
  })
})

describe('DELETE /api/v1/alerts/dismiss-all', () => {
  it('204 — dismisses all alerts', async () => {
    await createAlert(user.id)
    await createAlert(user.id)
    const res = await request(app).delete(`${BASE}/dismiss-all`).set(auth(token))
    expect(res.status).toBe(204)
    const check = await request(app).get(BASE).set(auth(token))
    expect(check.body.meta.total).toBe(0)
  })
})
