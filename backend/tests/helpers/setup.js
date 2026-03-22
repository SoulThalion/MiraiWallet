'use strict'

/**
 * Test environment bootstrap.
 * Must be imported FIRST in every test file (handled by vitest globalSetup).
 *
 * Uses a dedicated MySQL test database (mirai_wallet_test).
 * Each test file gets a clean schema via sequelize.sync({ force: true }).
 *
 * Required MySQL setup (run once):
 *   CREATE DATABASE mirai_wallet_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
 *   GRANT ALL PRIVILEGES ON mirai_wallet_test.* TO 'root'@'localhost';
 */

process.env.NODE_ENV              = 'test'
process.env.DB_HOST               = process.env.TEST_DB_HOST     || 'localhost'
process.env.DB_PORT               = process.env.TEST_DB_PORT     || '3306'
process.env.DB_NAME               = process.env.TEST_DB_NAME     || 'mirai_wallet_test'
process.env.DB_USER               = process.env.TEST_DB_USER     || 'root'
process.env.DB_PASSWORD           = process.env.TEST_DB_PASSWORD || ''
process.env.DB_ALTER              = 'false'   // force:true handles schema in tests
process.env.DB_POOL_MAX           = '1'       // single connection for tests to ensure FK checks work
process.env.DB_POOL_MIN           = '1'
process.env.JWT_SECRET            = 'test_secret'
process.env.JWT_EXPIRES_IN        = '1h'
process.env.JWT_REFRESH_SECRET    = 'test_refresh_secret'
process.env.JWT_REFRESH_EXPIRES_IN = '7d'
process.env.BCRYPT_ROUNDS         = '4'       // fast hashing in tests

let sequelize

async function getSequelize() {
  // Re-import to get fresh connection if previous one was closed
  const { sequelize: seq } = require('../../src/config/database')
  sequelize = seq
  return sequelize
}

/**
 * Clean all tables before each test file using DELETE FROM.
 * DELETE respects FK constraints (no need to disable FK checks).
 * Tables are cleared in reverse dependency order.
 */
async function setupDb() {
  const seq = await getSequelize()
  // Check if connection is closed and reopen if needed
  if (seq.connectionManager.closed) {
    // Force re-initialization by clearing the module cache
    delete require.cache[require.resolve('../../src/config/database')]
    const { sequelize: freshSeq } = require('../../src/config/database')
    sequelize = freshSeq
  }

  // Ensure models are registered
  require('../../src/models')

  // Get all models
  const models = Object.values(sequelize.models)
  
  // Build dependency graph - find which tables reference others
  const dependencies = new Map() // table -> tables it depends on (has FKs to)
  const tableModels = new Map() // table name -> model
  
  for (const model of models) {
    const tableName = model.getTableName()
    tableModels.set(tableName, model)
    
    // Find foreign keys in this model
    const attrs = model.rawAttributes
    const deps = []
    for (const [attrName, attr] of Object.entries(attrs)) {
      if (attr.references) {
        const refTable = typeof attr.references.model === 'string' 
          ? attr.references.model 
          : attr.references.model.getTableName?.() || attr.references.model.name
        deps.push(refTable)
      }
    }
    dependencies.set(tableName, deps)
  }
  
  // Topological sort - tables with dependencies come after their dependencies
  const sorted = []
  const visited = new Set()
  const temp = new Set()
  
  function visit(table) {
    if (temp.has(table)) return // cycle, ignore
    if (visited.has(table)) return
    
    temp.add(table)
    const deps = dependencies.get(table) || []
    for (const dep of deps) {
      if (tableModels.has(dep)) {
        visit(dep)
      }
    }
    temp.delete(table)
    visited.add(table)
    sorted.push(table)
  }
  
  for (const tableName of tableModels.keys()) {
    visit(tableName)
  }
  
  // Clear tables in reverse dependency order (dependents first to avoid FK violations)
  // DELETE respects FK constraints, so we clear child tables before parent tables
  const reverseSorted = [...sorted].reverse()
  for (const tableName of reverseSorted) {
    try {
      // Use DELETE FROM instead of TRUNCATE to respect FK constraints
      await sequelize.query(`DELETE FROM \`${tableName}\``)
    } catch (e) {
      // Table might not exist or other error, log but continue
      console.warn(`Warning: Could not clear table ${tableName}: ${e.message}`)
    }
  }
  
  // Sync to ensure all tables exist with correct schema (creates missing tables only)
  await sequelize.sync()
}

async function teardownDb() {
  // Only close connection after all tests, not between test files
  // This prevents "ConnectionManager closed" errors
}

module.exports = { setupDb, teardownDb }
