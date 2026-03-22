'use strict'

const categoryService = require('../services/category.service')
const ApiResponse     = require('../utils/ApiResponse')

async function list(req, res, next) {
  try {
    const cats = await categoryService.list(req.user.id)
    ApiResponse.success(res, cats)
  } catch (err) { next(err) }
}

async function getOne(req, res, next) {
  try {
    const cat = await categoryService.findById(req.params.id, req.user.id)
    ApiResponse.success(res, cat)
  } catch (err) { next(err) }
}

async function create(req, res, next) {
  try {
    const cat = await categoryService.create(req.user.id, req.body)
    ApiResponse.created(res, cat)
  } catch (err) { next(err) }
}

async function update(req, res, next) {
  try {
    const cat = await categoryService.update(req.params.id, req.user.id, req.body)
    ApiResponse.success(res, cat)
  } catch (err) { next(err) }
}

async function remove(req, res, next) {
  try {
    await categoryService.remove(req.params.id, req.user.id)
    ApiResponse.noContent(res)
  } catch (err) { next(err) }
}

module.exports = { list, getOne, create, update, remove }
