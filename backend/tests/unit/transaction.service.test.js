'use strict'

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupDb, teardownDb }   from '../helpers/setup.js'
import { createUser, createAccount, createCategory, createTransaction } from '../helpers/factories.js'
import * as txService            from '../../src/services/transaction.service.js'
import { Account }               from '../../src/models/index.js'

let user, account, category

beforeAll(setupDb)
afterAll(teardownDb)

beforeEach(async () => {
  user     = await createUser()
  account  = await createAccount(user.id, { balance: 1000 })
  category = await createCategory(user.id)
})

describe('transactionService.create', () => {
  it('creates a transaction and deducts balance for expense', async () => {
    await txService.create(user.id, {
      accountId:   account.id,
      categoryId:  category.id,
      description: 'Test expense',
      amount:      100,
      type:        'expense',
      date:        new Date().toISOString().split('T')[0],
    })
    const updated = await Account.findByPk(account.id)
    expect(updated.balance).toBeCloseTo(900)
  })

  it('creates a transaction and adds balance for income', async () => {
    await txService.create(user.id, {
      accountId:   account.id,
      categoryId:  category.id,
      description: 'Salary',
      amount:      2000,
      type:        'income',
      date:        new Date().toISOString().split('T')[0],
    })
    const updated = await Account.findByPk(account.id)
    expect(updated.balance).toBeCloseTo(3000)
  })

  it('throws 404 if account does not belong to user', async () => {
    const otherUser    = await createUser()
    const otherAccount = await createAccount(otherUser.id)
    await expect(
      txService.create(user.id, {
        accountId: otherAccount.id, categoryId: category.id,
        description: 'X', amount: 10, type: 'expense',
        date: new Date().toISOString().split('T')[0],
      })
    ).rejects.toMatchObject({ statusCode: 404 })
  })

  it('includes account and category in returned object', async () => {
    const tx = await txService.create(user.id, {
      accountId:   account.id,
      categoryId:  category.id,
      description: 'With relations',
      amount:      25,
      type:        'expense',
      date:        new Date().toISOString().split('T')[0],
    })
    expect(tx.account).toBeDefined()
    expect(tx.category).toBeDefined()
  })
})

describe('transactionService.update', () => {
  it('adjusts balance when amount changes', async () => {
    const tx = await createTransaction(user.id, account.id, category.id, { amount: 50, type: 'expense' })
    await Account.update({ balance: 950 }, { where: { id: account.id } })

    await txService.update(tx.id, user.id, { amount: 100 })
    const updated = await Account.findByPk(account.id)
    expect(updated.balance).toBeCloseTo(900)
  })

  it('throws 404 for transaction not owned by user', async () => {
    const other   = await createUser()
    const otherAc = await createAccount(other.id)
    const tx      = await createTransaction(other.id, otherAc.id, category.id)
    await expect(
      txService.update(tx.id, user.id, { description: 'hack' })
    ).rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('transactionService.remove', () => {
  it('deletes transaction and restores balance', async () => {
    const tx = await createTransaction(user.id, account.id, category.id, { amount: 200, type: 'expense' })
    await Account.update({ balance: 800 }, { where: { id: account.id } })

    await txService.remove(tx.id, user.id)
    const updated = await Account.findByPk(account.id)
    expect(updated.balance).toBeCloseTo(1000)
  })
})

describe('transactionService.list', () => {
  it('returns only transactions for the requesting user', async () => {
    const other   = await createUser()
    const otherAc = await createAccount(other.id)
    await createTransaction(other.id, otherAc.id, category.id)
    await createTransaction(user.id, account.id, category.id)

    const { rows } = await txService.list(user.id, {})
    expect(rows.every(t => t.userId === user.id)).toBe(true)
  })

  it('paginates results correctly', async () => {
    for (let i = 0; i < 5; i++) {
      await createTransaction(user.id, account.id, category.id)
    }
    const { rows, total } = await txService.list(user.id, { page: '1', limit: '3' })
    expect(rows.length).toBe(3)
    expect(total).toBe(5)
  })

  it('filters by type', async () => {
    await createTransaction(user.id, account.id, category.id, { type: 'income', amount: 1000 })
    await createTransaction(user.id, account.id, category.id, { type: 'expense', amount: 50 })

    const { rows } = await txService.list(user.id, { type: 'income' })
    expect(rows.every(t => t.type === 'income')).toBe(true)
  })
})

describe('transactionService.monthlySummary', () => {
  it('returns 12 months', async () => {
    const result = await txService.monthlySummary(user.id, new Date().getFullYear())
    expect(result).toHaveLength(12)
  })

  it('each month has income, expenses, net', async () => {
    const result = await txService.monthlySummary(user.id, new Date().getFullYear())
    result.forEach(m => {
      expect(m).toHaveProperty('income')
      expect(m).toHaveProperty('expenses')
      expect(m).toHaveProperty('net')
    })
  })
})

describe('transactionService.categoryBreakdown', () => {
  it('returns sorted array by total descending', async () => {
    const cat2 = await createCategory(user.id)
    await createTransaction(user.id, account.id, category.id,  { amount: 300, type: 'expense' })
    await createTransaction(user.id, account.id, cat2.id,      { amount: 100, type: 'expense' })

    const month  = new Date().toISOString().slice(0, 7)
    const result = await txService.categoryBreakdown(user.id, month)
    expect(result[0].total).toBeGreaterThanOrEqual(result[1]?.total ?? 0)
  })
})
