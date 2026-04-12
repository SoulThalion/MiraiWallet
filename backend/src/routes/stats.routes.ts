import { Router }    from 'express'
import * as ctrl     from '../controllers/stats.controller'
import { authenticate } from '../middlewares/auth.middleware'
import { validate }     from '../middlewares/validate.middleware'
import { statsMonthOverviewRules, statsRecurringDismissRules } from '../validators/stats.validators'

const router = Router()
router.use(authenticate)
router.get('/dashboard', ctrl.dashboard)
router.get('/month-overview', statsMonthOverviewRules, validate, ctrl.monthOverview)
router.post('/recurring-dismiss', statsRecurringDismissRules, validate, ctrl.dismissRecurringPattern)

export default router
