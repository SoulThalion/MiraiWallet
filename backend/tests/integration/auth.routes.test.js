'use strict'

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request     from 'supertest'
import createApp   from '../../src/app.js'
import { setupDb, teardownDb } from '../helpers/setup.js'
import { User }   from '../../src/models/index.js'

let app

beforeAll(async () => {
  await setupDb()
  app = createApp()
})
afterAll(teardownDb)

const BASE = '/api/v1/auth'
const validUser = { name: 'Integration Test', email: 'int@test.com', password: 'Password1' }

describe('POST /api/v1/auth/register', () => {
  it('201 — registers a new user and returns tokens', async () => {
    const res = await request(app).post(`${BASE}/register`).send(validUser)
    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data.accessToken).toBeDefined()
    expect(res.body.data.user.email).toBe(validUser.email)
    expect(res.body.data.user.passwordHash).toBeUndefined()
  })

  it('409 — duplicate email', async () => {
    const res = await request(app).post(`${BASE}/register`).send(validUser)
    expect(res.status).toBe(409)
  })

  it('400 — invalid email format', async () => {
    const res = await request(app).post(`${BASE}/register`)
      .send({ name: 'X', email: 'not-an-email', password: 'Password1' })
    expect(res.status).toBe(400)
    expect(res.body.error.details).toBeDefined()
  })

  it('400 — password too short', async () => {
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

describe('POST /api/v1/auth/login', () => {
  it('200 — returns tokens for valid credentials', async () => {
    const res = await request(app).post(`${BASE}/login`)
      .send({ email: validUser.email, password: validUser.password })
    expect(res.status).toBe(200)
    expect(res.body.data.accessToken).toBeDefined()
  })

  it('401 — wrong password', async () => {
    const res = await request(app).post(`${BASE}/login`)
      .send({ email: validUser.email, password: 'WrongPass1' })
    expect(res.status).toBe(401)
  })

  it('401 — non-existent user', async () => {
    const res = await request(app).post(`${BASE}/login`)
      .send({ email: 'ghost@test.com', password: 'Password1' })
    expect(res.status).toBe(401)
  })
})

describe('GET /api/v1/auth/me', () => {
  it('200 — returns profile for authenticated user', async () => {
    const login = await request(app).post(`${BASE}/login`)
      .send({ email: validUser.email, password: validUser.password })
    const token = login.body.data.accessToken

    const res = await request(app).get(`${BASE}/me`)
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.data.email).toBe(validUser.email)
  })

  it('401 — no token', async () => {
    const res = await request(app).get(`${BASE}/me`)
    expect(res.status).toBe(401)
  })

  it('401 — malformed token', async () => {
    const res = await request(app).get(`${BASE}/me`)
      .set('Authorization', 'Bearer not.a.valid.token')
    expect(res.status).toBe(401)
  })
})

describe('POST /api/v1/auth/refresh', () => {
  it('200 — returns new token pair', async () => {
    const reg = await request(app).post(`${BASE}/register`)
      .send({ name: 'Refresh User', email: 'ref@test.com', password: 'Password1' })
    const refreshToken = reg.body.data.refreshToken

    const res = await request(app).post(`${BASE}/refresh`).send({ refreshToken })
    expect(res.status).toBe(200)
    expect(res.body.data.accessToken).toBeDefined()
  })

  it('401 — invalid refresh token', async () => {
    const res = await request(app).post(`${BASE}/refresh`).send({ refreshToken: 'bad' })
    expect(res.status).toBe(401)
  })
})

describe('POST /api/v1/auth/logout', () => {
  it('204 — clears refresh token', async () => {
    const login = await request(app).post(`${BASE}/login`)
      .send({ email: validUser.email, password: validUser.password })
    const token = login.body.data.accessToken

    const res = await request(app).post(`${BASE}/logout`)
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(204)

    const user = await User.findOne({ where: { email: validUser.email } })
    expect(user.refreshToken).toBeNull()
  })
})

describe('GET /api/v1/health', () => {
  it('200 — returns ok status', async () => {
    const res = await request(app).get('/api/v1/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
  })
})
