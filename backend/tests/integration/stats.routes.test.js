'use strict'

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request   from 'supertest'
import createApp from '../../src/app.js'
import { setupDb, teardownDb }             from '../helpers/setup.js'
import { createUser, createAccount, createCategory, createTransaction } from '../helpers/factories.js'
import { createTokenPair }                 from '../../src/utils/jwt.js'

let app, user, account, category, token

beforeAll(async () => { await setupDb(); app = createApp() })
afterAll(teardownDb)
beforeEach(async () => {
  user     = await createUser()
  account  = await createAccount(user.id, { balance: 5000 })
  category = await createCategory(user.id)
  token    = createTokenPair(user).accessToken
})

describe('GET /api/v1/stats/dashboard', () => {
  it('200 — returns dashboard with all required fields', async () => {
    await createTransaction(user.id, account.id, category.id, { type: 'income',  amount: 3000 })
    await createTransaction(user.id, account.id, category.id, { type: 'expense', amount: 500 })

    const res = await request(app).get('/api/v1/stats/dashboard').set({
      Authorization: `Bearer ${token}`,
    })

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('balance')
    expect(res.body.data).toHaveProperty('income')
    expect(res.body.data).toHaveProperty('expenses')
    expect(res.body.data).toHaveProperty('saved')
    expect(res.body.data).toHaveProperty('categoryBreakdown')
    expect(res.body.data).toHaveProperty('monthlySummary')
    expect(res.body.data.monthlySummary).toHaveLength(12)
  })

  it('401 — requires authentication', async () => {
    const res = await request(app).get('/api/v1/stats/dashboard')
    expect(res.status).toBe(401)
  })

  it('200 — saved equals income minus expenses', async () => {
    await createTransaction(user.id, account.id, category.id, { type: 'income',  amount: 2000 })
    await createTransaction(user.id, account.id, category.id, { type: 'expense', amount: 300 })

    const res = await request(app).get('/api/v1/stats/dashboard').set({
      Authorization: `Bearer ${token}`,
    })

    const { income, expenses, saved } = res.body.data
    expect(saved).toBeCloseTo(income - expenses)
  })
})
