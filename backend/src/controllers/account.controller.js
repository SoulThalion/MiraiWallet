'use strict'

const accountService = require('../services/account.service')
const ApiResponse    = require('../utils/ApiResponse')

async function list(req, res, next) {
  try {
    const accounts = await accountService.list(req.user.id)
    ApiResponse.success(res, accounts)
  } catch (err) { next(err) }
}

async function getOne(req, res, next) {
  try {
    const account = await accountService.findById(req.params.id, req.user.id)
    ApiResponse.success(res, account)
  } catch (err) { next(err) }
}

async function create(req, res, next) {
  try {
    const account = await accountService.create(req.user.id, req.body)
    ApiResponse.created(res, account)
  } catch (err) { next(err) }
}

async function update(req, res, next) {
  try {
    const account = await accountService.update(req.params.id, req.user.id, req.body)
    ApiResponse.success(res, account)
  } catch (err) { next(err) }
}

async function remove(req, res, next) {
  try {
    await accountService.remove(req.params.id, req.user.id)
    ApiResponse.noContent(res)
  } catch (err) { next(err) }
}

module.exports = { list, getOne, create, update, remove }
