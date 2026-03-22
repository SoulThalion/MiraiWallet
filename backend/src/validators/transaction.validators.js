'use strict'

const { body, query } = require('express-validator')

const create = [
  body('accountId').notEmpty().isUUID().withMessage('Valid accountId is required'),
  body('categoryId').optional().isUUID().withMessage('categoryId must be a UUID'),
  body('description')
    .trim().notEmpty().withMessage('Description is required')
    .isLength({ max: 200 }).withMessage('Max 200 characters'),
  body('amount')
    .notEmpty().withMessage('Amount is required')
    .isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('type')
    .notEmpty()
    .isIn(['income', 'expense', 'transfer']).withMessage('Type must be income, expense or transfer'),
  body('date')
    .notEmpty().withMessage('Date is required')
    .isDate().withMessage('Date must be in YYYY-MM-DD format'),
  body('notes').optional().trim().isLength({ max: 1000 }),
  body('isRecurring').optional().isBoolean(),
  body('recurringPeriod')
    .optional()
    .isIn(['daily', 'weekly', 'monthly', 'yearly']),
  body('importSource')
    .optional()
    .isIn(['manual', 'csv', 'bank_api']),
]

const update = [
  body('description').optional().trim().isLength({ min: 1, max: 200 }),
  body('amount').optional().isFloat({ min: 0.01 }),
  body('type').optional().isIn(['income', 'expense', 'transfer']),
  body('date').optional().isDate(),
  body('notes').optional().trim().isLength({ max: 1000 }),
  body('categoryId').optional().isUUID(),
  body('isRecurring').optional().isBoolean(),
  body('recurringPeriod').optional().isIn(['daily', 'weekly', 'monthly', 'yearly']),
]

const listQuery = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('type').optional().isIn(['income', 'expense', 'transfer']),
  query('categoryId').optional().isUUID(),
  query('accountId').optional().isUUID(),
  query('from').optional().isDate(),
  query('to').optional().isDate(),
]

module.exports = { create, update, listQuery }
