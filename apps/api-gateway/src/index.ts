import express from 'express'
import helmet from 'helmet'
import cors from 'cors'

import { config } from './infrastructure/config'
import { logger } from './infrastructure/logger'
import { setupRoutes } from './infrastructure/routes'
import { errorHandler } from './infrastructure/middleware/error-handler'
import { correlationIdMiddleware } from './infrastructure/middleware/correlation-id'
import { requestLoggerMiddleware } from './infrastructure/middleware/request-logger'

const app = express()

// Correlation ID middleware (MUST BE FIRST)
app.use(correlationIdMiddleware)

// Request logging middleware (AFTER correlation ID)
app.use(requestLoggerMiddleware)

// Security middleware
app.use(helmet())
app.use(cors({ origin: config.cors.origin, credentials: true }))

// Body parsing
app.use(express.json({ limit: '10kb' }))
app.use(express.urlencoded({ extended: true, limit: '10kb' }))

// Setup routes (includes health, status, and proxies)
setupRoutes(app)

// Error handling (MUST BE LAST)
app.use(errorHandler)

const PORT = config.port
const HOST = config.host

app.listen(PORT, HOST, () => {
  logger.info(`API Gateway running on ${HOST}:${PORT}`)
  logger.info(`Environment: ${config.env}`)
  logger.info('API versioning: /api/v1')
})

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully')
  process.exit(0)
})
