'use strict'

const { Router } = require('express')
const ctrl       = require('../controllers/auth.controller')
const v          = require('../validators/auth.validators')
const validate   = require('../middlewares/validate.middleware')
const { authenticate } = require('../middlewares/auth.middleware')

const router = Router()

// Public
router.post('/register',         v.register,        validate, ctrl.register)
router.post('/login',            v.login,            validate, ctrl.login)
router.post('/refresh',          v.refreshToken,     validate, ctrl.refresh)

// Protected
router.post  ('/logout',         authenticate, ctrl.logout)
router.get   ('/me',             authenticate, ctrl.me)
router.patch ('/me',             authenticate, ctrl.updateProfile)
router.patch ('/me/password',    authenticate, v.changePassword, validate, ctrl.changePassword)

module.exports = router
