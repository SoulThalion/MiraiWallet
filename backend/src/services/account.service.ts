import { Account }              from '../models'
import { ApiError }             from '../utils/ApiError'
import { CreateAccountDto }     from '../types'
import { ERROR_CODES } from '../errors/error-codes'

export async function list(userId: string): Promise<Account[]> {
  return Account.findAll({ where: { userId, isActive: true }, order: [['createdAt', 'ASC']] })
}

export async function findById(id: string, userId: string): Promise<Account> {
  const account = await Account.findOne({ where: { id, userId } })
  if (!account) throw ApiError.notFound(ERROR_CODES.ACCOUNT_NOT_FOUND, 'Cuenta')
  return account
}

export async function create(userId: string, data: CreateAccountDto): Promise<Account> {
  return Account.create({ ...data, userId })
}

export async function update(id: string, userId: string, data: Partial<CreateAccountDto>): Promise<Account> {
  const account = await findById(id, userId)
  return account.update(data)
}

export async function remove(id: string, userId: string): Promise<void> {
  const account = await findById(id, userId)
  await account.update({ isActive: false })
}

export async function totalBalance(userId: string): Promise<number> {
  const accounts = await Account.findAll({ where: { userId, isActive: true } })
  return accounts.reduce((sum, a) => sum + a.balance, 0)
}
