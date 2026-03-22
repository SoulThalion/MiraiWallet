'use strict'

const express  = require('express')
const helmet   = require('helmet')
const cors     = require('cors')
const morgan   = require('morgan')
const env      = require('./config/env')
const routes   = require('./routes')
const { errorHandler, notFoundHandler } = require('./middlewares/error.middleware')

function createApp() {
  const app = express()

  // ── Security headers ──────────────────────────────────
  app.use(helmet())

  // ── CORS ─────────────────────────────────────────────
  app.use(cors({
    origin:      env.corsOrigin,
    credentials: true,
    methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }))

  // ── Body parsing ──────────────────────────────────────
  app.use(express.json({ limit: '1mb' }))
  app.use(express.urlencoded({ extended: true }))

  // ── HTTP logging ──────────────────────────────────────
  if (!env.isTest()) {
    app.use(morgan(env.isDevelopment() ? 'dev' : 'combined'))
  }

  // ── API routes ────────────────────────────────────────
  app.use('/api/v1', routes)

  // ── Error handling (must be last) ────────────────────
  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}

module.exports = createApp
