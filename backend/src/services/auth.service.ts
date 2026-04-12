import {
  User, Category, Account, Transaction as LedgerTransaction, Budget, Subcategory,
  RecurringPatternDismissal,
} from '../models'
import { createTokenPair, verifyRefreshToken } from '../utils/jwt'
import { ApiError }    from '../utils/ApiError'
import type { MonthCycleAnchor, MonthCycleConfig, MonthCycleMode } from '../utils/monthPeriod'
import { ymToDateBounds } from '../utils/monthPeriod'
import { RegisterDto, LoginDto, ChangePasswordDto, TokenPair } from '../types'

const DEFAULT_CATEGORIES = [
  { name: 'Hogar',        icon: '🏠', color: '#1A8CFF', monthlyBudget: 700,  type: 'expense' as const },
  { name: 'Comida',       icon: '🍔', color: '#2EC776', monthlyBudget: 400,  type: 'expense' as const },
  { name: 'Transporte',   icon: '🚗', color: '#F5C842', monthlyBudget: 250,  type: 'expense' as const },
  { name: 'Ocio',         icon: '🎬', color: '#7F77DD', monthlyBudget: 200,  type: 'expense' as const },
  { name: 'Salud',        icon: '💊', color: '#FF5A5A', monthlyBudget: 150,  type: 'expense' as const },
  { name: 'Suscripciones',icon: '📱', color: '#00C8D4', monthlyBudget: 50,   type: 'expense' as const },
  { name: 'Nómina',       icon: '💰', color: '#2EC776', monthlyBudget: 0,    type: 'income'  as const },
]

export async function register(dto: RegisterDto): Promise<{ user: object } & TokenPair> {
  const existing = await User.findOne({ where: { email: dto.email } })
  if (existing) throw ApiError.conflict('Email already registered')

  const user = await User.create({ name: dto.name, email: dto.email, passwordHash: dto.password })

  await Category.bulkCreate(
    DEFAULT_CATEGORIES.map(c => ({ ...c, userId: user.id, isDefault: true }))
  )
  await Account.create({ userId: user.id, name: 'Cuenta principal', type: 'checking', balance: 0 })

  const tokens = createTokenPair(user)
  await user.update({ refreshToken: tokens.refreshToken, lastLoginAt: new Date() })
  return { user: user.toSafeJSON(), ...tokens }
}

export async function login(dto: LoginDto): Promise<{ user: object } & TokenPair> {
  const user = await User.findOne({ where: { email: dto.email } })
  if (!user || !user.isActive) throw ApiError.unauthorized('Invalid credentials')

  const valid = await user.comparePassword(dto.password)
  if (!valid) throw ApiError.unauthorized('Invalid credentials')

  const tokens = createTokenPair(user)
  await user.update({ refreshToken: tokens.refreshToken, lastLoginAt: new Date() })
  return { user: user.toSafeJSON(), ...tokens }
}

export async function refresh(refreshToken: string): Promise<TokenPair> {
  let payload
  try { payload = verifyRefreshToken(refreshToken) }
  catch { throw ApiError.unauthorized('Invalid or expired refresh token') }

  const user = await User.findByPk(payload.sub)
  if (!user || !user.isActive || user.refreshToken !== refreshToken) {
    throw ApiError.unauthorized('Refresh token revoked')
  }

  const tokens = createTokenPair(user)
  await user.update({ refreshToken: tokens.refreshToken })
  return tokens
}

export async function logout(userId: string): Promise<void> {
  await User.update({ refreshToken: null }, { where: { id: userId } })
}

export async function changePassword(user: User, dto: ChangePasswordDto): Promise<void> {
  const valid = await user.comparePassword(dto.currentPassword)
  if (!valid) throw ApiError.badRequest('Current password is incorrect')
  await user.update({ passwordHash: dto.newPassword, refreshToken: null })
}

export async function getProfile(userId: string): Promise<object> {
  const user = await User.findByPk(userId)
  if (!user) throw ApiError.notFound('User')
  return user.toSafeJSON()
}

function floorDay(n: unknown): number {
  return Math.floor(Number(n))
}

