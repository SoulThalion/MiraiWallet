'use strict'

require('dotenv').config()
require('../models')
const { connectDatabase } = require('../config/database')
const logger = require('../utils/logger')

async function migrate() {
  try {
    await connectDatabase()
    logger.info('✅  Migration complete (alter=' + process.env.DB_ALTER + ')')
    process.exit(0)
  } catch (err) {
    logger.error('Migration failed:', err)
    process.exit(1)
  }
}

migrate()
