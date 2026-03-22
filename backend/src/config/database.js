'use strict'

const { Sequelize } = require('sequelize')
const env           = require('./env')
const logger        = require('../utils/logger')

/**
 * Sequelize singleton — MySQL dialect.
 *
 * In test mode the connection details are overridden by the test setup
 * so tests can use a dedicated test database.
 */
const sequelize = new Sequelize(
  env.db.name,
  env.db.user,
  env.db.password,
  {
    dialect:  'mysql',
    host:     env.db.host,
    port:     env.db.port,
    timezone: env.db.timezone,   // store dates in UTC
    logging:  env.isDevelopment() ? (msg) => logger.debug(msg) : false,
    define: {
      // Use snake_case column names in MySQL
      underscored: false,
      // Add createdAt / updatedAt to every model by default
      timestamps:  true,
      // Use InnoDB engine for FK support + transactions
      engine: 'InnoDB',
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
    },
    pool: {
      max:     env.db.pool.max,
      min:     env.db.pool.min,
      acquire: env.db.pool.acquire,
      idle:    env.db.pool.idle,
    },
    dialectOptions: {
      // Return JS Date objects for DATETIME columns, not strings
      dateStrings: false,
      typeCast: true,
    },
  }
)

/**
 * Authenticate + sync all models.
 *
 * DB_ALTER=true  → ALTER TABLE to match current model definitions (dev-safe)
 * DB_ALTER=false → CREATE TABLE IF NOT EXISTS only (production-safe)
 *
 * NOTE: Never use force:true in production — it drops all tables.
 */
async function connectDatabase() {
  await sequelize.authenticate()
  logger.info(`MySQL connected  [${env.db.host}:${env.db.port}/${env.db.name}]`)

  await sequelize.sync({ alter: env.db.alter })
  logger.info(`Database synced  [alter=${env.db.alter}]`)
}

module.exports = { sequelize, connectDatabase }
