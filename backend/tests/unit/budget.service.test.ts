import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupDb, teardownDb }                from '../helpers/setup'
import { createUser, createCategory, createBudget } from '../helpers/factories'
import * as budgetService                     from '../../src/services/budget.service'
import { User }                               from '../../src/models'
import type { User as UserType }              from '../../src/models/User'
import type { Category as CatType }          from '../../src/models/Category'

let user: UserType, category: CatType

beforeAll(setupDb)
afterAll(teardownDb)
beforeEach(async () => {
  await User.destroy({ where: {}, truncate: true })
  user     = await createUser()
  category = await createCategory(user.id)
})

describe('upsert', () => {
  it('creates a new budget', async () => {
    const b = await budgetService.upsert(user.id, { categoryId: category.id, amount: 400, month: '2024-03' })
    expect(b.amount).toBe(400)
    expect(b.month).toBe('2024-03')
  })

  it('updates existing budget (same category + month)', async () => {
    await budgetService.upsert(user.id, { categoryId: category.id, amount: 200, month: '2024-04' })
    await budgetService.upsert(user.id, { categoryId: category.id, amount: 350, month: '2024-04' })
    const list = await budgetService.listWithSpending(user.id, '2024-04')
    expect(list).toHaveLength(1)
    expect(list[0].amount).toBe(350)
  })

  it('throws 404 for category belonging to another user', async () => {
    const other    = await createUser()
    const otherCat = await createCategory(other.id)
    await expect(budgetService.upsert(user.id, { categoryId: otherCat.id, amount: 100, month: '2024-05' }))
      .rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('listWithSpending', () => {
  it('pct=0 and spent=0 when nothing spent', async () => {
    await budgetService.upsert(user.id, { categoryId: category.id, amount: 500, month: '2024-06' })
    const [result] = await budgetService.listWithSpending(user.id, '2024-06')
    expect(result.pct).toBe(0)
    expect(result.spent).toBe(0)
  })

  it('remaining = amount when nothing spent', async () => {
    await budgetService.upsert(user.id, { categoryId: category.id, amount: 300, month: '2024-07' })
    const [result] = await budgetService.listWithSpending(user.id, '2024-07')
    expect(result.remaining).toBe(300)
  })
})

describe('remove', () => {
  it('deletes the budget', async () => {
    const b = await createBudget(user.id, category.id, { month: '2024-08' })
    await budgetService.remove(b.id, user.id)
    expect(await budgetService.listWithSpending(user.id, '2024-08')).toHaveLength(0)
  })

  it('throws 404 for unknown budget id', async () => {
    await expect(budgetService.remove('00000000-0000-0000-0000-000000000000', user.id))
      .rejects.toMatchObject({ statusCode: 404 })
  })
})
