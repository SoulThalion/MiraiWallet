'use strict'

const authService = require('../services/auth.service')
const ApiResponse = require('../utils/ApiResponse')

async function register(req, res, next) {
  try {
    const result = await authService.register(req.body)
    ApiResponse.created(res, result)
  } catch (err) { next(err) }
}

async function login(req, res, next) {
  try {
    const result = await authService.login(req.body)
    ApiResponse.success(res, result)
  } catch (err) { next(err) }
}

async function refresh(req, res, next) {
  try {
    const tokens = await authService.refresh(req.body)
    ApiResponse.success(res, tokens)
  } catch (err) { next(err) }
}

async function logout(req, res, next) {
  try {
    await authService.logout(req.user.id)
    ApiResponse.noContent(res)
  } catch (err) { next(err) }
}

async function me(req, res, next) {
  try {
    const user = await authService.getProfile(req.user.id)
    ApiResponse.success(res, user)
  } catch (err) { next(err) }
}

async function updateProfile(req, res, next) {
  try {
    const user = await authService.updateProfile(req.user, req.body)
    ApiResponse.success(res, user)
  } catch (err) { next(err) }
}

async function changePassword(req, res, next) {
  try {
    await authService.changePassword(req.user, req.body)
    ApiResponse.noContent(res)
  } catch (err) { next(err) }
}

module.exports = { register, login, refresh, logout, me, updateProfile, changePassword }
