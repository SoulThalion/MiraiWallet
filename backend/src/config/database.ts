import { Sequelize } from 'sequelize'
import env from './env'
import logger from '../utils/logger'

export const sequelize = new Sequelize(
  env.db.name,
  env.db.user,
  env.db.password,
  {
    dialect:  'mysql',
    host:     env.db.host,
    port:     env.db.port,
    timezone: env.db.timezone,
    logging:  env.isDevelopment() ? (msg: string) => logger.debug(msg) : false,
    define: {
      timestamps: true,
      charset:    'utf8mb4',
    },
    pool:     env.db.pool,
    dialectOptions: {
      dateStrings: false,
      typeCast:    true,
    },
  }
)

export async function connectDatabase(): Promise<void> {
  await sequelize.authenticate()
  logger.info(`MySQL connected  [${env.db.host}:${env.db.port}/${env.db.name}]`)

  await sequelize.sync({ alter: env.db.alter })
  logger.info(`Database synced  [alter=${env.db.alter}]`)
}
