import { query, body } from 'express-validator'

export const statsMonthOverviewRules = [
  query('month')
    .optional()
    .isString()
    .matches(/^\d{4}-(0[1-9]|1[0-2])$/)
    .withMessage('month must be YYYY-MM'),
]

export const statsForecastSimulateRules = [
  query('month')
    .isString()
    .matches(/^\d{4}-(0[1-9]|1[0-2])$/)
    .withMessage('month must be YYYY-MM'),
  query('expenseMultiplierPct')
    .optional()
    .isFloat({ min: -90, max: 400 })
    .withMessage('expenseMultiplierPct must be between -90 and 400'),
]

export const statsPlannedCommitmentCreateRules = [
  body('label').trim().notEmpty().isLength({ max: 200 }).withMessage('label required'),
  body('amount').isFloat({ min: 0 }).withMessage('amount must be >= 0'),
  body('kind').isIn(['one_shot', 'recurring']).withMessage('kind invalid'),
  body('dueYm').optional().matches(/^\d{4}-(0[1-9]|1[0-2])$/).withMessage('dueYm YYYY-MM'),
  body('dueDay').optional().isInt({ min: 1, max: 31 }),
  body('cadence').optional().isIn(['monthly', 'quarterly', 'semiannual', 'annual']),
  body('anchorYm').optional().matches(/^\d{4}-(0[1-9]|1[0-2])$/),
  body('anchorDay').optional().isInt({ min: 1, max: 31 }),
  body('categoryId').optional({ nullable: true }).isUUID(),
  body('subcategoryId').optional({ nullable: true }).isUUID(),
]

export const statsPlannedCommitmentUpdateRules = [
  body('label').optional().trim().notEmpty().isLength({ max: 200 }),
  body('amount').optional().isFloat({ min: 0 }),
  body('kind').optional().isIn(['one_shot', 'recurring']),
  body('dueYm').optional().matches(/^\d{4}-(0[1-9]|1[0-2])$/),
  body('dueDay').optional().isInt({ min: 1, max: 31 }),
  body('cadence').optional().isIn(['monthly', 'quarterly', 'semiannual', 'annual']),
  body('anchorYm').optional().matches(/^\d{4}-(0[1-9]|1[0-2])$/),
  body('anchorDay').optional().isInt({ min: 1, max: 31 }),
  body('categoryId').optional({ nullable: true }).isUUID(),
  body('subcategoryId').optional({ nullable: true }).isUUID(),
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

export const statsRecurringManualRuleCreateRules = [
  body('conceptPattern')
    .trim()
    .notEmpty()
    .withMessage('conceptPattern is required')
    .isLength({ min: 2, max: 160 })
    .withMessage('conceptPattern must be 2-160 characters'),
  body('fromDay')
    .isInt({ min: 1, max: 31 })
    .withMessage('fromDay must be between 1 and 31'),
  body('toDay')
    .isInt({ min: 1, max: 31 })
    .withMessage('toDay must be between 1 and 31'),
  body('minAmount')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('minAmount must be >= 0'),
  body('maxAmount')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('maxAmount must be >= 0'),
  body('categoryId')
    .isUUID()
    .withMessage('categoryId must be UUID'),
  body('subcategoryId')
    .optional({ nullable: true })
    .isUUID()
    .withMessage('subcategoryId must be UUID'),
  body()
    .custom((v) => {
      const minAmount = v?.minAmount == null ? null : Number(v.minAmount)
      const maxAmount = v?.maxAmount == null ? null : Number(v.maxAmount)
      if (minAmount == null && maxAmount == null) return false
      if (minAmount != null && maxAmount != null && minAmount > maxAmount) return false
      return true
    })
    .withMessage('At least one of minAmount/maxAmount is required, and minAmount must be <= maxAmount'),
]

export const statsRecurringManualRuleUpdateRules = [
  body('conceptPattern')
    .optional()
    .trim()
    .isLength({ min: 2, max: 160 })
    .withMessage('conceptPattern must be 2-160 characters'),
  body('fromDay')
    .optional()
    .isInt({ min: 1, max: 31 })
    .withMessage('fromDay must be between 1 and 31'),
  body('toDay')
    .optional()
    .isInt({ min: 1, max: 31 })
    .withMessage('toDay must be between 1 and 31'),
  body('minAmount')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('minAmount must be >= 0'),
  body('maxAmount')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('maxAmount must be >= 0'),
  body('categoryId')
    .optional()
    .isUUID()
    .withMessage('categoryId must be UUID'),
  body('subcategoryId')
    .optional({ nullable: true })
    .isUUID()
    .withMessage('subcategoryId must be UUID'),
]
