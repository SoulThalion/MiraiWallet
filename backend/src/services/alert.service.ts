import { Alert }                            from '../models'
import { ApiError }                         from '../utils/ApiError'
import { parsePagination, buildPaginationMeta } from '../utils/pagination'
import { AlertType, PaginationMeta }        from '../types'
import { AlertAction }                      from '../models/Alert'

interface AlertQuery { page?: string; limit?: string; type?: AlertType }

export async function list(
  userId: string, query: AlertQuery
): Promise<{ rows: Alert[]; meta: PaginationMeta }> {
  const { page, limit, offset } = parsePagination(query, { page: 1, limit: 50 })
  const where: Record<string, unknown> = { userId, isDismissed: false }
  if (query.type) where.type = query.type

  const { count, rows } = await Alert.findAndCountAll({
    where, order: [['createdAt', 'DESC']], limit, offset,
  })
  return { rows, meta: buildPaginationMeta(page, limit, count) }
}

export async function findById(id: string, userId: string): Promise<Alert> {
  const alert = await Alert.findOne({ where: { id, userId } })
  if (!alert) throw ApiError.notFound('Alert')
  return alert
}

export async function create(
  userId: string,
  data: { type: AlertType; badge: string; title: string; body: string; amount?: string; actions?: AlertAction[] }
): Promise<Alert> {
  return Alert.create({ ...data, userId })
}

export async function markRead(id: string, userId: string): Promise<Alert> {
  const alert = await findById(id, userId)
  return alert.update({ isRead: true })
}

export async function dismiss(id: string, userId: string): Promise<void> {
  const alert = await findById(id, userId)
  await alert.update({ isDismissed: true })
}

export async function dismissAll(userId: string): Promise<void> {
  await Alert.update({ isDismissed: true }, { where: { userId, isDismissed: false } })
}

export async function unreadCount(userId: string): Promise<number> {
  return Alert.count({ where: { userId, isRead: false, isDismissed: false } })
}
