import { Router }  from 'express'
import authRoutes        from './auth.routes'
import accountRoutes     from './account.routes'
import categoryRoutes    from './category.routes'
import transactionRoutes from './transaction.routes'
import alertRoutes       from './alert.routes'
import budgetRoutes      from './budget.routes'
import statsRoutes       from './stats.routes'

const router = Router()

router.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }))

router.use('/auth',         authRoutes)
router.use('/accounts',     accountRoutes)
router.use('/categories',   categoryRoutes)
router.use('/transactions', transactionRoutes)
router.use('/alerts',       alertRoutes)
router.use('/budgets',      budgetRoutes)
router.use('/stats',        statsRoutes)

export default router
