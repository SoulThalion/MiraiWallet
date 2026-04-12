import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request   from 'supertest'
import { createApp }  from '../../src/app'
import { setupDb, teardownDb }             from '../helpers/setup'
import { createUser, createAccount, createCategory, createTransaction } from '../helpers/factories'
import { createTokenPair }                 from '../../src/utils/jwt'
import { User }                            from '../../src/models'
import type { Express } from 'express'

let app: Express, token: string
let user: import('../../src/models/User').User
let account: import('../../src/models/Account').Account
let category: import('../../src/models/Category').Category

beforeAll(async () => { await setupDb(); app = createApp() })
afterAll(teardownDb)
beforeEach(async () => {
  await User.destroy({ where: {}, truncate: true })
  user     = await createUser()
  account  = await createAccount(user.id, { balance: 5000 })
  category = await createCategory(user.id)
  token    = createTokenPair(user).accessToken
})

const URL = '/api/v1/stats/dashboard'

describe('GET /stats/dashboard', () => {
  it('200 — returns all required fields', async () => {
    await createTransaction(user.id, account.id, category.id, { type: 'income',  amount: 3000 })
    await createTransaction(user.id, account.id, category.id, { type: 'expense', amount: 500 })
    const res = await request(app).get(URL).set({ Authorization: `Bearer ${token}` })
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('balance')
    expect(res.body.data).toHaveProperty('income')
    expect(res.body.data).toHaveProperty('expenses')
    expect(res.body.data).toHaveProperty('saved')
    expect(res.body.data).toHaveProperty('categoryBreakdown')
    expect(res.body.data).toHaveProperty('monthlySummary')
    expect(res.body.data.monthlySummary).toHaveLength(12)
  })

  it('401 — no token', async () => {
    expect((await request(app).get(URL)).status).toBe(401)
  })

  it('saved = income - expenses', async () => {
    await createTransaction(user.id, account.id, category.id, { type: 'income',  amount: 2000 })
    await createTransaction(user.id, account.id, category.id, { type: 'expense', amount: 300 })
    const res = await request(app).get(URL).set({ Authorization: `Bearer ${token}` })
    const { income, expenses, saved } = res.body.data
    expect(saved).toBeCloseTo(income - expenses)
  })
})
