'use strict'

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request   from 'supertest'
import createApp from '../../src/app.js'
import { setupDb, teardownDb }                from '../helpers/setup.js'
import { createUser, createAccount, createCategory, createTransaction } from '../helpers/factories.js'
import { createTokenPair }                    from '../../src/utils/jwt.js'

let app, user, account, category, token

beforeAll(async () => {
  await setupDb()
  app = createApp()
})
afterAll(teardownDb)

beforeEach(async () => {
  user     = await createUser()
  account  = await createAccount(user.id, { balance: 5000 })
  category = await createCategory(user.id)
  token    = createTokenPair(user).accessToken
})

const BASE = '/api/v1/transactions'
const auth = (t) => ({ Authorization: `Bearer ${t}` })

describe('GET /api/v1/transactions', () => {
  it('200 — returns paginated transactions for user', async () => {
    await createTransaction(user.id, account.id, category.id)
    const res = await request(app).get(BASE).set(auth(token))
    expect(res.status).toBe(200)
    expect(res.body.data).toBeInstanceOf(Array)
    expect(res.body.meta).toHaveProperty('total')
  })

  it('401 — requires authentication', async () => {
    const res = await request(app).get(BASE)
    expect(res.status).toBe(401)
  })

  it('200 — filters by type=income', async () => {
    await createTransaction(user.id, account.id, category.id, { type: 'income', amount: 1000 })
    await createTransaction(user.id, account.id, category.id, { type: 'expense', amount: 50 })
    const res = await request(app).get(`${BASE}?type=income`).set(auth(token))
    expect(res.body.data.every(t => t.type === 'income')).toBe(true)
  })

  it('200 — paginates correctly', async () => {
    for (let i = 0; i < 5; i++) await createTransaction(user.id, account.id, category.id)
    const res = await request(app).get(`${BASE}?page=1&limit=2`).set(auth(token))
    expect(res.body.data).toHaveLength(2)
    expect(res.body.meta.totalPages).toBeGreaterThan(1)
  })
})

describe('POST /api/v1/transactions', () => {
  it('201 — creates transaction and includes relations', async () => {
    const res = await request(app).post(BASE).set(auth(token)).send({
      accountId:   account.id,
      categoryId:  category.id,
      description: 'Supermercado',
      amount:      85.50,
      type:        'expense',
      date:        new Date().toISOString().split('T')[0],
    })
    expect(res.status).toBe(201)
    expect(res.body.data.description).toBe('Supermercado')
    expect(res.body.data.account).toBeDefined()
    expect(res.body.data.category).toBeDefined()
  })

  it('400 — missing required fields', async () => {
    const res = await request(app).post(BASE).set(auth(token)).send({ description: 'incomplete' })
    expect(res.status).toBe(400)
    expect(res.body.error.details.length).toBeGreaterThan(0)
  })

  it('400 — negative amount', async () => {
    const res = await request(app).post(BASE).set(auth(token)).send({
      accountId: account.id, description: 'X', amount: -10,
      type: 'expense', date: new Date().toISOString().split('T')[0],
    })
    expect(res.status).toBe(400)
  })

  it('400 — invalid date format', async () => {
    const res = await request(app).post(BASE).set(auth(token)).send({
      accountId: account.id, description: 'X', amount: 10,
      type: 'expense', date: 'not-a-date',
    })
    expect(res.status).toBe(400)
  })
})

describe('GET /api/v1/transactions/:id', () => {
  it('200 — returns transaction by id', async () => {
    const tx  = await createTransaction(user.id, account.id, category.id)
    const res = await request(app).get(`${BASE}/${tx.id}`).set(auth(token))
    expect(res.status).toBe(200)
    expect(res.body.data.id).toBe(tx.id)
  })

  it('404 — non-existent id', async () => {
    const res = await request(app).get(`${BASE}/00000000-0000-0000-0000-000000000000`).set(auth(token))
    expect(res.status).toBe(404)
  })

  it('404 — cannot access another users transaction', async () => {
    const other   = await createUser()
    const otherAc = await createAccount(other.id)
    const tx      = await createTransaction(other.id, otherAc.id, category.id)
    const res     = await request(app).get(`${BASE}/${tx.id}`).set(auth(token))
    expect(res.status).toBe(404)
  })
})

describe('PATCH /api/v1/transactions/:id', () => {
  it('200 — updates description', async () => {
    const tx  = await createTransaction(user.id, account.id, category.id)
    const res = await request(app).patch(`${BASE}/${tx.id}`).set(auth(token))
      .send({ description: 'Updated' })
    expect(res.status).toBe(200)
    expect(res.body.data.description).toBe('Updated')
  })
})

describe('DELETE /api/v1/transactions/:id', () => {
  it('204 — deletes transaction', async () => {
    const tx  = await createTransaction(user.id, account.id, category.id)
    const res = await request(app).delete(`${BASE}/${tx.id}`).set(auth(token))
    expect(res.status).toBe(204)
  })

  it('404 — deleting already deleted tx', async () => {
    const tx = await createTransaction(user.id, account.id, category.id)
    await request(app).delete(`${BASE}/${tx.id}`).set(auth(token))
    const res = await request(app).delete(`${BASE}/${tx.id}`).set(auth(token))
    expect(res.status).toBe(404)
  })
})

describe('GET /api/v1/transactions/summary/monthly', () => {
  it('200 — returns array of 12 months', async () => {
    const res = await request(app).get(`${BASE}/summary/monthly`).set(auth(token))
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(12)
  })
})

describe('GET /api/v1/transactions/summary/categories', () => {
  it('200 — returns category breakdown array', async () => {
    const res = await request(app).get(`${BASE}/summary/categories`).set(auth(token))
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
  })
})
