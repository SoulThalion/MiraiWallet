import { body } from 'express-validator'

export const upsertBudgetRules = [
  body('categoryId').notEmpty().isUUID(),
  body('amount').notEmpty().isFloat({ min: 0 }),
  body('month').notEmpty().matches(/^\d{4}-(0[1-9]|1[0-2])$/).withMessage('Month must be YYYY-MM'),
  body('notes').optional().trim().isLength({ max: 500 }),
]

export const upsertSubcategoryBudgetRules = [
  body('subcategoryId').notEmpty().isUUID(),
  body('amount').notEmpty().isFloat({ min: 0 }),
  body('month').notEmpty().matches(/^\d{4}-(0[1-9]|1[0-2])$/).withMessage('Month must be YYYY-MM'),
]
