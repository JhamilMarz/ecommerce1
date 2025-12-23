import express from 'express'
import helmet from 'helmet'
import cors from 'cors'

import { config } from './infrastructure/config'
import { logger } from './infrastructure/logger'
import { setupRoutes } from './infrastructure/routes'
import { errorHandler } from './infrastructure/middleware/error-handler'

const app = express()

// Security middleware
app.use(helmet())
app.use(cors({ origin: config.cors.origin, credentials: true }))

// Body parsing
app.use(express.json({ limit: '10kb' }))
app.use(express.urlencoded({ extended: true, limit: '10kb' }))

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'api-gateway' })
})

// Setup routes (proxies to microservices)
setupRoutes(app)

// Error handling
app.use(errorHandler)

const PORT = config.port
const HOST = config.host

app.listen(PORT, HOST, () => {
  logger.info(`API Gateway running on ${HOST}:${PORT}`)
  logger.info(`Environment: ${config.env}`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully')
  process.exit(0)
})
