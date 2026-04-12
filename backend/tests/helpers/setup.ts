// Must be the very first import in every test file
process.env.NODE_ENV               = 'test'
process.env.DB_HOST                = process.env.TEST_DB_HOST     ?? 'localhost'
process.env.DB_PORT                = process.env.TEST_DB_PORT     ?? '3306'
process.env.DB_NAME                = process.env.TEST_DB_NAME     ?? 'mirai_wallet_test'
process.env.DB_USER                = process.env.TEST_DB_USER     ?? 'root'
process.env.DB_PASSWORD            = process.env.TEST_DB_PASSWORD ?? ''
process.env.DB_ALTER               = 'false'
process.env.JWT_SECRET             = 'test_secret'
process.env.JWT_EXPIRES_IN         = '1h'
process.env.JWT_REFRESH_SECRET     = 'test_refresh_secret'
process.env.JWT_REFRESH_EXPIRES_IN = '7d'
process.env.BCRYPT_ROUNDS          = '4'

import { sequelize } from '../../src/config/database'
import '../../src/models'   // register models & associations

export async function setupDb(): Promise<void> {
  // force:true drops & re-creates every table — guarantees a clean slate
  await sequelize.sync({ force: true })
}

export async function teardownDb(): Promise<void> {
  await sequelize.close()
}
