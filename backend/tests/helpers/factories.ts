import { User, Account, Category, Subcategory, Transaction, Alert, Budget } from '../../src/models'
import { AlertAction } from '../../src/models/Alert'

let _counter = 0
const uid = () => `${++_counter}-${Date.now()}`

export async function createUser(overrides: Partial<{
  name: string; email: string; passwordHash: string; role: 'user'|'admin'; isActive: boolean
}> = {}): Promise<User> {
  return User.create({
    name:         'Test User',
    email:        `user-${uid()}@test.com`,
    passwordHash: 'Password1',
    role:         'user',
    isActive:     true,
    ...overrides,
  })
}

export async function createAccount(userId: string, overrides: Partial<{
  name: string; type: 'checking'|'savings'|'investment'|'cash'; balance: number; isActive: boolean
}> = {}): Promise<Account> {
  return Account.create({ userId, name: 'Test Account', type: 'checking', balance: 1000, ...overrides })
}

export async function createCategory(userId: string, overrides: Partial<{
  name: string; icon: string; color: string; monthlyBudget: number; type: 'expense'|'income'; isDefault: boolean
}> = {}): Promise<Category> {
  return Category.create({
    userId, name: `Cat-${uid()}`, icon: '💰', color: '#1A8CFF', monthlyBudget: 500, type: 'expense',
    ...overrides,
  })
}

export async function createSubcategory(
  userId: string,
  categoryId: string,
  overrides: Partial<{ name: string; icon: string; color: string }> = {},
): Promise<Subcategory> {
  return Subcategory.create({
    userId,
    categoryId,
    name: `Sub-${uid()}`,
    icon: '📁',
    color: '#2EC776',
    ...overrides,
  })
}

export async function createTransaction(
  userId: string, accountId: string, categoryId: string,
  overrides: Partial<{
    description: string
    amount: number
    type: 'income'|'expense'|'transfer'
    date: string
    subcategoryId: string | null
    isExcluded: boolean
  }> = {},
): Promise<Transaction> {
  return Transaction.create({
    userId, accountId, categoryId,
    description: 'Test tx',
    amount:      50,
    type:        'expense',
    date:        new Date().toISOString().split('T')[0],
    importSource: 'manual',
    ...overrides,
  })
}

export async function createAlert(userId: string, overrides: Partial<{
  type: 'danger'|'warning'|'success'|'info'; badge: string; title: string;
  body: string; amount: string; actions: AlertAction[]; isRead: boolean; isDismissed: boolean
}> = {}): Promise<Alert> {
  return Alert.create({
    userId, type: 'info', badge: 'INFO', title: 'Test alert',
    body: 'Test body', amount: '€100',
    actions: [{ label: 'OK', style: 'primary' }],
    ...overrides,
  })
}

export async function createBudget(userId: string, categoryId: string, overrides: Partial<{
  amount: number; month: string; notes: string
}> = {}): Promise<Budget> {
  return Budget.create({
    userId, categoryId,
    amount: 500,
    month:  new Date().toISOString().slice(0, 7),
    ...overrides,
  })
}
