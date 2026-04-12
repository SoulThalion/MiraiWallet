import { body } from 'express-validator'

export const createAccountRules = [
  body('name').trim().notEmpty().isLength({ max: 100 }),
  body('type').optional().isIn(['checking', 'savings', 'investment', 'cash']),
  body('balance').optional().isFloat({ min: 0 }),
  body('currency').optional().isLength({ min: 3, max: 3 }),
  body('institution').optional().trim().isLength({ max: 100 }),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/),
]

export const updateAccountRules = [
  body('name').optional().trim().isLength({ min: 1, max: 100 }),
  body('type').optional().isIn(['checking', 'savings', 'investment', 'cash']),
  body('balance').optional().isFloat({ min: 0 }),
  body('institution').optional().trim().isLength({ max: 100 }),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/),
  body('isActive').optional().isBoolean(),
]
