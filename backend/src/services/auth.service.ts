import { User, Category, Account, Transaction as LedgerTransaction, Budget, Subcategory } from '../models'
import { createTokenPair, verifyRefreshToken } from '../utils/jwt'
import { ApiError }    from '../utils/ApiError'
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

export async function updateProfile(user: User, data: { name?: string }): Promise<object> {
  await user.update({ name: data.name })
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
    const transactions = await LedgerTransaction.destroy({ where: { userId: user.id }, transaction: trx })
    const budgets        = await Budget.destroy({ where: { userId: user.id }, transaction: trx })
    const subcategories  = await Subcategory.destroy({ where: { userId: user.id }, transaction: trx })
    const categories     = await Category.destroy({ where: { userId: user.id }, transaction: trx })
    await Account.update({ balance: 0 }, { where: { userId: user.id }, transaction: trx })
    return { transactions, budgets, subcategories, categories }
  })
}
