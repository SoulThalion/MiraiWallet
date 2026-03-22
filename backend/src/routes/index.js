'use strict'

const { Router } = require('express')

const authRoutes        = require('./auth.routes')
const accountRoutes     = require('./account.routes')
const categoryRoutes    = require('./category.routes')
const transactionRoutes = require('./transaction.routes')
const alertRoutes       = require('./alert.routes')
const budgetRoutes      = require('./budget.routes')
const statsRoutes       = require('./stats.routes')

const router = Router()

// Health check — no auth needed
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Feature routes
router.use('/auth',         authRoutes)
router.use('/accounts',     accountRoutes)
router.use('/categories',   categoryRoutes)
router.use('/transactions', transactionRoutes)
router.use('/alerts',       alertRoutes)
router.use('/budgets',      budgetRoutes)
router.use('/stats',        statsRoutes)

module.exports = router
