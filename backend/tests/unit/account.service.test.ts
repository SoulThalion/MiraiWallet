import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupDb, teardownDb }          from '../helpers/setup'
import { createUser, createAccount }    from '../helpers/factories'
import * as accountService              from '../../src/services/account.service'
import { User }                         from '../../src/models'
import type { User as UserType }        from '../../src/models/User'

let user: UserType

beforeAll(setupDb)
afterAll(teardownDb)
beforeEach(async () => { await User.destroy({ where: {}, truncate: true }); user = await createUser() })

describe('create', () => {
  it('creates account for the user', async () => {
    const acc = await accountService.create(user.id, { name: 'Savings', type: 'savings' })
    expect(acc.userId).toBe(user.id)
    expect(acc.name).toBe('Savings')
  })
})

describe('list', () => {
  it('returns only active accounts', async () => {
    await createAccount(user.id, { isActive: true })
    await createAccount(user.id, { isActive: false })
    const accs = await accountService.list(user.id)
    expect(accs.every(a => a.isActive)).toBe(true)
    expect(accs).toHaveLength(1)
  })

  it('does not return other users accounts', async () => {
    const other = await createUser()
    await createAccount(other.id)
    expect(await accountService.list(user.id)).toHaveLength(0)
  })
})

describe('findById', () => {
  it('returns the account when found', async () => {
    const acc = await createAccount(user.id)
    expect((await accountService.findById(acc.id, user.id)).id).toBe(acc.id)
  })

  it('throws 404 for another users account', async () => {
    const other = await createUser()
    const acc   = await createAccount(other.id)
    await expect(accountService.findById(acc.id, user.id))
      .rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('update', () => {
  it('updates account fields', async () => {
    const acc     = await createAccount(user.id)
    const updated = await accountService.update(acc.id, user.id, { name: 'Updated' })
    expect(updated.name).toBe('Updated')
  })
})

describe('remove', () => {
  it('soft-deletes (isActive = false)', async () => {
    const acc = await createAccount(user.id)
    await accountService.remove(acc.id, user.id)
    expect(await accountService.list(user.id)).toHaveLength(0)
  })
})

describe('totalBalance', () => {
  it('sums only active account balances', async () => {
    await createAccount(user.id, { balance: 500 })
    await createAccount(user.id, { balance: 300 })
    await createAccount(user.id, { balance: 200, isActive: false })
    expect(await accountService.totalBalance(user.id)).toBeCloseTo(800)
  })

  it('returns 0 when no accounts', async () => {
    const empty = await createUser()
    expect(await accountService.totalBalance(empty.id)).toBe(0)
  })
})
