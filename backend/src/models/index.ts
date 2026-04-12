import { sequelize }         from '../config/database'
import { User,        initUser }        from './User'
import { Account,     initAccount }     from './Account'
import { Category,    initCategory }    from './Category'
import { Subcategory, initSubcategory } from './Subcategory'
import { Transaction, initTransaction } from './Transaction'
import { Alert,       initAlert }       from './Alert'
import { Budget,      initBudget }      from './Budget'

// ── Init ─────────────────────────────────────────────────
initUser(sequelize)
initAccount(sequelize)
initCategory(sequelize)
initSubcategory(sequelize)
initTransaction(sequelize)
initAlert(sequelize)
initBudget(sequelize)

// ── Associations ─────────────────────────────────────────
User.hasMany(Account,      { foreignKey: 'userId', as: 'accounts',     onDelete: 'CASCADE' })
Account.belongsTo(User,    { foreignKey: 'userId', as: 'user' })

User.hasMany(Category,     { foreignKey: 'userId', as: 'categories',   onDelete: 'CASCADE' })
Category.belongsTo(User,   { foreignKey: 'userId', as: 'user' })

User.hasMany(Subcategory,  { foreignKey: 'userId', as: 'subcategories', onDelete: 'CASCADE' })
Subcategory.belongsTo(User, { foreignKey: 'userId', as: 'user' })
Category.hasMany(Subcategory, { foreignKey: 'categoryId', as: 'subcategories', onDelete: 'CASCADE' })
Subcategory.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' })

User.hasMany(Transaction,  { foreignKey: 'userId', as: 'transactions', onDelete: 'CASCADE' })
Transaction.belongsTo(User,{ foreignKey: 'userId', as: 'user' })

Account.hasMany(Transaction,   { foreignKey: 'accountId',  as: 'transactions', onDelete: 'CASCADE' })
Transaction.belongsTo(Account, { foreignKey: 'accountId',  as: 'account' })

Category.hasMany(Transaction,  { foreignKey: 'categoryId', as: 'transactions' })
Transaction.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' })
Subcategory.hasMany(Transaction, { foreignKey: 'subcategoryId', as: 'transactions' })
Transaction.belongsTo(Subcategory, { foreignKey: 'subcategoryId', as: 'subcategory' })

User.hasMany(Alert,    { foreignKey: 'userId', as: 'alerts',  onDelete: 'CASCADE' })
Alert.belongsTo(User,  { foreignKey: 'userId', as: 'user' })

User.hasMany(Budget,       { foreignKey: 'userId', as: 'budgets', onDelete: 'CASCADE' })
Budget.belongsTo(User,     { foreignKey: 'userId', as: 'user' })

Category.hasMany(Budget,   { foreignKey: 'categoryId', as: 'budgets' })
Budget.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' })

export { sequelize, User, Account, Category, Subcategory, Transaction, Alert, Budget }
