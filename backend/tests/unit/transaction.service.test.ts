import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupDb, teardownDb }   from '../helpers/setup'
import { createUser, createAccount, createCategory, createTransaction } from '../helpers/factories'
import * as txService            from '../../src/services/transaction.service'
import { User, Account }         from '../../src/models'

let user: User, account: Account

beforeAll(setupDb)
afterAll(teardownDb)
beforeEach(async () => {
  await User.destroy({ where: {}, truncate: true })
  user    = await createUser()
  account = await createAccount(user.id, { balance: 1000 })
})

describe('create', () => {
  it('deducts balance for expense', async () => {
    const cat = await createCategory(user.id)
    await txService.create(user.id, {
      accountId: account.id, categoryId: cat.id,
      description: 'Test', amount: 100, type: 'expense',
      date: new Date().toISOString().split('T')[0],
    })
    const upd = await Account.findByPk(account.id)
    expect(upd!.balance).toBeCloseTo(900)
  })

  it('adds balance for income', async () => {
    const cat = await createCategory(user.id)
    await txService.create(user.id, {
      accountId: account.id, categoryId: cat.id,
      description: 'Salary', amount: 2000, type: 'income',
      date: new Date().toISOString().split('T')[0],
    })
    const upd = await Account.findByPk(account.id)
    expect(upd!.balance).toBeCloseTo(3000)
  })

  it('throws 404 if account belongs to another user', async () => {
    const other   = await createUser()
    const otherAc = await createAccount(other.id)
    const cat     = await createCategory(user.id)
    await expect(txService.create(user.id, {
      accountId: otherAc.id, categoryId: cat.id,
      description: 'X', amount: 10, type: 'expense',
      date: new Date().toISOString().split('T')[0],
    })).rejects.toMatchObject({ statusCode: 404 })
  })

  it('includes account and category relations', async () => {
    const cat = await createCategory(user.id)
    const tx  = await txService.create(user.id, {
      accountId: account.id, categoryId: cat.id,
      description: 'With relations', amount: 25, type: 'expense',
      date: new Date().toISOString().split('T')[0],
    })
    expect(tx.account).toBeDefined()
    expect(tx.category).toBeDefined()
  })
})

describe('update', () => {
  it('adjusts balance when amount changes', async () => {
    const cat = await createCategory(user.id)
    const tx  = await createTransaction(user.id, account.id, cat.id, { amount: 50, type: 'expense' })
    await Account.update({ balance: 950 }, { where: { id: account.id } })
    await txService.update(tx.id, user.id, { amount: 100 })
    const upd = await Account.findByPk(account.id)
    expect(upd!.balance).toBeCloseTo(900)
  })

  it('throws 404 for tx not owned by user', async () => {
    const other   = await createUser()
    const otherAc = await createAccount(other.id)
    const cat     = await createCategory(user.id)
    const tx      = await createTransaction(other.id, otherAc.id, cat.id)
    await expect(txService.update(tx.id, user.id, { description: 'hack' }))
      .rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('remove', () => {
  it('restores balance on delete', async () => {
    const cat = await createCategory(user.id)
    const tx  = await createTransaction(user.id, account.id, cat.id, { amount: 200, type: 'expense' })
    await Account.update({ balance: 800 }, { where: { id: account.id } })
    await txService.remove(tx.id, user.id)
    const upd = await Account.findByPk(account.id)
    expect(upd!.balance).toBeCloseTo(1000)
  })
})

describe('list', () => {
  it('returns only the requesting users transactions', async () => {
    const other   = await createUser()
    const otherAc = await createAccount(other.id)
    const cat     = await createCategory(user.id)
    await createTransaction(other.id, otherAc.id, cat.id)
    await createTransaction(user.id,  account.id,  cat.id)
    const { rows } = await txService.list(user.id, {})
    expect(rows.every(t => t.userId === user.id)).toBe(true)
  })

  it('paginates results', async () => {
    const cat = await createCategory(user.id)
    for (let i = 0; i < 5; i++) await createTransaction(user.id, account.id, cat.id)
    const { rows, meta } = await txService.list(user.id, { page: '1', limit: '3' })
    expect(rows).toHaveLength(3)
    expect(meta.total).toBe(5)
  })

  it('filters by type', async () => {
    const cat = await createCategory(user.id)
    await createTransaction(user.id, account.id, cat.id, { type: 'income',  amount: 1000 })
    await createTransaction(user.id, account.id, cat.id, { type: 'expense', amount: 50 })
    const { rows } = await txService.list(user.id, { type: 'income' })
    expect(rows.every(t => t.type === 'income')).toBe(true)
  })
})

describe('monthlySummary', () => {
  it('returns exactly 12 months', async () => {
    const r = await txService.monthlySummary(user.id, new Date().getFullYear())
    expect(r).toHaveLength(12)
  })

  it('each month has income, expenses, transfers, net', async () => {
    const r = await txService.monthlySummary(user.id, new Date().getFullYear())
    r.forEach(m => {
      expect(m).toHaveProperty('income')
      expect(m).toHaveProperty('expenses')
      expect(m).toHaveProperty('transfers')
      expect(m).toHaveProperty('net')
    })
  })
})
