interface PaginationInput {
  page?:  string | number
  limit?: string | number
}

interface PaginationResult {
  page:   number
  limit:  number
  offset: number
}

export function parsePagination(
  query:    PaginationInput,
  defaults: { page: number; limit: number } = { page: 1, limit: 20 }
): PaginationResult {
  const page  = Math.max(1, parseInt(String(query.page  ?? defaults.page),  10))
  const limit = Math.min(100, Math.max(1, parseInt(String(query.limit ?? defaults.limit), 10)))
  return { page, limit, offset: (page - 1) * limit }
}

export function buildPaginationMeta(page: number, limit: number, total: number) {
  const totalPages = Math.ceil(total / limit)
  return { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 }
}
