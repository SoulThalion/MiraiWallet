import { query } from 'express-validator'

export const statsMonthOverviewRules = [
  query('month')
    .optional()
    .isString()
    .matches(/^\d{4}-(0[1-9]|1[0-2])$/)
    .withMessage('month must be YYYY-MM'),
]
