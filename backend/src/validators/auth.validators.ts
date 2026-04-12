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
