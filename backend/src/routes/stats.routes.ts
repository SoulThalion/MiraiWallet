import { Router }    from 'express'
import * as ctrl     from '../controllers/stats.controller'
import { authenticate } from '../middlewares/auth.middleware'

const router = Router()
router.use(authenticate)
router.get('/dashboard', ctrl.dashboard)

export default router
