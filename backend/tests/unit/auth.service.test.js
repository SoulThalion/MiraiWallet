'use strict'

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupDb, teardownDb }  from '../helpers/setup.js'
import { createUser }           from '../helpers/factories.js'
import * as authService         from '../../src/services/auth.service.js'
import { User, Category, Account } from '../../src/models/index.js'

beforeAll(setupDb)
afterAll(teardownDb)
beforeEach(async () => {
  await User.destroy({ where: {}, truncate: false, cascade: true })
})

describe('authService.register', () => {
  it('creates a user and returns tokens', async () => {
    const result = await authService.register({
      name: 'Ana López', email: 'ana@test.com', password: 'Password1'
    })
    expect(result.accessToken).toBeDefined()
    expect(result.refreshToken).toBeDefined()
    expect(result.user.email).toBe('ana@test.com')
    expect(result.user.passwordHash).toBeUndefined()
  })

  it('seeds default categories for new user', async () => {
    const result = await authService.register({
      name: 'Bob', email: 'bob@test.com', password: 'Password1'
    })
    const cats = await Category.findAll({ where: { userId: result.user.id } })
    expect(cats.length).toBeGreaterThan(0)
  })

  it('seeds a default account for new user', async () => {
    const result = await authService.register({
      name: 'Eve', email: 'eve@test.com', password: 'Password1'
    })
    const accounts = await Account.findAll({ where: { userId: result.user.id } })
    expect(accounts.length).toBe(1)
  })

  it('throws 409 when email already exists', async () => {
    await authService.register({ name: 'Xavier', email: 'dup@test.com', password: 'Password1' })
    await expect(
      authService.register({ name: 'Yolanda', email: 'dup@test.com', password: 'Password1' })
    ).rejects.toMatchObject({ statusCode: 409 })
  })
})

describe('authService.login', () => {
  it('returns tokens for valid credentials', async () => {
    await authService.register({ name: 'Carlos', email: 'carlos@test.com', password: 'Password1' })
    const result = await authService.login({ email: 'carlos@test.com', password: 'Password1' })
    expect(result.accessToken).toBeDefined()
    expect(result.user.email).toBe('carlos@test.com')
  })

  it('throws 401 for wrong password', async () => {
    await authService.register({ name: 'Daniel', email: 'd@test.com', password: 'Password1' })
    await expect(
      authService.login({ email: 'd@test.com', password: 'WrongPass1' })
    ).rejects.toMatchObject({ statusCode: 401 })
  })

  it('throws 401 for non-existent user', async () => {
    await expect(
      authService.login({ email: 'ghost@test.com', password: 'Password1' })
    ).rejects.toMatchObject({ statusCode: 401 })
  })

  it('throws 401 for inactive user', async () => {
    const user = await createUser({ isActive: false })
    await expect(
      authService.login({ email: user.email, password: 'Password1' })
    ).rejects.toMatchObject({ statusCode: 401 })
  })
})

describe('authService.refresh', () => {
  it('returns new token pair for valid refresh token', async () => {
    const reg    = await authService.register({ name: 'Roberto', email: 'r@test.com', password: 'Password1' })
    const tokens = await authService.refresh({ refreshToken: reg.refreshToken })
    expect(tokens.accessToken).toBeDefined()
    expect(tokens.refreshToken).toBeDefined()
  })

  it('throws 401 for invalid refresh token', async () => {
    await expect(
      authService.refresh({ refreshToken: 'not.a.token' })
    ).rejects.toMatchObject({ statusCode: 401 })
  })

  it('throws 401 for revoked token (after logout)', async () => {
    const reg = await authService.register({ name: 'Laura', email: 'l@test.com', password: 'Password1' })
    await authService.logout(reg.user.id)
    await expect(
      authService.refresh({ refreshToken: reg.refreshToken })
    ).rejects.toMatchObject({ statusCode: 401 })
  })
})

describe('authService.changePassword', () => {
  it('updates password and revokes refresh token', async () => {
    const reg  = await authService.register({ name: 'Pedro', email: 'p@test.com', password: 'Password1' })
    const user = await User.findByPk(reg.user.id)
    await authService.changePassword(user, { currentPassword: 'Password1', newPassword: 'NewPass9' })
    const updated = await User.findByPk(user.id)
    expect(updated.refreshToken).toBeNull()
    const valid = await updated.comparePassword('NewPass9')
    expect(valid).toBe(true)
  })

  it('throws 400 for wrong current password', async () => {
    const reg  = await authService.register({ name: 'Quentin', email: 'q@test.com', password: 'Password1' })
    const user = await User.findByPk(reg.user.id)
    await expect(
      authService.changePassword(user, { currentPassword: 'Wrong1', newPassword: 'NewPass9' })
    ).rejects.toMatchObject({ statusCode: 400 })
  })
})
