import { body, query } from 'express-validator'

export const createTransactionRules = [
  body('accountId').notEmpty().isUUID(),
  body('categoryId').optional().isUUID(),
  body('description').trim().notEmpty().isLength({ max: 200 }),
  body('amount').notEmpty().isFloat({ min: 0.01 }).withMessage('Amount must be > 0'),
  body('type').notEmpty().isIn(['income', 'expense', 'transfer']),
  body('date').notEmpty().isDate().withMessage('Date must be YYYY-MM-DD'),
  body('notes').optional().trim().isLength({ max: 1000 }),
  body('isRecurring').optional().isBoolean(),
  body('recurringPeriod').optional().isIn(['daily', 'weekly', 'monthly', 'yearly']),
  body('importSource').optional().isIn(['manual', 'csv', 'bank_api']),
]

export const updateTransactionRules = [
  body('description').optional().trim().isLength({ min: 1, max: 200 }),
  body('amount').optional().isFloat({ min: 0.01 }),
  body('type').optional().isIn(['income', 'expense', 'transfer']),
  body('date').optional().isDate(),
  body('notes').optional().trim().isLength({ max: 1000 }),
  body('categoryId').optional().isUUID(),
  body('isRecurring').optional().isBoolean(),
  body('recurringPeriod').optional().isIn(['daily', 'weekly', 'monthly', 'yearly']),
]

export const listTransactionRules = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('type').optional().isIn(['income', 'expense', 'transfer']),
  query('categoryId').optional().isUUID(),
  query('accountId').optional().isUUID(),
  query('from').optional().isDate(),
  query('to').optional().isDate(),
]