function validateCustomMonthCycle(start: number, end: number, anchor: MonthCycleAnchor): void {
  const cfg: MonthCycleConfig = { mode: 'custom', startDay: start, endDay: end, anchor }
  for (const ym of ['2024-01', '2024-02', '2024-06', '2024-12'] as const) {
    let from: string
    let to: string
    try {
      ;({ from, to } = ymToDateBounds(ym, cfg))
    } catch (e) {
      throw ApiError.badRequest(e instanceof Error ? e.message : 'Periodo de mes inválido')
    }
    if (from > to) {
      throw ApiError.badRequest('La fecha de inicio del periodo no puede ser posterior a la de fin.')
    }
  }
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function updateProfile(
  user: User,
  data: {
    name?: string
    monthCycleMode?: MonthCycleMode
    monthCycleStartDay?: number
    monthCycleEndDay?: number
    monthCycleAnchor?: MonthCycleAnchor
    recurringExcludedCategoryIds?: string[] | null
    recurringExcludedSubcategoryIds?: string[] | null
  },
): Promise<object> {
  const patch: Partial<{
    name: string
    monthCycleMode: MonthCycleMode
    monthCycleStartDay: number
    monthCycleEndDay: number
    monthCycleAnchor: MonthCycleAnchor
    recurringExcludedCategoryIds: string[]
    recurringExcludedSubcategoryIds: string[]
  }> = {}

  if (typeof data.name === 'string') {
    const t = data.name.trim()
    if (t.length >= 2) patch.name = t
  }

  if (data.monthCycleMode !== undefined) {
    if (data.monthCycleMode !== 'calendar' && data.monthCycleMode !== 'custom') {
      throw ApiError.badRequest('monthCycleMode must be calendar or custom')
    }
    patch.monthCycleMode = data.monthCycleMode
  }
  if (data.monthCycleStartDay !== undefined) {
    const n = floorDay(data.monthCycleStartDay)
    if (!Number.isInteger(n) || n < 1 || n > 31) {
      throw ApiError.badRequest('monthCycleStartDay must be an integer between 1 and 31')
    }
    patch.monthCycleStartDay = n
  }
  if (data.monthCycleEndDay !== undefined) {
    const n = floorDay(data.monthCycleEndDay)
    if (!Number.isInteger(n) || n < 1 || n > 31) {
      throw ApiError.badRequest('monthCycleEndDay must be an integer between 1 and 31')
    }
    patch.monthCycleEndDay = n
  }
  if (data.monthCycleAnchor !== undefined) {
    if (data.monthCycleAnchor !== 'previous' && data.monthCycleAnchor !== 'current') {
      throw ApiError.badRequest('monthCycleAnchor must be previous or current')
    }
    patch.monthCycleAnchor = data.monthCycleAnchor
  }

  if (data.recurringExcludedCategoryIds !== undefined) {
    if (data.recurringExcludedCategoryIds === null) {
      patch.recurringExcludedCategoryIds = []
    } else if (!Array.isArray(data.recurringExcludedCategoryIds)) {
      throw ApiError.badRequest('recurringExcludedCategoryIds must be an array of category UUIDs')
    } else {
      const ids = [...new Set(data.recurringExcludedCategoryIds.map(x => String(x).trim()).filter(Boolean))].slice(0, 80)
      for (const id of ids) {
        if (!UUID_RE.test(id)) throw ApiError.badRequest(`Invalid category id: ${id}`)
        const cat = await Category.findOne({ where: { id, userId: user.id }, attributes: ['id'] })
        if (!cat) throw ApiError.badRequest('Unknown category for recurring exclusion')
      }
      patch.recurringExcludedCategoryIds = ids
    }
  }

  if (data.recurringExcludedSubcategoryIds !== undefined) {
    if (data.recurringExcludedSubcategoryIds === null) {
      patch.recurringExcludedSubcategoryIds = []
    } else if (!Array.isArray(data.recurringExcludedSubcategoryIds)) {
      throw ApiError.badRequest('recurringExcludedSubcategoryIds must be an array of subcategory UUIDs')
    } else {
      const ids = [...new Set(data.recurringExcludedSubcategoryIds.map(x => String(x).trim()).filter(Boolean))].slice(0, 120)
      for (const id of ids) {
        if (!UUID_RE.test(id)) throw ApiError.badRequest(`Invalid subcategory id: ${id}`)
        const sub = await Subcategory.findOne({ where: { id, userId: user.id }, attributes: ['id'] })
        if (!sub) throw ApiError.badRequest('Unknown subcategory for recurring exclusion')
      }
      patch.recurringExcludedSubcategoryIds = ids
    }
  }

  const nextMode = (patch.monthCycleMode ?? user.monthCycleMode ?? 'calendar') as MonthCycleMode
  const nextStart = patch.monthCycleStartDay ?? floorDay(user.monthCycleStartDay ?? 1)
  const nextEnd = patch.monthCycleEndDay ?? floorDay(user.monthCycleEndDay ?? 31)
  const nextAnchor = (patch.monthCycleAnchor ?? user.monthCycleAnchor ?? 'previous') as MonthCycleAnchor

  if (nextMode === 'custom') {
    validateCustomMonthCycle(nextStart, nextEnd, nextAnchor)
  }

  if (Object.keys(patch).length > 0) await user.update(patch)
  await user.reload()
  return user.toSafeJSON()
}

export interface WipeFinancialDataResult {
  transactions:  number
  budgets:       number
  subcategories: number
  categories:    number
}

/** Borra movimientos, presupuestos, subcategorías y categorías del usuario; pone saldos de cuentas a 0. */
export async function wipeFinancialData(user: User, password: string): Promise<WipeFinancialDataResult> {
  const valid = await user.comparePassword(password)
  if (!valid) throw ApiError.badRequest('Contraseña incorrecta')

  const sequelize = LedgerTransaction.sequelize
  if (!sequelize) throw ApiError.internal('Database not configured')

  return sequelize.transaction(async (trx) => {
    await RecurringPatternDismissal.destroy({ where: { userId: user.id }, transaction: trx })
    const transactions = await LedgerTransaction.destroy({ where: { userId: user.id }, transaction: trx })
    const budgets        = await Budget.destroy({ where: { userId: user.id }, transaction: trx })
    const subcategories  = await Subcategory.destroy({ where: { userId: user.id }, transaction: trx })
    const categories     = await Category.destroy({ where: { userId: user.id }, transaction: trx })
    await Account.update({ balance: 0 }, { where: { userId: user.id }, transaction: trx })
    return { transactions, budgets, subcategories, categories }
  })
}
