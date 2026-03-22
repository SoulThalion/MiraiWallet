'use strict'

const { Router }       = require('express')
const ctrl             = require('../controllers/alert.controller')
const { authenticate } = require('../middlewares/auth.middleware')

const router = Router()

router.use(authenticate)

router.get   ('/',               ctrl.list)
router.get   ('/unread-count',   ctrl.unreadCount)
router.delete('/dismiss-all',    ctrl.dismissAll)
router.patch ('/:id/read',       ctrl.markRead)
router.delete('/:id',            ctrl.dismiss)

module.exports = router
