import { Category, Subcategory } from '../models'
import { ApiError }              from '../utils/ApiError'
import { CreateCategoryDto }     from '../types'
import { ERROR_CODES } from '../errors/error-codes'

export async function list(userId: string): Promise<Category[]> {
  return Category.findAll({
    where: { userId },
    order: [['name', 'ASC']],
    include: [{
      model:      Subcategory,
      as:         'subcategories',
      attributes: ['id', 'name', 'icon', 'color'],
      separate:   true,
      order:      [['name', 'ASC']],
    }],
  })
}

export async function findById(id: string, userId: string): Promise<Category> {
  const cat = await Category.findOne({ where: { id, userId } })
  if (!cat) throw ApiError.notFound(ERROR_CODES.CATEGORY_NOT_FOUND, 'Categoría')
  return cat
}

export async function create(userId: string, data: CreateCategoryDto): Promise<Category> {
  const exists = await Category.findOne({ where: { userId, name: data.name } })
  if (exists) throw ApiError.conflict(ERROR_CODES.CATEGORY_ALREADY_EXISTS, `La categoría "${data.name}" ya existe`)
  return Category.create({ ...data, userId })
}

export async function update(id: string, userId: string, data: Partial<CreateCategoryDto>): Promise<Category> {
  const cat = await findById(id, userId)
  return cat.update(data)
}

export async function remove(id: string, userId: string): Promise<void> {
  const cat = await findById(id, userId)
  if (cat.isDefault) throw ApiError.badRequest(ERROR_CODES.CATEGORY_DEFAULT_DELETE_FORBIDDEN, 'No se pueden eliminar categorías por defecto')
  await cat.destroy()
}
