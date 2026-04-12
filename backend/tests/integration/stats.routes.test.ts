import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import request   from 'supertest'
import { createApp }  from '../../src/app'
import { setupDb, teardownDb }             from '../helpers/setup'
import {
  createUser,
  createAccount,
  createCategory,
  createSubcategory,
  createTransaction,
  createBudget,
} from '../helpers/factories'
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
    expect(typeof d.totals.yearExpenseTotal).toBe('number')
    expect(typeof d.totals.yearIncomeTotal).toBe('number')
    expect(typeof d.totals.yearIncomeAvgPerMonth).toBe('number')
    expect(Array.isArray(d.expenseCategoryYearAvg)).toBe(true)
    expect(Array.isArray(d.expenseSubcategoryYearAvg)).toBe(true)
    expect(Array.isArray(d.incomeCategoryYearAvg)).toBe(true)
    expect(Array.isArray(d.incomeSubcategoryYearAvg)).toBe(true)
    expect(Array.isArray(d.recurringExpenses)).toBe(true)
  })

  it('recurringExpenses — mismo concepto, importe y día en dos meses distintos', async () => {
    const sub = await createSubcategory(user.id, category.id)
    const desc = 'Suscripción demo'
    await createTransaction(user.id, account.id, category.id, {
      type: 'expense',
      amount: 15.99,
      date: '2025-04-10',
      description: desc,
      subcategoryId: sub.id,
    })
    await createTransaction(user.id, account.id, category.id, {
      type: 'expense',
      amount: 15.99,
      date: '2025-05-10',
      description: desc,
      subcategoryId: sub.id,
    })
    const res = await request(app).get(MONTH_OVERVIEW).query({ month: '2025-05' }).set({ Authorization: `Bearer ${token}` })
    expect(res.status).toBe(200)
    const rec = res.body.data.recurringExpenses as Array<{ amount: number; dayOfMonth: number; occurrenceCount: number }>
    const hit = rec.find(r => r.dayOfMonth === 10 && Math.abs(r.amount - 15.99) < 0.02)
    expect(hit).toBeDefined()
    expect(hit!.occurrenceCount).toBe(2)
    expect(typeof (hit as { patternKey?: string }).patternKey).toBe('string')
    expect((hit as { patternKey: string }).patternKey.length).toBeGreaterThan(0)
  })

  it('recurringExpenses — une variantes de concepto tipo ING (prefijo y puntuación)', async () => {
    const sub = await createSubcategory(user.id, category.id)
    await createTransaction(user.id, account.id, category.id, {
      type: 'expense',
      amount: 13.99,
      date: '2025-06-28',
      description: 'Pago en NETFLIX.COM',
      subcategoryId: sub.id,
    })
    await createTransaction(user.id, account.id, category.id, {
      type: 'expense',
      amount: 13.99,
      date: '2025-07-28',
      description: 'pago en netflix com',
      subcategoryId: sub.id,
    })
    const res = await request(app).get(MONTH_OVERVIEW).query({ month: '2025-07' }).set({ Authorization: `Bearer ${token}` })
    expect(res.status).toBe(200)
    const rec = res.body.data.recurringExpenses as Array<{ dayOfMonth: number; occurrenceCount: number }>
    const hit = rec.find(r => r.dayOfMonth === 28 && r.occurrenceCount === 2)
    expect(hit).toBeDefined()
  })

  it('recurringExpenses — categoría excluida en perfil no genera filas', async () => {
    const sub = await createSubcategory(user.id, category.id)
    await createTransaction(user.id, account.id, category.id, {
      type: 'expense',
      amount: 7.5,
      date: '2025-08-12',
      description: 'Cargo demo excl',
      subcategoryId: sub.id,
    })
    await createTransaction(user.id, account.id, category.id, {
      type: 'expense',
      amount: 7.5,
      date: '2025-09-12',
      description: 'Cargo demo excl',
      subcategoryId: sub.id,
    })
    let res = await request(app).get(MONTH_OVERVIEW).query({ month: '2025-09' }).set({ Authorization: `Bearer ${token}` })
    expect(res.status).toBe(200)
    let rec = res.body.data.recurringExpenses as Array<{ description: string }>
    expect(rec.some(r => r.description.includes('Cargo demo excl'))).toBe(true)

    const patch = await request(app)
      .patch('/api/v1/auth/me')
      .set({ Authorization: `Bearer ${token}` })
      .send({ recurringExcludedCategoryIds: [category.id] })
    expect(patch.status).toBe(200)

    res = await request(app).get(MONTH_OVERVIEW).query({ month: '2025-09' }).set({ Authorization: `Bearer ${token}` })
    rec = res.body.data.recurringExpenses as Array<{ description: string }>
    expect(rec.some(r => r.description.includes('Cargo demo excl'))).toBe(false)
  })

  it('recurringExpenses — subcategoría excluida en perfil no genera filas (resto de la categoría sí)', async () => {
    const subA = await createSubcategory(user.id, category.id, { name: 'Sub A' })
    const subB = await createSubcategory(user.id, category.id, { name: 'Sub B' })
    await createTransaction(user.id, account.id, category.id, {
      type: 'expense',
      amount: 3,
      date: '2025-10-03',
      description: 'Solo sub A',
      subcategoryId: subA.id,
    })
    await createTransaction(user.id, account.id, category.id, {
      type: 'expense',
      amount: 3,
      date: '2025-11-03',
      description: 'Solo sub A',
      subcategoryId: subA.id,
    })
    await createTransaction(user.id, account.id, category.id, {
      type: 'expense',
      amount: 9,
      date: '2025-10-04',
      description: 'Solo sub B',
      subcategoryId: subB.id,
    })
    await createTransaction(user.id, account.id, category.id, {
      type: 'expense',
      amount: 9,
      date: '2025-11-04',
      description: 'Solo sub B',
      subcategoryId: subB.id,
    })

    let res = await request(app).get(MONTH_OVERVIEW).query({ month: '2025-11' }).set({ Authorization: `Bearer ${token}` })
    expect(res.status).toBe(200)
    let rec = res.body.data.recurringExpenses as Array<{ description: string }>
    expect(rec.some(r => r.description.includes('Solo sub A'))).toBe(true)
    expect(rec.some(r => r.description.includes('Solo sub B'))).toBe(true)

    const patch = await request(app)
      .patch('/api/v1/auth/me')
      .set({ Authorization: `Bearer ${token}` })
      .send({ recurringExcludedSubcategoryIds: [subA.id] })
    expect(patch.status).toBe(200)

    res = await request(app).get(MONTH_OVERVIEW).query({ month: '2025-11' }).set({ Authorization: `Bearer ${token}` })
    rec = res.body.data.recurringExpenses as Array<{ description: string }>
    expect(rec.some(r => r.description.includes('Solo sub A'))).toBe(false)
    expect(rec.some(r => r.description.includes('Solo sub B'))).toBe(true)
  })

  it('POST /stats/recurring-dismiss — oculta hasta un mes posterior al descarte', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2025, 10, 15))
    try {
      const sub = await createSubcategory(user.id, category.id)
      await createTransaction(user.id, account.id, category.id, {
        type: 'expense',
        amount: 4,
        date: '2025-09-08',
        description: 'Patrón dismiss test',
        subcategoryId: sub.id,
      })
      await createTransaction(user.id, account.id, category.id, {
        type: 'expense',
        amount: 4,
        date: '2025-10-08',
        description: 'Patrón dismiss test',
        subcategoryId: sub.id,
      })
      let res = await request(app).get(MONTH_OVERVIEW).query({ month: '2025-10' }).set({ Authorization: `Bearer ${token}` })
      let rec = res.body.data.recurringExpenses as Array<{ patternKey: string; description: string }>
      const hit = rec.find(r => r.description.includes('Patrón dismiss test'))
      expect(hit).toBeDefined()
      const dismissRes = await request(app)
        .post('/api/v1/stats/recurring-dismiss')
        .set({ Authorization: `Bearer ${token}` })
        .send({ patternKey: hit!.patternKey })
      expect(dismissRes.status).toBe(204)

      res = await request(app).get(MONTH_OVERVIEW).query({ month: '2025-10' }).set({ Authorization: `Bearer ${token}` })
      rec = res.body.data.recurringExpenses as Array<{ description: string }>
      expect(rec.find(r => r.description.includes('Patrón dismiss test'))).toBeUndefined()

      vi.setSystemTime(new Date(2025, 11, 5))
      await createTransaction(user.id, account.id, category.id, {
        type: 'expense',
        amount: 4,
        date: '2025-12-08',
        description: 'Patrón dismiss test',
        subcategoryId: sub.id,
      })
      res = await request(app).get(MONTH_OVERVIEW).query({ month: '2025-12' }).set({ Authorization: `Bearer ${token}` })
      rec = res.body.data.recurringExpenses as Array<{ description: string }>
      expect(rec.find(r => r.description.includes('Patrón dismiss test'))).toBeDefined()
    } finally {
      vi.useRealTimers()
    }
  })

  it('medias anuales por categoría y subcategoría (gasto e ingreso)', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 5, 15))
    try {
      const sub = await createSubcategory(user.id, category.id, { name: 'Super' })
      await createTransaction(user.id, account.id, category.id, {
        type: 'expense',
        amount: 100,
        date: '2026-01-10',
        subcategoryId: sub.id,
      })
      await createTransaction(user.id, account.id, category.id, {
        type: 'expense',
        amount: 200,
        date: '2026-06-05',
        subcategoryId: sub.id,
      })
      await createTransaction(user.id, account.id, category.id, {
        type: 'expense',
        amount: 50,
        date: '2026-06-06',
      })
      const incCat = await createCategory(user.id, { type: 'income', name: 'Nómina' })
      await createTransaction(user.id, account.id, incCat.id, {
        type: 'income',
        amount: 2400,
        date: '2026-01-01',
      })
      const res = await request(app)
        .get(MONTH_OVERVIEW)
        .query({ month: '2026-06' })
        .set({ Authorization: `Bearer ${token}` })
      expect(res.status).toBe(200)
      const d = res.body.data
      const catRow = d.expenseCategoryYearAvg.find((r: { categoryId: string }) => r.categoryId === category.id)
      expect(catRow.totalYear).toBeCloseTo(350)
      // Solo enero y junio tienen gastos → media / 2 meses con datos (feb–may sin movimientos no cuentan).
      expect(catRow.avgPerMonth).toBeCloseTo(350 / 2)
      const subRow = d.expenseSubcategoryYearAvg.find((r: { subcategoryId: string }) => r.subcategoryId === sub.id)
      expect(subRow.totalYear).toBeCloseTo(300)
      expect(subRow.avgPerMonth).toBeCloseTo(300 / 2)
      const noSub = d.expenseSubcategoryYearAvg.find(
        (r: { categoryId: string; subcategoryId: string | null }) =>
          r.categoryId === category.id && r.subcategoryId === null,
      )
      expect(noSub.totalYear).toBeCloseTo(50)
      const incRow = d.incomeCategoryYearAvg.find((r: { categoryId: string }) => r.categoryId === incCat.id)
      expect(incRow.totalYear).toBeCloseTo(2400)
      expect(incRow.avgPerMonth).toBeCloseTo(2400 / 1)
    } finally {
      vi.useRealTimers()
    }
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
