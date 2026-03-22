'use strict'

const { User, Account, Category, Transaction, Alert, Budget } = require('../../src/models')

let counter = 0
const uid = () => `test-${++counter}-${Date.now()}`

async function createUser(overrides = {}) {
  return User.create({
    name:         'Test User',
    email:        `user-${uid()}@test.com`,
    passwordHash: 'Password1',
    role:         'user',
    isActive:     true,
    ...overrides,
  })
}

async function createAccount(userId, overrides = {}) {
  return Account.create({
    userId,
    name:     'Test Account',
    type:     'checking',
    balance:  1000,
    currency: 'EUR',
    ...overrides,
  })
}

async function createCategory(userId, overrides = {}) {
  return Category.create({
    userId,
    name:          `Category-${uid()}`,
    icon:          '💰',
    color:         '#1A8CFF',
    monthlyBudget: 500,
    type:          'expense',
    ...overrides,
  })
}

async function createTransaction(userId, accountId, categoryId, overrides = {}) {
  return Transaction.create({
    userId,
    accountId,
    categoryId,
    description: 'Test transaction',
    amount:      50,
    type:        'expense',
    date:        new Date().toISOString().split('T')[0],
    importSource: 'manual',
    ...overrides,
  })
}

async function createAlert(userId, overrides = {}) {
  return Alert.create({
    userId,
    type:    'info',
    badge:   'INFO',
    title:   'Test alert',
    body:    'Test body',
    amount:  '€100',
    actions: [{ label: 'OK', style: 'primary' }],
    ...overrides,
  })
}

async function createBudget(userId, categoryId, overrides = {}) {
  return Budget.create({
    userId,
    categoryId,
    amount: 500,
    month:  new Date().toISOString().slice(0, 7),
    ...overrides,
  })
}

module.exports = {
  createUser,
  createAccount,
  createCategory,
  createTransaction,
  createAlert,
  createBudget,
}
