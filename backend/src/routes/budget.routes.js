'use strict'

const { Router }       = require('express')
const ctrl             = require('../controllers/budget.controller')
const v                = require('../validators/budget.validators')
const validate         = require('../middlewares/validate.middleware')
const { authenticate } = require('../middlewares/auth.middleware')

const router = Router()

router.use(authenticate)

router.get   ('/',    ctrl.list)
router.put   ('/',    v.upsert, validate, ctrl.upsert)
router.delete('/:id', ctrl.remove)

module.exports = router
