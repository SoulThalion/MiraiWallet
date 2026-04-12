import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupDb, teardownDb }     from '../helpers/setup'
import { createUser, createAlert } from '../helpers/factories'
import * as alertService           from '../../src/services/alert.service'
import { User, Alert }             from '../../src/models'

let user: import('../../src/models/User').User

beforeAll(setupDb)
afterAll(teardownDb)

// ✅ Bug 2 fix: destroy ALL alerts before each test so counts are predictable
beforeEach(async () => {
  await Alert.destroy({ where: {} })
  await User.destroy({ where: {}, truncate: true })
  user = await createUser()
})

describe('list', () => {
  it('returns only non-dismissed alerts for the user', async () => {
    await createAlert(user.id)
    await createAlert(user.id, { isDismissed: true })
    const { rows } = await alertService.list(user.id, {})
    expect(rows).toHaveLength(1)
    expect(rows[0].isDismissed).toBe(false)
  })

  it('does not return other users alerts', async () => {
    const other = await createUser()
    await createAlert(other.id)
    const { rows } = await alertService.list(user.id, {})
    expect(rows).toHaveLength(0)
  })
})

describe('markRead', () => {
  it('sets isRead = true', async () => {
    const alert   = await createAlert(user.id, { isRead: false })
    const updated = await alertService.markRead(alert.id, user.id)
    expect(updated.isRead).toBe(true)
  })

  it('throws 404 for unknown id', async () => {
    await expect(alertService.markRead('00000000-0000-0000-0000-000000000000', user.id))
      .rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('dismiss', () => {
  it('hides alert from list after dismiss', async () => {
    const alert = await createAlert(user.id)
    await alertService.dismiss(alert.id, user.id)
    const { rows } = await alertService.list(user.id, {})
    expect(rows.find(a => a.id === alert.id)).toBeUndefined()
  })
})

describe('dismissAll', () => {
  it('clears all active alerts for the user', async () => {
    await createAlert(user.id)
    await createAlert(user.id)
    await alertService.dismissAll(user.id)
    // ✅ Bug 2 fix: using meta.total instead of hard-coded 0
    const { meta } = await alertService.list(user.id, {})
    expect(meta.total).toBe(0)
  })

  it('does not affect other users alerts', async () => {
    const other = await createUser()
    await createAlert(other.id)
    await alertService.dismissAll(user.id)
    const { meta } = await alertService.list(other.id, {})
    expect(meta.total).toBe(1)
  })
})

describe('unreadCount', () => {
  it('counts only unread + non-dismissed', async () => {
    await createAlert(user.id, { isRead: false })
    await createAlert(user.id, { isRead: true })
    await createAlert(user.id, { isRead: false, isDismissed: true })
    const count = await alertService.unreadCount(user.id)
    expect(count).toBe(1)
  })
})
