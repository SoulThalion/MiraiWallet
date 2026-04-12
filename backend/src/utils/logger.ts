import { createLogger, format, transports } from 'winston'
import env from '../config/env'

const { combine, timestamp, printf, colorize, errors } = format

const devFmt = combine(
  colorize(),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, stack }) =>
    stack ? `${ts} ${level}: ${message}\n${stack}` : `${ts} ${level}: ${message}`
  )
)

const prodFmt = combine(timestamp(), errors({ stack: true }), format.json())

const logger = createLogger({
  level:      env.isDevelopment() ? 'debug' : 'info',
  format:     env.isProduction() ? prodFmt : devFmt,
  transports: [
    new transports.Console(),
    ...(env.isProduction()
      ? [
          new transports.File({ filename: 'logs/error.log',   level: 'error' }),
          new transports.File({ filename: 'logs/combined.log' }),
        ]
      : []),
  ],
  silent: env.isTest(),
})

export default logger
