import './models'                      // register all models & associations
import { connectDatabase } from './config/database'
import { createApp }       from './app'
import env                 from './config/env'
import logger              from './utils/logger'

async function start(): Promise<void> {
  try {
    await connectDatabase()
    const app    = createApp()
    const server = app.listen(env.PORT, () =>
      logger.info(`🚀  Mirai Wallet API  →  http://localhost:${env.PORT}  [${env.NODE_ENV}]`)
    )

    const shutdown = (signal: string) => {
      logger.info(`${signal} — shutting down`)
      server.close(() => { logger.info('Server closed'); process.exit(0) })
    }
    process.on('SIGTERM', () => shutdown('SIGTERM'))
    process.on('SIGINT',  () => shutdown('SIGINT'))
  } catch (err) {
    logger.error('Startup failed:', err)
    process.exit(1)
  }
}

start()
