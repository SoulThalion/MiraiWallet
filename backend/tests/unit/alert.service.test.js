'use strict'

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupDb, teardownDb } from '../helpers/setup.js'
import { createUser, createAlert } from '../helpers/factories.js'
import * as alertService from '../../src/services/alert.service.js'

let user

beforeAll(setupDb)
afterAll(teardownDb)
beforeEach(async () => {
  user = await createUser()
})

describe('alertService.list', () => {
  it('returns only non-dismissed alerts for user', async () => {
    await createAlert(user.id)
    await createAlert(user.id, { isDismissed: true })
    const { rows } = await alertService.list(user.id, {})
    expect(rows).toHaveLength(1)
    expect(rows[0].isDismissed).toBe(false)
  })

  it('does not return alerts from other users', async () => {
    const other = await createUser()
    await createAlert(other.id)
    const { rows } = await alertService.list(user.id, {})
    expect(rows).toHaveLength(0)
  })
})

describe('alertService.markRead', () => {
  it('sets isRead to true', async () => {
    const alert   = await createAlert(user.id, { isRead: false })
    const updated = await alertService.markRead(alert.id, user.id)
    expect(updated.isRead).toBe(true)
  })

  it('throws 404 for unknown alert', async () => {
    await expect(
      alertService.markRead('00000000-0000-0000-0000-000000000000', user.id)
    ).rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('alertService.dismiss', () => {
  it('sets isDismissed to true', async () => {
    const alert = await createAlert(user.id)
    await alertService.dismiss(alert.id, user.id)
    const { rows } = await alertService.list(user.id, {})
    expect(rows.find(a => a.id === alert.id)).toBeUndefined()
  })
})

describe('alertService.dismissAll', () => {
  it('dismisses every active alert for the user', async () => {
    await createAlert(user.id)
    await createAlert(user.id)
    await alertService.dismissAll(user.id)
    const { total } = await alertService.list(user.id, {})
    expect(total).toBe(0)
  })
})

describe('alertService.unreadCount', () => {
  it('returns correct count of unread alerts', async () => {
    await createAlert(user.id, { isRead: false })
    await createAlert(user.id, { isRead: true })
    await createAlert(user.id, { isRead: false, isDismissed: true })
    const count = await alertService.unreadCount(user.id)
    expect(count).toBe(1)
  })
})
