'use strict'

const { createLogger, format, transports } = require('winston')
const env = require('../config/env')

const { combine, timestamp, printf, colorize, errors } = format

const devFormat = combine(
  colorize(),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp, stack }) =>
    stack
      ? `${timestamp} ${level}: ${message}\n${stack}`
      : `${timestamp} ${level}: ${message}`
  )
)

const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  format.json()
)

const logger = createLogger({
  level: env.isDevelopment() ? 'debug' : 'info',
  format: env.isProduction() ? prodFormat : devFormat,
  transports: [
    new transports.Console(),
    ...(env.isProduction()
      ? [
          new transports.File({ filename: 'logs/error.log',  level: 'error' }),
          new transports.File({ filename: 'logs/combined.log' }),
        ]
      : []),
  ],
  silent: env.isTest(),
})

module.exports = logger
