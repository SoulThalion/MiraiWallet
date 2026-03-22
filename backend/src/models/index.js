'use strict'

const { sequelize }              = require('../config/database')
const { User,        initUser }        = require('./User')
const { Account,     initAccount }     = require('./Account')
const { Category,    initCategory }    = require('./Category')
const { Transaction, initTransaction } = require('./Transaction')
const { Alert,       initAlert }       = require('./Alert')
const { Budget,      initBudget }      = require('./Budget')

// ── Initialise all models ─────────────────────────────────
initUser(sequelize)
initAccount(sequelize)
initCategory(sequelize)
initTransaction(sequelize)
initAlert(sequelize)
initBudget(sequelize)

// ── Associations ──────────────────────────────────────────

// User → Account
User.hasMany(Account,     { foreignKey: 'userId', as: 'accounts',     onDelete: 'CASCADE' })
Account.belongsTo(User,   { foreignKey: 'userId', as: 'user' })

// User → Category
User.hasMany(Category,    { foreignKey: 'userId', as: 'categories',   onDelete: 'CASCADE' })
Category.belongsTo(User,  { foreignKey: 'userId', as: 'user' })

// User → Transaction
User.hasMany(Transaction, { foreignKey: 'userId', as: 'transactions', onDelete: 'CASCADE' })
Transaction.belongsTo(User, { foreignKey: 'userId', as: 'user' })

// Account → Transaction
Account.hasMany(Transaction,  { foreignKey: 'accountId',  as: 'transactions', onDelete: 'CASCADE' })
Transaction.belongsTo(Account, { foreignKey: 'accountId', as: 'account' })

// Category → Transaction
Category.hasMany(Transaction,    { foreignKey: 'categoryId', as: 'transactions' })
Transaction.belongsTo(Category,  { foreignKey: 'categoryId', as: 'category' })

// User → Alert
User.hasMany(Alert,    { foreignKey: 'userId', as: 'alerts', onDelete: 'CASCADE' })
Alert.belongsTo(User,  { foreignKey: 'userId', as: 'user' })

// User → Budget
User.hasMany(Budget,      { foreignKey: 'userId', as: 'budgets', onDelete: 'CASCADE' })
Budget.belongsTo(User,    { foreignKey: 'userId', as: 'user' })

// Category → Budget
Category.hasMany(Budget,  { foreignKey: 'categoryId', as: 'budgets' })
Budget.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' })

module.exports = {
  sequelize,
  User,
  Account,
  Category,
  Transaction,
  Alert,
  Budget,
}
