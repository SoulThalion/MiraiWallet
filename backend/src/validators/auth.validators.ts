import { body } from 'express-validator'

export const registerRules = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ min: 2, max: 100 }),
  body('email').trim().notEmpty().isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Minimum 8 characters')
    .matches(/[A-Z]/).withMessage('Must contain an uppercase letter')
    .matches(/[0-9]/).withMessage('Must contain a number'),
]

export const loginRules = [
  body('email').trim().notEmpty().isEmail().normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
]

export const refreshRules = [
  body('refreshToken').notEmpty().withMessage('Refresh token is required'),
]

export const changePasswordRules = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .notEmpty().isLength({ min: 8 })
    .matches(/[A-Z]/).matches(/[0-9]/),
]

export const wipeFinancialDataRules = [
  body('password').notEmpty().withMessage('La contraseña es obligatoria'),
]

export const updateProfileRules = [
  body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2–100 characters'),
  body('monthCycleMode').optional().isIn(['calendar', 'custom']).withMessage('monthCycleMode must be calendar or custom'),
  body('monthCycleStartDay')
    .optional()
    .isInt({ min: 1, max: 31 })
    .withMessage('monthCycleStartDay must be between 1 and 31'),
  body('monthCycleEndDay')
    .optional()
    .isInt({ min: 1, max: 31 })
    .withMessage('monthCycleEndDay must be between 1 and 31'),
  body('monthCycleAnchor').optional().isIn(['previous', 'current']).withMessage('monthCycleAnchor must be previous or current'),
  body('recurringExcludedCategoryIds')
    .optional({ nullable: true })
    .isArray()
    .withMessage('recurringExcludedCategoryIds must be an array'),
  body('recurringExcludedCategoryIds.*').optional().isUUID().withMessage('Each recurringExcludedCategoryIds entry must be a UUID'),
  body('recurringExcludedSubcategoryIds')
    .optional({ nullable: true })
    .isArray()
    .withMessage('recurringExcludedSubcategoryIds must be an array'),
  body('recurringExcludedSubcategoryIds.*')
    .optional()
    .isUUID()
    .withMessage('Each recurringExcludedSubcategoryIds entry must be a UUID'),
]
