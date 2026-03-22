'use strict'

const { Router }       = require('express')
const ctrl             = require('../controllers/transaction.controller')
const v                = require('../validators/transaction.validators')
const validate         = require('../middlewares/validate.middleware')
const { authenticate } = require('../middlewares/auth.middleware')

const router = Router()

router.use(authenticate)

router.get   ('/',                   v.listQuery, validate, ctrl.list)
router.post  ('/',                   v.create,    validate, ctrl.create)
router.get   ('/summary/monthly',    ctrl.monthlySummary)
router.get   ('/summary/categories', ctrl.categoryBreakdown)
router.get   ('/:id',                ctrl.getOne)
router.patch ('/:id',                v.update, validate, ctrl.update)
router.delete('/:id',                ctrl.remove)

module.exports = router
