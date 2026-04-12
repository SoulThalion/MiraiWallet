import '../models'
import { connectDatabase } from '../config/database'
import logger from '../utils/logger'

connectDatabase()
  .then(() => { logger.info('✅  Migration complete'); process.exit(0) })
  .catch(err => { logger.error(err); process.exit(1) })
