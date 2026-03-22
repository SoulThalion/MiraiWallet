'use strict'

const { body } = require('express-validator')

const upsert = [
  body('categoryId').notEmpty().isUUID().withMessage('Valid categoryId is required'),
  body('amount')
    .notEmpty()
    .isFloat({ min: 0 }).withMessage('Amount must be >= 0'),
  body('month')
    .notEmpty()
    .matches(/^\d{4}-(0[1-9]|1[0-2])$/).withMessage('Month must be in YYYY-MM format'),
  body('notes').optional().trim().isLength({ max: 500 }),
]

module.exports = { upsert }
