import { Router }    from 'express'
import * as ctrl     from '../controllers/stats.controller'
import { authenticate } from '../middlewares/auth.middleware'
import { validate }     from '../middlewares/validate.middleware'
import {
  statsMonthOverviewRules,
  statsForecastSimulateRules,
  statsPlannedCommitmentCreateRules,
  statsPlannedCommitmentUpdateRules,
  statsRecurringDismissRules,
  statsRecurringSavingsRules,
  statsRecurringRecategorizeRules,
  statsRecurringManualRuleCreateRules,
  statsRecurringManualRuleUpdateRules,
} from '../validators/stats.validators'

const router = Router()
router.use(authenticate)
router.get('/dashboard', ctrl.dashboard)
router.get('/month-overview', statsMonthOverviewRules, validate, ctrl.monthOverview)
router.get('/forecast-simulate', statsForecastSimulateRules, validate, ctrl.forecastSimulate)
router.get('/planned-commitments', ctrl.listPlannedCommitments)
router.post('/planned-commitments', statsPlannedCommitmentCreateRules, validate, ctrl.createPlannedCommitment)
router.patch('/planned-commitments/:commitmentId', statsPlannedCommitmentUpdateRules, validate, ctrl.updatePlannedCommitment)
router.delete('/planned-commitments/:commitmentId', ctrl.deletePlannedCommitment)
router.post('/recurring-dismiss', statsRecurringDismissRules, validate, ctrl.dismissRecurringPattern)
router.post('/recurring-savings', statsRecurringSavingsRules, validate, ctrl.setRecurringPatternSavings)
router.post('/recurring-category', statsRecurringRecategorizeRules, validate, ctrl.setRecurringPatternCategory)
router.get('/recurring-manual-rules', ctrl.listRecurringManualRules)
router.post('/recurring-manual-rules', statsRecurringManualRuleCreateRules, validate, ctrl.createRecurringManualRule)
router.patch('/recurring-manual-rules/:ruleId', statsRecurringManualRuleUpdateRules, validate, ctrl.updateRecurringManualRule)
router.delete('/recurring-manual-rules/:ruleId', ctrl.deleteRecurringManualRule)

export default router
