import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request   from 'supertest'
import { createApp }  from '../../src/app'
import { setupDb, teardownDb }             from '../helpers/setup'
import { createUser, createAccount, createCategory, createTransaction, createBudget } from '../helpers/factories'
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
    expect(res.body.data).toHaveProperty('netCashflow')
    expect(res.body.data).toHaveProperty('transfersToSavings')
    expect(res.body.data).toHaveProperty('categoryBreakdown')
    expect(res.body.data).toHaveProperty('categoryIncomeBreakdown')
    expect(res.body.data).toHaveProperty('monthlySummary')
    expect(res.body.data).toHaveProperty('statementSnapshot')
    expect(res.body.data.monthlySummary).toHaveLength(12)
  })

  it('401 — no token', async () => {
    expect((await request(app).get(URL)).status).toBe(401)
  })

  it('netCashflow = income - expenses (traspasos cuentan como gasto)', async () => {
    await createTransaction(user.id, account.id, category.id, { type: 'income',  amount: 2000 })
    await createTransaction(user.id, account.id, category.id, { type: 'expense', amount: 300 })
    await createTransaction(user.id, account.id, category.id, { type: 'transfer', amount: 150 })
    const res = await request(app).get(URL).set({ Authorization: `Bearer ${token}` })
    const { income, expenses, netCashflow, transfersToSavings } = res.body.data
    expect(transfersToSavings).toBe(0)
    expect(expenses).toBeCloseTo(450)
    expect(netCashflow).toBeCloseTo(income - expenses)
  })
})

const MONTH_OVERVIEW = '/api/v1/stats/month-overview'

describe('GET /stats/month-overview', () => {
  it('200 — monthlyBars, categories y totals (gasto del mes sin depender solo de presupuestos)', async () => {
    await createTransaction(user.id, account.id, category.id, {
      type: 'expense',
      amount: 120,
      date: '2026-03-15',
    })
    await createBudget(user.id, category.id, { month: '2026-03', amount: 200 })
    const res = await request(app).get(MONTH_OVERVIEW).query({ month: '2026-03' }).set({ Authorization: `Bearer ${token}` })
    expect(res.status).toBe(200)
    const d = res.body.data
    expect(d.month).toBe('2026-03')
    expect(d.year).toBe(2026)
    expect(d.monthlyBars).toHaveLength(12)
    const mar = d.monthlyBars.find((b: { month: string }) => b.month === '03')
    expect(mar.expenses).toBeCloseTo(120)
    expect(typeof mar.income).toBe('number')
    expect(typeof mar.net).toBe('number')
    expect(mar.isSelectedMonth).toBe(true)
    expect(d.categories.length).toBeGreaterThanOrEqual(1)
    const row = d.categories.find((c: { id: string }) => c.id === category.id)
    expect(row.spent).toBeCloseTo(120)
    expect(row.budget).toBeCloseTo(200)
    expect(d.totals.monthExpenseTotal).toBeCloseTo(120)
    expect(d.totals.monthBudgetTotal).toBeCloseTo(200)
  })

  it('400 — month inválido', async () => {
    const res = await request(app)
      .get(MONTH_OVERVIEW)
      .query({ month: '2026-13' })
      .set({ Authorization: `Bearer ${token}` })
    expect(res.status).toBe(400)
  })

  it('401 — no token', async () => {
    expect((await request(app).get(MONTH_OVERVIEW).query({ month: '2026-01' })).status).toBe(401)
  })
})
