import { Router } from 'express'
import * as ctrl  from '../controllers/alert.controller'
import { authenticate } from '../middlewares/auth.middleware'

const router = Router()
router.use(authenticate)

router.get   ('/',             ctrl.list)
router.get   ('/unread-count', ctrl.unreadCount)

// ✅ Static routes MUST come before dynamic /:id
// If dismiss-all were after /:id, Express would treat "dismiss-all" as an id param
router.delete('/dismiss-all',  ctrl.dismissAll)

router.patch ('/:id/read',     ctrl.markRead)
router.delete('/:id',          ctrl.dismiss)

export default router
