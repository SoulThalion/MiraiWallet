'use strict'

const { body } = require('express-validator')

const create = [
  body('name')
    .trim().notEmpty().withMessage('Name is required')
    .isLength({ max: 100 }),
  body('type')
    .optional()
    .isIn(['checking', 'savings', 'investment', 'cash']),
  body('balance')
    .optional()
    .isFloat({ min: 0 }).withMessage('Balance must be >= 0'),
  body('currency')
    .optional()
    .isLength({ min: 3, max: 3 }).withMessage('Currency must be a 3-letter code'),
  body('institution').optional().trim().isLength({ max: 100 }),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Color must be a hex color'),
]

const update = [
  body('name').optional().trim().isLength({ min: 1, max: 100 }),
  body('type').optional().isIn(['checking', 'savings', 'investment', 'cash']),
  body('balance').optional().isFloat({ min: 0 }),
  body('institution').optional().trim().isLength({ max: 100 }),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/),
  body('isActive').optional().isBoolean(),
]

module.exports = { create, update }
