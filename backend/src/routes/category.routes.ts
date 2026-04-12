import { Router } from 'express'
import * as ctrl  from '../controllers/category.controller'
import { createCategoryRules, updateCategoryRules } from '../validators/category.validators'
import { validate }     from '../middlewares/validate.middleware'
import { authenticate } from '../middlewares/auth.middleware'

const router = Router()
router.use(authenticate)

router.get   ('/',    ctrl.list)
router.post  ('/',    createCategoryRules, validate, ctrl.create)
router.get   ('/:id', ctrl.getOne)
router.patch ('/:id', updateCategoryRules, validate, ctrl.update)
router.delete('/:id', ctrl.remove)

export default router
