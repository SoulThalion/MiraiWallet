'use strict'

const { Router }       = require('express')
const ctrl             = require('../controllers/stats.controller')
const { authenticate } = require('../middlewares/auth.middleware')

const router = Router()

router.use(authenticate)

router.get('/dashboard', ctrl.dashboard)

module.exports = router
