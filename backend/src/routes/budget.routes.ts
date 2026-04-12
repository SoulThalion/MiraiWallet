import { Router } from 'express'
import * as ctrl  from '../controllers/budget.controller'
import { upsertBudgetRules } from '../validators/budget.validators'
import { validate }     from '../middlewares/validate.middleware'
import { authenticate } from '../middlewares/auth.middleware'

const router = Router()
router.use(authenticate)

router.get   ('/',    ctrl.list)
router.put   ('/',    upsertBudgetRules, validate, ctrl.upsert)
router.delete('/:id', ctrl.remove)

export default router
