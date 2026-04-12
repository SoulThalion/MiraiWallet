import { Request } from 'express'
import { User } from '../models/User'

// ── HTTP ──────────────────────────────────────────────────
export interface AuthRequest extends Request {
  user: User
}

// ── JWT ───────────────────────────────────────────────────
export interface JwtPayload {
  sub:  string
  role: UserRole
  iat?: number
  exp?: number
}

// ── Domain enums ──────────────────────────────────────────
export type UserRole           = 'user' | 'admin'
export type AccountType        = 'checking' | 'savings' | 'investment' | 'cash'
export type TransactionType    = 'income' | 'expense' | 'transfer'
export type RecurringPeriod    = 'daily' | 'weekly' | 'monthly' | 'yearly'
export type ImportSource       = 'manual' | 'csv' | 'bank_api'
export type AlertType          = 'danger' | 'warning' | 'success' | 'info'
export type CategoryType       = 'expense' | 'income'

// ── Service DTOs ──────────────────────────────────────────
export interface RegisterDto {
  name:     string
  email:    string
  password: string
}

export interface LoginDto {
  email:    string
  password: string
}

export interface ChangePasswordDto {
  currentPassword: string
  newPassword:     string
}

export interface CreateTransactionDto {
  accountId:       string
  categoryId?:     string
  description:     string
  amount:          number
  type:            TransactionType
  date:            string
  notes?:          string
  isRecurring?:    boolean
  recurringPeriod?: RecurringPeriod
  importSource?:   ImportSource
}

export interface UpdateTransactionDto {
  description?:    string
  amount?:         number
  type?:           TransactionType
  date?:           string
  notes?:          string
  categoryId?:     string
  isRecurring?:    boolean
  recurringPeriod?: RecurringPeriod
}

export interface TransactionQuery {
  page?:        string
  limit?:       string
  type?:        TransactionType
  accountId?:   string
  categoryId?:  string
  from?:        string
  to?:          string
}

export interface CreateAccountDto {
  name:         string
  type?:        AccountType
  balance?:     number
  currency?:    string
  institution?: string
  color?:       string
}

export interface CreateCategoryDto {
  name:           string
  icon?:          string
  color?:         string
  monthlyBudget?: number
  type?:          CategoryType
}

export interface UpsertBudgetDto {
  categoryId: string
  amount:     number
  month:      string
  notes?:     string
}

export interface TokenPair {
  accessToken:  string
  refreshToken: string
  tokenType:    string
  expiresIn:    string
}

export interface PaginationMeta {
  page:       number
  limit:      number
  total:      number
  totalPages: number
  hasNext:    boolean
  hasPrev:    boolean
}
