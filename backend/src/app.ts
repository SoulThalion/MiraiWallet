import express          from 'express'
import helmet           from 'helmet'
import cors             from 'cors'
import morgan           from 'morgan'
import env              from './config/env'
import router           from './routes'
import { errorHandler, notFoundHandler } from './middlewares/error.middleware'

export function createApp() {
  const app = express()

  app.use(helmet())
  app.use(cors({ origin: env.corsOrigin, credentials: true, methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'] }))
  app.use(express.json({ limit: '1mb' }))
  app.use(express.urlencoded({ extended: true }))

  if (!env.isTest()) app.use(morgan(env.isDevelopment() ? 'dev' : 'combined'))

  app.use('/api/v1', router)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
