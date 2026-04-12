import { body } from 'express-validator'

export const createCategoryRules = [
  body('name').trim().notEmpty().isLength({ max: 60 }),
  body('icon').optional().trim().isLength({ max: 10 }),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/),
  body('monthlyBudget').optional().isFloat({ min: 0 }),
  body('type').optional().isIn(['expense', 'income']),
]

export const updateCategoryRules = [
  body('name').optional().trim().isLength({ min: 1, max: 60 }),
  body('icon').optional().trim().isLength({ max: 10 }),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/),
  body('monthlyBudget').optional().isFloat({ min: 0 }),
  body('type').optional().isIn(['expense', 'income']),
]
