'use strict'

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupDb, teardownDb }           from '../helpers/setup.js'
import { createUser, createCategory }    from '../helpers/factories.js'
import * as categoryService              from '../../src/services/category.service.js'

let user

beforeAll(setupDb)
afterAll(teardownDb)
beforeEach(async () => { user = await createUser() })

describe('categoryService.create', () => {
  it('creates a category for user', async () => {
    const cat = await categoryService.create(user.id, { name: 'Travel', icon: '✈️' })
    expect(cat.userId).toBe(user.id)
    expect(cat.name).toBe('Travel')
  })

  it('throws 409 on duplicate name for same user', async () => {
    await categoryService.create(user.id, { name: 'Gym' })
    await expect(categoryService.create(user.id, { name: 'Gym' }))
      .rejects.toMatchObject({ statusCode: 409 })
  })

  it('allows same category name for different users', async () => {
    const other = await createUser()
    await categoryService.create(user.id,  { name: 'Gym' })
    const cat = await categoryService.create(other.id, { name: 'Gym' })
    expect(cat.name).toBe('Gym')
  })
})

describe('categoryService.list', () => {
  it('returns all categories for user sorted by name', async () => {
    await createCategory(user.id, { name: 'Zoo' })
    await createCategory(user.id, { name: 'Art' })
    const cats = await categoryService.list(user.id)
    expect(cats[0].name).toBe('Art')
  })
})

describe('categoryService.update', () => {
  it('updates category fields', async () => {
    const cat     = await createCategory(user.id)
    const updated = await categoryService.update(cat.id, user.id, { name: 'New Name', icon: '🎯' })
    expect(updated.name).toBe('New Name')
    expect(updated.icon).toBe('🎯')
  })
})

describe('categoryService.remove', () => {
  it('deletes a non-default category', async () => {
    const cat = await createCategory(user.id, { isDefault: false })
    await categoryService.remove(cat.id, user.id)
    const cats = await categoryService.list(user.id)
    expect(cats.find(c => c.id === cat.id)).toBeUndefined()
  })

  it('throws 400 when trying to delete a default category', async () => {
    const cat = await createCategory(user.id, { isDefault: true })
    await expect(categoryService.remove(cat.id, user.id))
      .rejects.toMatchObject({ statusCode: 400 })
  })

  it('throws 404 when category does not belong to user', async () => {
    const other = await createUser()
    const cat   = await createCategory(other.id)
    await expect(categoryService.remove(cat.id, user.id))
      .rejects.toMatchObject({ statusCode: 404 })
  })
})
