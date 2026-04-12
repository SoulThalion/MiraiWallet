import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request   from 'supertest'
import { createApp }  from '../../src/app'
import { setupDb, teardownDb }                    from '../helpers/setup'
import { createUser, createCategory, createBudget } from '../helpers/factories'
import { createTokenPair }                        from '../../src/utils/jwt'
import { User }                                   from '../../src/models'
import type { Express } from 'express'

let app: Express, token: string
let user: import('../../src/models/User').User
let category: import('../../src/models/Category').Category

beforeAll(async () => { await setupDb(); app = createApp() })
afterAll(teardownDb)
beforeEach(async () => {
  await User.destroy({ where: {}, truncate: true })
  user     = await createUser()
  category = await createCategory(user.id)
  token    = createTokenPair(user).accessToken
})

const BASE = '/api/v1/budgets'
const auth = (t: string) => ({ Authorization: `Bearer ${t}` })

describe('GET /budgets', () => {
  it('200 — returns budgets with spent/pct/remaining', async () => {
    const month = new Date().toISOString().slice(0, 7)
    await createBudget(user.id, category.id, { month })
    const res = await request(app).get(BASE).set(auth(token))
    expect(res.status).toBe(200)
    expect(res.body.data[0]).toHaveProperty('spent')
    expect(res.body.data[0]).toHaveProperty('pct')
    expect(res.body.data[0]).toHaveProperty('remaining')
  })
})

describe('PUT /budgets', () => {
  it('200 — creates budget', async () => {
    const res = await request(app).put(BASE).set(auth(token))
      .send({ categoryId: category.id, amount: 600, month: '2024-09' })
    expect(res.status).toBe(200)
    expect(res.body.data.amount).toBe(600)
  })

  it('200 — upserts existing budget', async () => {
    const payload = { categoryId: category.id, amount: 400, month: '2024-10' }
    await request(app).put(BASE).set(auth(token)).send(payload)
    const res = await request(app).put(BASE).set(auth(token)).send({ ...payload, amount: 800 })
    expect(res.status).toBe(200)
    expect(res.body.data.amount).toBe(800)
  })

  it('400 — invalid month format', async () => {
    const res = await request(app).put(BASE).set(auth(token))
      .send({ categoryId: category.id, amount: 100, month: '2024/11' })
    expect(res.status).toBe(400)
  })

  it('400 — negative amount', async () => {
    const res = await request(app).put(BASE).set(auth(token))
      .send({ categoryId: category.id, amount: -50, month: '2024-12' })
    expect(res.status).toBe(400)
  })
})

describe('DELETE /budgets/:id', () => {
  it('204 — deletes', async () => {
    const b   = await createBudget(user.id, category.id)
    const res = await request(app).delete(`${BASE}/${b.id}`).set(auth(token))
    expect(res.status).toBe(204)
  })

  it('404 — unknown id', async () => {
    const res = await request(app).delete(`${BASE}/00000000-0000-0000-0000-000000000000`).set(auth(token))
    expect(res.status).toBe(404)
  })
})
