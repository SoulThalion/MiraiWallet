import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupDb, teardownDb } from '../helpers/setup'
import { createUser }          from '../helpers/factories'
import * as authService        from '../../src/services/auth.service'
import { User, Category, Account } from '../../src/models'

beforeAll(setupDb)
afterAll(teardownDb)
beforeEach(async () => { await User.destroy({ where: {}, truncate: true }) })

describe('register', () => {
  it('returns tokens and safe user (no passwordHash)', async () => {
    const r = await authService.register({ name: 'Ana', email: 'ana@t.com', password: 'Password1' })
    expect(r.accessToken).toBeDefined()
    expect(r.refreshToken).toBeDefined()
    expect((r.user as Record<string, unknown>).passwordHash).toBeUndefined()
  })

  it('seeds default categories', async () => {
    const r    = await authService.register({ name: 'Bob', email: 'bob@t.com', password: 'Password1' })
    const cats = await Category.findAll({ where: { userId: (r.user as { id: string }).id } })
    expect(cats.length).toBeGreaterThan(0)
  })

  it('seeds a default account', async () => {
    const r       = await authService.register({ name: 'Eve', email: 'eve@t.com', password: 'Password1' })
    const accounts = await Account.findAll({ where: { userId: (r.user as { id: string }).id } })
    expect(accounts).toHaveLength(1)
  })

  it('throws 409 on duplicate email', async () => {
    await authService.register({ name: 'X', email: 'dup@t.com', password: 'Password1' })
    await expect(authService.register({ name: 'Y', email: 'dup@t.com', password: 'Password1' }))
      .rejects.toMatchObject({ statusCode: 409 })
  })
})

describe('login', () => {
  it('returns tokens for valid credentials', async () => {
    await authService.register({ name: 'C', email: 'c@t.com', password: 'Password1' })
    const r = await authService.login({ email: 'c@t.com', password: 'Password1' })
    expect(r.accessToken).toBeDefined()
  })

  it('throws 401 for wrong password', async () => {
    await authService.register({ name: 'D', email: 'd@t.com', password: 'Password1' })
    await expect(authService.login({ email: 'd@t.com', password: 'Wrong1' }))
      .rejects.toMatchObject({ statusCode: 401 })
  })

  it('throws 401 for non-existent user', async () => {
    await expect(authService.login({ email: 'ghost@t.com', password: 'Password1' }))
      .rejects.toMatchObject({ statusCode: 401 })
  })

  it('throws 401 for inactive user', async () => {
    const u = await createUser({ isActive: false })
    await expect(authService.login({ email: u.email, password: 'Password1' }))
      .rejects.toMatchObject({ statusCode: 401 })
  })
})

describe('refresh', () => {
  it('returns new token pair for valid refresh token', async () => {
    const reg    = await authService.register({ name: 'R', email: 'r@t.com', password: 'Password1' })
    const tokens = await authService.refresh(reg.refreshToken)
    expect(tokens.accessToken).toBeDefined()
  })

  it('throws 401 for invalid token string', async () => {
    await expect(authService.refresh('not.valid.token'))
      .rejects.toMatchObject({ statusCode: 401 })
  })

  it('throws 401 after logout (revoked token)', async () => {
    const reg = await authService.register({ name: 'L', email: 'l@t.com', password: 'Password1' })
    await authService.logout((reg.user as { id: string }).id)
    await expect(authService.refresh(reg.refreshToken))
      .rejects.toMatchObject({ statusCode: 401 })
  })
})

describe('changePassword', () => {
  it('updates hash and revokes refresh token', async () => {
    const reg  = await authService.register({ name: 'P', email: 'p@t.com', password: 'Password1' })
    const user = await User.findByPk((reg.user as { id: string }).id)!
    await authService.changePassword(user!, { currentPassword: 'Password1', newPassword: 'NewPass9' })
    const updated = await User.findByPk(user!.id)
    expect(updated!.refreshToken).toBeNull()
    expect(await updated!.comparePassword('NewPass9')).toBe(true)
  })

  it('throws 400 for wrong current password', async () => {
    const reg  = await authService.register({ name: 'Q', email: 'q@t.com', password: 'Password1' })
    const user = await User.findByPk((reg.user as { id: string }).id)
    await expect(authService.changePassword(user!, { currentPassword: 'Wrong', newPassword: 'NewPass9' }))
      .rejects.toMatchObject({ statusCode: 400 })
  })
})
