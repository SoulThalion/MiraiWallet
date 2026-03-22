'use strict'

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupDb, teardownDb }                from '../helpers/setup.js'
import { createUser, createAccount }          from '../helpers/factories.js'
import * as accountService                    from '../../src/services/account.service.js'

let user

beforeAll(setupDb)
afterAll(teardownDb)
beforeEach(async () => { user = await createUser() })

describe('accountService.create', () => {
  it('creates account for user', async () => {
    const acc = await accountService.create(user.id, { name: 'Savings', type: 'savings' })
    expect(acc.userId).toBe(user.id)
    expect(acc.name).toBe('Savings')
  })
})

describe('accountService.list', () => {
  it('returns only active accounts for user', async () => {
    await createAccount(user.id, { isActive: true })
    await createAccount(user.id, { isActive: false })
    const accs = await accountService.list(user.id)
    expect(accs.every(a => a.isActive)).toBe(true)
    expect(accs.length).toBe(1)
  })

  it('does not return other users accounts', async () => {
    const other = await createUser()
    await createAccount(other.id)
    const accs = await accountService.list(user.id)
    expect(accs).toHaveLength(0)
  })
})

describe('accountService.findById', () => {
  it('returns account when found', async () => {
    const acc   = await createAccount(user.id)
    const found = await accountService.findById(acc.id, user.id)
    expect(found.id).toBe(acc.id)
  })

  it('throws 404 when account belongs to another user', async () => {
    const other = await createUser()
    const acc   = await createAccount(other.id)
    await expect(accountService.findById(acc.id, user.id))
      .rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('accountService.update', () => {
  it('updates account fields', async () => {
    const acc     = await createAccount(user.id)
    const updated = await accountService.update(acc.id, user.id, { name: 'Updated' })
    expect(updated.name).toBe('Updated')
  })
})

describe('accountService.remove', () => {
  it('soft-deletes account (isActive = false)', async () => {
    const acc = await createAccount(user.id)
    await accountService.remove(acc.id, user.id)
    const list = await accountService.list(user.id)
    expect(list.find(a => a.id === acc.id)).toBeUndefined()
  })
})

describe('accountService.totalBalance', () => {
  it('sums balances of all active accounts', async () => {
    await createAccount(user.id, { balance: 500 })
    await createAccount(user.id, { balance: 300 })
    await createAccount(user.id, { balance: 200, isActive: false })
    const total = await accountService.totalBalance(user.id)
    expect(total).toBeCloseTo(800)
  })

  it('returns 0 when user has no accounts', async () => {
    const empty = await createUser()
    const total = await accountService.totalBalance(empty.id)
    expect(total).toBe(0)
  })
})
