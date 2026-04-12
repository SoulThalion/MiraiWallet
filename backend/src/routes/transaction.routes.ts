import { Router } from 'express'
import * as ctrl  from '../controllers/transaction.controller'
import { createTransactionRules, updateTransactionRules, listTransactionRules } from '../validators/transaction.validators'
import { validate }     from '../middlewares/validate.middleware'
import { authenticate } from '../middlewares/auth.middleware'

const router = Router()
router.use(authenticate)

// Static routes BEFORE dynamic /:id — prevents route shadowing
router.get('/summary/monthly',    ctrl.monthlySummary)
router.get('/summary/categories', ctrl.categoryBreakdown)

router.get   ('/',    listTransactionRules,   validate, ctrl.list)
router.post  ('/',    createTransactionRules, validate, ctrl.create)
router.get   ('/:id', ctrl.getOne)
router.patch ('/:id', updateTransactionRules, validate, ctrl.update)
router.delete('/:id', ctrl.remove)

export default router
