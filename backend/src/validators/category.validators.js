'use strict'

const { body } = require('express-validator')

const create = [
  body('name')
    .trim().notEmpty().withMessage('Name is required')
    .isLength({ max: 60 }),
  body('icon').optional().trim().isLength({ max: 10 }),
  body('color')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Color must be a hex color'),
  body('monthlyBudget')
    .optional()
    .isFloat({ min: 0 }).withMessage('Monthly budget must be >= 0'),
  body('type')
    .optional()
    .isIn(['expense', 'income']),
]

const update = [
  body('name').optional().trim().isLength({ min: 1, max: 60 }),
  body('icon').optional().trim().isLength({ max: 10 }),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/),
  body('monthlyBudget').optional().isFloat({ min: 0 }),
  body('type').optional().isIn(['expense', 'income']),
]

module.exports = { create, update }
