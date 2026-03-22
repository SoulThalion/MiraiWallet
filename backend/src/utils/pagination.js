'use strict'

/**
 * Parse ?page=1&limit=20 from query string.
 * Returns Sequelize-ready { limit, offset } + raw { page, limit }.
 */
function parsePagination(query, defaults = { page: 1, limit: 20 }) {
  const page  = Math.max(1, parseInt(query.page  ?? defaults.page,  10))
  const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? defaults.limit, 10)))
  return {
    page,
    limit,
    offset: (page - 1) * limit,
  }
}

module.exports = { parsePagination }
