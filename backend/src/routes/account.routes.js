'use strict'

const { Router }       = require('express')
const ctrl             = require('../controllers/account.controller')
const v                = require('../validators/account.validators')
const validate         = require('../middlewares/validate.middleware')
const { authenticate } = require('../middlewares/auth.middleware')

const router = Router()

router.use(authenticate)

router.get   ('/',    ctrl.list)
router.post  ('/',    v.create, validate, ctrl.create)
router.get   ('/:id', ctrl.getOne)
router.patch ('/:id', v.update, validate, ctrl.update)
router.delete('/:id', ctrl.remove)

module.exports = router
