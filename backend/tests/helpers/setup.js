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
process.env.JWT_SECRET            = 'test_secret'
process.env.JWT_EXPIRES_IN        = '1h'
process.env.JWT_REFRESH_SECRET    = 'test_refresh_secret'
process.env.JWT_REFRESH_EXPIRES_IN = '7d'
process.env.BCRYPT_ROUNDS         = '4'       // fast hashing in tests

const { sequelize }   = require('../../src/config/database')
require('../../src/models')           // register models & associations

/**
 * Drop and re-create all tables before each test file.
 * force: true guarantees a completely clean state regardless of previous runs.
 */
async function setupDb() {
  await sequelize.sync({ force: true })
}

async function teardownDb() {
  await sequelize.close()
}

module.exports = { setupDb, teardownDb }
