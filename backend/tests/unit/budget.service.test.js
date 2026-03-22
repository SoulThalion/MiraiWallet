'use strict'

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupDb, teardownDb } from '../helpers/setup.js'
import { createUser, createCategory, createBudget } from '../helpers/factories.js'
import * as budgetService from '../../src/services/budget.service.js'

let user, category

beforeAll(setupDb)
afterAll(teardownDb)
beforeEach(async () => {
  user     = await createUser()
  category = await createCategory(user.id)
})

describe('budgetService.upsert', () => {
  it('creates a new budget', async () => {
    const month  = '2024-03'
    const budget = await budgetService.upsert(user.id, {
      categoryId: category.id, amount: 400, month
    })
    expect(budget.amount).toBe(400)
    expect(budget.month).toBe(month)
  })

  it('updates existing budget for same category+month', async () => {
    const month = '2024-04'
    await budgetService.upsert(user.id, { categoryId: category.id, amount: 200, month })
    await budgetService.upsert(user.id, { categoryId: category.id, amount: 350, month })

    const budgets = await budgetService.listWithSpending(user.id, month)
    expect(budgets).toHaveLength(1)
    expect(budgets[0].amount).toBe(350)
  })

  it('throws 404 when category does not belong to user', async () => {
    const other    = await createUser()
    const otherCat = await createCategory(other.id)
    await expect(
      budgetService.upsert(user.id, { categoryId: otherCat.id, amount: 100, month: '2024-05' })
    ).rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('budgetService.listWithSpending', () => {
  it('returns pct=0 when nothing spent', async () => {
    const month = '2024-06'
    await budgetService.upsert(user.id, { categoryId: category.id, amount: 500, month })
    const result = await budgetService.listWithSpending(user.id, month)
    expect(result[0].pct).toBe(0)
    expect(result[0].spent).toBe(0)
  })

  it('calculates remaining correctly', async () => {
    const month = '2024-07'
    await budgetService.upsert(user.id, { categoryId: category.id, amount: 300, month })
    const result = await budgetService.listWithSpending(user.id, month)
    expect(result[0].remaining).toBe(300)
  })
})

describe('budgetService.remove', () => {
  it('deletes an existing budget', async () => {
    const budget = await createBudget(user.id, category.id, { month: '2024-08' })
    await budgetService.remove(budget.id, user.id)
    const remaining = await budgetService.listWithSpending(user.id, '2024-08')
    expect(remaining).toHaveLength(0)
  })

  it('throws 404 for unknown budget', async () => {
    await expect(
      budgetService.remove('00000000-0000-0000-0000-000000000000', user.id)
    ).rejects.toMatchObject({ statusCode: 404 })
  })
})
