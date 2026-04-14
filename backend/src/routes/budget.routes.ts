import { Router } from 'express'
import * as ctrl  from '../controllers/budget.controller'
import {
  upsertBudgetRules,
  upsertSubcategoryBudgetRules,
  budgetRecommendationQueryRules,
  applyBudgetRecommendationRules,
} from '../validators/budget.validators'
import { validate }     from '../middlewares/validate.middleware'
import { authenticate } from '../middlewares/auth.middleware'

const router = Router()
router.use(authenticate)

router.get   ('/',    ctrl.list)
router.put   ('/',    upsertBudgetRules, validate, ctrl.upsert)
router.delete('/:id', ctrl.remove)
router.get('/subcategories', ctrl.listSubcategory)
router.put('/subcategories', upsertSubcategoryBudgetRules, validate, ctrl.upsertSubcategory)
router.delete('/subcategories/:id', ctrl.removeSubcategory)
router.get('/recommendations', budgetRecommendationQueryRules, validate, ctrl.recommendations)
router.post('/recommendations/apply', applyBudgetRecommendationRules, validate, ctrl.applyRecommendations)

export default router
