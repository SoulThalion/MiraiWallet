import { Router } from 'express'
import * as ctrl  from '../controllers/auth.controller'
import { registerRules, loginRules, refreshRules, changePasswordRules } from '../validators/auth.validators'
import { validate }     from '../middlewares/validate.middleware'
import { authenticate } from '../middlewares/auth.middleware'

const router = Router()

router.post('/register',      registerRules,       validate, ctrl.register)
router.post('/login',         loginRules,          validate, ctrl.login)
router.post('/refresh',       refreshRules,        validate, ctrl.refresh)
router.post('/logout',        authenticate,                  ctrl.logout)
router.get ('/me',            authenticate,                  ctrl.me)
router.patch('/me',           authenticate,                  ctrl.updateProfile)
router.patch('/me/password',  authenticate, changePasswordRules, validate, ctrl.changePassword)

export default router
