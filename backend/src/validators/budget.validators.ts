import { body, query } from 'express-validator'

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

export const budgetRecommendationQueryRules = [
  query('month').optional().matches(/^\d{4}-(0[1-9]|1[0-2])$/).withMessage('Month must be YYYY-MM'),
  query('profile').optional().isIn(['conservative', 'balanced', 'flexible']),
  query('targetSavingsRate').optional().isFloat({ min: 0.05, max: 0.6 }),
]

export const applyBudgetRecommendationRules = [
  body('month').notEmpty().matches(/^\d{4}-(0[1-9]|1[0-2])$/).withMessage('Month must be YYYY-MM'),
  body('profile').optional().isIn(['conservative', 'balanced', 'flexible']),
  body('targetSavingsRate').optional().isFloat({ min: 0.05, max: 0.6 }),
  body('mode').optional().isIn(['all', 'categories', 'subcategories']),
  body('categoryIds').optional().isArray(),
  body('categoryIds.*').optional().isUUID(),
  body('subcategoryIds').optional().isArray(),
  body('subcategoryIds.*').optional().isUUID(),
]
