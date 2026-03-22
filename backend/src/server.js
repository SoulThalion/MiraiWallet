'use strict'

const createApp              = require('./app')
const { connectDatabase }    = require('./config/database')
require('./models')           // register all models & associations
const env                    = require('./config/env')
const logger                 = require('./utils/logger')

async function start() {
  try {
    await connectDatabase()

    const app    = createApp()
    const server = app.listen(env.PORT, () => {
      logger.info(`🚀  Mirai Wallet API running on port ${env.PORT} [${env.NODE_ENV}]`)
    })

    // ── Graceful shutdown ─────────────────────────────
    const shutdown = (signal) => {
      logger.info(`${signal} received — shutting down gracefully`)
      server.close(() => {
        logger.info('HTTP server closed')
        process.exit(0)
      })
    }

    process.on('SIGTERM', () => shutdown('SIGTERM'))
    process.on('SIGINT',  () => shutdown('SIGINT'))

  } catch (err) {
    logger.error('Failed to start server:', err)
    process.exit(1)
  }
}

start()
