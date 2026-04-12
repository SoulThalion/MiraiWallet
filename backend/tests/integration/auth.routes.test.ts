import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request   from 'supertest'
import { createApp }  from '../../src/app'
import { setupDb, teardownDb } from '../helpers/setup'
import { User }  from '../../src/models'
import type { Express } from 'express'

let app: Express

beforeAll(async () => { await setupDb(); app = createApp() })
afterAll(teardownDb)

const BASE = '/api/v1/auth'
const validUser = { name: 'Integration', email: 'int@test.com', password: 'Password1' }

describe('POST /auth/register', () => {
  beforeAll(() => User.destroy({ where: {} }))

  it('201 — returns tokens and safe user', async () => {
    const res = await request(app).post(`${BASE}/register`).send(validUser)
    expect(res.status).toBe(201)
    expect(res.body.data.accessToken).toBeDefined()
    expect(res.body.data.user.passwordHash).toBeUndefined()
  })

  it('409 — duplicate email', async () => {
    const res = await request(app).post(`${BASE}/register`).send(validUser)
    expect(res.status).toBe(409)
  })

  it('400 — invalid email', async () => {
    const res = await request(app).post(`${BASE}/register`)
      .send({ name: 'X', email: 'not-email', password: 'Password1' })
    expect(res.status).toBe(400)
  })

  it('400 — short password', async () => {
    const res = await request(app).post(`${BASE}/register`)
      .send({ name: 'X', email: 'short@test.com', password: 'abc' })
    expect(res.status).toBe(400)
  })

  it('400 — missing name', async () => {
    const res = await request(app).post(`${BASE}/register`)
      .send({ email: 'noname@test.com', password: 'Password1' })
    expect(res.status).toBe(400)
  })
})

describe('POST /auth/login', () => {
  it('200 — valid credentials', async () => {
    const res = await request(app).post(`${BASE}/login`)
      .send({ email: validUser.email, password: validUser.password })
    expect(res.status).toBe(200)
    expect(res.body.data.accessToken).toBeDefined()
  })

  it('401 — wrong password', async () => {
    const res = await request(app).post(`${BASE}/login`)
      .send({ email: validUser.email, password: 'Wrong1' })
    expect(res.status).toBe(401)
  })

  it('401 — non-existent user', async () => {
    const res = await request(app).post(`${BASE}/login`)
      .send({ email: 'ghost@test.com', password: 'Password1' })
    expect(res.status).toBe(401)
  })
})

describe('GET /auth/me', () => {
  it('200 — returns profile with valid token', async () => {
    const login = await request(app).post(`${BASE}/login`)
      .send({ email: validUser.email, password: validUser.password })
    const res = await request(app).get(`${BASE}/me`)
      .set('Authorization', `Bearer ${login.body.data.accessToken}`)
    expect(res.status).toBe(200)
    expect(res.body.data.email).toBe(validUser.email)
    expect(res.body.data.monthCycleStartDay).toBe(1)
    expect(res.body.data.monthCycleMode).toBe('calendar')
    expect(res.body.data.monthCycleEndDay).toBe(31)
    expect(res.body.data.monthCycleAnchor).toBe('previous')
  })

  it('401 — no token', async () => {
    expect((await request(app).get(`${BASE}/me`)).status).toBe(401)
  })

  it('401 — malformed token', async () => {
    const res = await request(app).get(`${BASE}/me`)
      .set('Authorization', 'Bearer bad.token')
    expect(res.status).toBe(401)
  })
})

describe('PATCH /auth/me', () => {
  async function tokenForNewUser(): Promise<string> {
    const email = `patch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@t.com`
    const reg = await request(app).post(`${BASE}/register`).send({
      name: 'PatchUser', email, password: 'Password1',
    })
    return reg.body.data.accessToken as string
  }

  it('200 — updates periodo personalizado', async () => {
    const token = await tokenForNewUser()
    const res = await request(app)
      .patch(`${BASE}/me`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        monthCycleMode: 'custom',
        monthCycleStartDay: 27,
        monthCycleEndDay: 26,
        monthCycleAnchor: 'previous',
      })
    expect(res.status).toBe(200)
    expect(res.body.data.monthCycleMode).toBe('custom')
    expect(res.body.data.monthCycleStartDay).toBe(27)
    expect(res.body.data.monthCycleEndDay).toBe(26)
    expect(res.body.data.monthCycleAnchor).toBe('previous')
  })

  it('400 — monthCycleStartDay fuera de rango', async () => {
    const token = await tokenForNewUser()
    const res = await request(app)
      .patch(`${BASE}/me`)
      .set('Authorization', `Bearer ${token}`)
      .send({ monthCycleStartDay: 0 })
    expect(res.status).toBe(400)
  })

  it('401 — sin token', async () => {
    expect((await request(app).patch(`${BASE}/me`).send({ monthCycleStartDay: 2 })).status).toBe(401)
  })
})

describe('POST /auth/refresh', () => {
  it('200 — returns new token pair', async () => {
    const reg = await request(app).post(`${BASE}/register`)
      .send({ name: 'RefUser', email: 'ref@test.com', password: 'Password1' })
    const res = await request(app).post(`${BASE}/refresh`)
      .send({ refreshToken: reg.body.data.refreshToken })
    expect(res.status).toBe(200)
    expect(res.body.data.accessToken).toBeDefined()
  })

  it('401 — invalid refresh token', async () => {
    const res = await request(app).post(`${BASE}/refresh`).send({ refreshToken: 'bad' })
    expect(res.status).toBe(401)
  })
})

describe('POST /auth/logout', () => {
  it('204 — clears refresh token in DB', async () => {
    const login = await request(app).post(`${BASE}/login`)
      .send({ email: validUser.email, password: validUser.password })
    const res = await request(app).post(`${BASE}/logout`)
      .set('Authorization', `Bearer ${login.body.data.accessToken}`)
    expect(res.status).toBe(204)
    const user = await User.findOne({ where: { email: validUser.email } })
    expect(user!.refreshToken).toBeNull()
  })
})

describe('GET /health', () => {
  it('200 — ok', async () => {
    const res = await request(app).get('/api/v1/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
  })
})
