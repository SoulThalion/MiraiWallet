'use strict'

const { User, Category, Account } = require('../models')
const { createTokenPair, verifyRefreshToken } = require('../utils/jwt')
const ApiError                    = require('../utils/ApiError')

/**
 * Auth service — register, login, refresh, logout, changePassword.
 * No HTTP concerns here; only domain logic.
 */

// Default categories created for every new user
const DEFAULT_CATEGORIES = [
  { name: 'Hogar',       icon: '🏠', color: '#1A8CFF', monthlyBudget: 700,  type: 'expense' },
  { name: 'Comida',      icon: '🍔', color: '#2EC776', monthlyBudget: 400,  type: 'expense' },
  { name: 'Transporte',  icon: '🚗', color: '#F5C842', monthlyBudget: 250,  type: 'expense' },
  { name: 'Ocio',        icon: '🎬', color: '#7F77DD', monthlyBudget: 200,  type: 'expense' },
  { name: 'Salud',       icon: '💊', color: '#FF5A5A', monthlyBudget: 150,  type: 'expense' },
  { name: 'Suscripciones', icon: '📱', color: '#00C8D4', monthlyBudget: 50, type: 'expense' },
  { name: 'Nómina',      icon: '💰', color: '#2EC776', monthlyBudget: 0,    type: 'income'  },
]

async function register({ name, email, password }) {
  const existing = await User.findOne({ where: { email } })
  if (existing) throw ApiError.conflict('Email already registered')

  const user = await User.create({ name, email, passwordHash: password })

  // Seed default categories + one account
  await Category.bulkCreate(
    DEFAULT_CATEGORIES.map(c => ({ ...c, userId: user.id, isDefault: true }))
  )
  await Account.create({
    userId:      user.id,
    name:        'Cuenta principal',
    type:        'checking',
    balance:     0,
    institution: 'Mi banco',
  })

  const tokens = createTokenPair(user)
  await user.update({ refreshToken: tokens.refreshToken, lastLoginAt: new Date() })

  return { user: user.toSafeJSON(), ...tokens }
}

async function login({ email, password }) {
  const user = await User.findOne({ where: { email } })
  if (!user || !user.isActive) throw ApiError.unauthorized('Invalid credentials')

  const valid = await user.comparePassword(password)
  if (!valid) throw ApiError.unauthorized('Invalid credentials')

  const tokens = createTokenPair(user)
  await user.update({ refreshToken: tokens.refreshToken, lastLoginAt: new Date() })

  return { user: user.toSafeJSON(), ...tokens }
}

async function refresh({ refreshToken }) {
  let payload
  try {
    payload = verifyRefreshToken(refreshToken)
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token')
  }

  const user = await User.findByPk(payload.sub)
  if (!user || !user.isActive || user.refreshToken !== refreshToken) {
    throw ApiError.unauthorized('Refresh token revoked')
  }

  const tokens = createTokenPair(user)
  await user.update({ refreshToken: tokens.refreshToken })

  return tokens
}

async function logout(userId) {
  await User.update({ refreshToken: null }, { where: { id: userId } })
}

async function changePassword(user, { currentPassword, newPassword }) {
  const valid = await user.comparePassword(currentPassword)
  if (!valid) throw ApiError.badRequest('Current password is incorrect')

  await user.update({ passwordHash: newPassword, refreshToken: null })
}

async function getProfile(userId) {
  const user = await User.findByPk(userId)
  if (!user) throw ApiError.notFound('User')
  return user.toSafeJSON()
}

async function updateProfile(user, data) {
  const allowed = ['name']
  const updates = Object.fromEntries(
    Object.entries(data).filter(([k]) => allowed.includes(k))
  )
  await user.update(updates)
  return user.toSafeJSON()
}

module.exports = { register, login, refresh, logout, changePassword, getProfile, updateProfile }
