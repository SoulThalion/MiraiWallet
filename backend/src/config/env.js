'use strict'

require('dotenv').config()

/**
 * Centralised environment configuration.
 * All process.env reads happen here — nowhere else in the codebase.
 * Throws on startup if a required variable is missing.
 */

function optional(key, fallback) {
  return process.env[key] ?? fallback
}

const env = {
  // ── App ───────────────────────────────────────────────
  NODE_ENV:      optional('NODE_ENV', 'development'),
  PORT:          parseInt(optional('PORT', '3000'), 10),
  isProduction:  () => env.NODE_ENV === 'production',
  isDevelopment: () => env.NODE_ENV === 'development',
  isTest:        () => env.NODE_ENV === 'test',

  // ── MySQL database ────────────────────────────────────
  db: {
    dialect:  'mysql',
    host:     optional('DB_HOST',     'localhost'),
    port:     parseInt(optional('DB_PORT', '3306'), 10),
    name:     optional('DB_NAME',     'mirai_wallet'),
    user:     optional('DB_USER',     'root'),
    password: optional('DB_PASSWORD', ''),
    // DB_ALTER=true  → sequelize.sync({ alter: true })  — safe schema updates
    // DB_ALTER=false → sequelize.sync({ alter: false }) — only create missing tables
    alter:    optional('DB_ALTER', 'false') === 'true',
    // Connection pool
    pool: {
      max:     parseInt(optional('DB_POOL_MAX',     '10'), 10),
      min:     parseInt(optional('DB_POOL_MIN',     '0'),  10),
      acquire: parseInt(optional('DB_POOL_ACQUIRE', '30000'), 10),
      idle:    parseInt(optional('DB_POOL_IDLE',    '10000'), 10),
    },
    // Timezone — store/retrieve dates in UTC
    timezone: '+00:00',
  },

  // ── JWT ───────────────────────────────────────────────
  jwt: {
    secret:           optional('JWT_SECRET',              'fallback_dev_secret'),
    expiresIn:        optional('JWT_EXPIRES_IN',          '7d'),
    refreshSecret:    optional('JWT_REFRESH_SECRET',      'fallback_refresh_secret'),
    refreshExpiresIn: optional('JWT_REFRESH_EXPIRES_IN',  '30d'),
  },

  // ── Security ──────────────────────────────────────────
  bcryptRounds:      parseInt(optional('BCRYPT_ROUNDS',          '12'),     10),
  rateLimitWindowMs: parseInt(optional('RATE_LIMIT_WINDOW_MS',   '900000'), 10),
  rateLimitMax:      parseInt(optional('RATE_LIMIT_MAX',         '100'),    10),

  // ── CORS ─────────────────────────────────────────────
  corsOrigin: optional('CORS_ORIGIN', 'http://localhost:5173'),
}

module.exports = env
