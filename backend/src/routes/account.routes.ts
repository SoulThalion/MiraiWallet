import { Router } from 'express'
import * as ctrl  from '../controllers/account.controller'
import { createAccountRules, updateAccountRules } from '../validators/account.validators'
import { validate }     from '../middlewares/validate.middleware'
import { authenticate } from '../middlewares/auth.middleware'

const router = Router()
router.use(authenticate)

router.get   ('/',    ctrl.list)
router.post  ('/',    createAccountRules, validate, ctrl.create)
router.get   ('/:id', ctrl.getOne)
router.patch ('/:id', updateAccountRules, validate, ctrl.update)
router.delete('/:id', ctrl.remove)

export default router
