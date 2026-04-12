import { Router }    from 'express'
import * as ctrl     from '../controllers/stats.controller'
import { authenticate } from '../middlewares/auth.middleware'
import { validate }     from '../middlewares/validate.middleware'
import { statsMonthOverviewRules } from '../validators/stats.validators'

const router = Router()
router.use(authenticate)
router.get('/dashboard', ctrl.dashboard)
router.get('/month-overview', statsMonthOverviewRules, validate, ctrl.monthOverview)

export default router
