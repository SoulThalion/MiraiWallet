import dotenv from 'dotenv'
dotenv.config()

const opt = (key: string, fallback: string): string =>
  process.env[key] ?? fallback

const env = {
  NODE_ENV:      opt('NODE_ENV', 'development'),
  PORT:          parseInt(opt('PORT', '3000'), 10),
  isProduction:  (): boolean => env.NODE_ENV === 'production',
  isDevelopment: (): boolean => env.NODE_ENV === 'development',
  isTest:        (): boolean => env.NODE_ENV === 'test',

  db: {
    host:     opt('DB_HOST',     'localhost'),
    port:     parseInt(opt('DB_PORT', '3306'), 10),
    name:     opt('DB_NAME',     'mirai_wallet'),
    user:     opt('DB_USER',     'root'),
    password: opt('DB_PASSWORD', ''),
    alter:    opt('DB_ALTER', 'false') === 'true',
    pool: {
      max:     parseInt(opt('DB_POOL_MAX',     '10'),    10),
      min:     parseInt(opt('DB_POOL_MIN',     '0'),     10),
      acquire: parseInt(opt('DB_POOL_ACQUIRE', '30000'), 10),
      idle:    parseInt(opt('DB_POOL_IDLE',    '10000'), 10),
    },
    timezone: '+00:00',
  },

  jwt: {
    secret:           opt('JWT_SECRET',              'fallback_dev_secret'),
    expiresIn:        opt('JWT_EXPIRES_IN',          '7d'),
    refreshSecret:    opt('JWT_REFRESH_SECRET',      'fallback_refresh_secret'),
    refreshExpiresIn: opt('JWT_REFRESH_EXPIRES_IN',  '30d'),
  },

  bcryptRounds:      parseInt(opt('BCRYPT_ROUNDS',        '12'),     10),
  rateLimitWindowMs: parseInt(opt('RATE_LIMIT_WINDOW_MS', '900000'), 10),
  rateLimitMax:      parseInt(opt('RATE_LIMIT_MAX',       '100'),    10),
  corsOrigin:        opt('CORS_ORIGIN', 'http://localhost:5173'),
} as const

export default env
