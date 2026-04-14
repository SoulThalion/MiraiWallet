import { query, body } from 'express-validator'

export const statsMonthOverviewRules = [
  query('month')
    .optional()
    .isString()
    .matches(/^\d{4}-(0[1-9]|1[0-2])$/)
    .withMessage('month must be YYYY-MM'),
]

export const statsRecurringDismissRules = [
  body('patternKey')
    .trim()
    .notEmpty()
    .withMessage('patternKey is required')
    .isLength({ min: 1, max: 400 })
    .withMessage('patternKey must be 1–400 characters'),
]

export const statsRecurringSavingsRules = [
  body('patternKey')
    .trim()
    .notEmpty()
    .withMessage('patternKey is required')
    .isLength({ min: 1, max: 400 })
    .withMessage('patternKey must be 1–400 characters'),
  body('isSavings')
    .isBoolean()
    .withMessage('isSavings must be boolean'),
]

export const statsRecurringRecategorizeRules = [
  body('patternKey')
    .trim()
    .notEmpty()
    .withMessage('patternKey is required')
    .isLength({ min: 1, max: 400 })
    .withMessage('patternKey must be 1–400 characters'),
  body('categoryId')
    .optional({ nullable: true })
    .isUUID()
    .withMessage('categoryId must be UUID'),
  body('subcategoryId')
    .optional({ nullable: true })
    .isUUID()
    .withMessage('subcategoryId must be UUID'),
]
