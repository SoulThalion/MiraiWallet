'use strict'

const { Category } = require('../models')
const ApiError     = require('../utils/ApiError')

async function list(userId) {
  return Category.findAll({
    where: { userId },
    order: [['name', 'ASC']],
  })
}

async function findById(id, userId) {
  const cat = await Category.findOne({ where: { id, userId } })
  if (!cat) throw ApiError.notFound('Category')
  return cat
}

async function create(userId, data) {
  const exists = await Category.findOne({ where: { userId, name: data.name } })
  if (exists) throw ApiError.conflict(`Category "${data.name}" already exists`)
  return Category.create({ ...data, userId })
}

async function update(id, userId, data) {
  const cat = await findById(id, userId)
  return cat.update(data)
}

async function remove(id, userId) {
  const cat = await findById(id, userId)
  if (cat.isDefault) throw ApiError.badRequest('Default categories cannot be deleted')
  await cat.destroy()
}

module.exports = { list, findById, create, update, remove }
