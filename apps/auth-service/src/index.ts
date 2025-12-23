import express from 'express'

import { config } from './infrastructure/config'
import { logger } from './infrastructure/logger'
import { setupRoutes } from './infrastructure/api/routes'
import { errorHandler } from './infrastructure/api/middleware/error-handler'

const app = express()

// Body parsing
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'auth-service' })
})

// Setup routes
setupRoutes(app)

// Error handling
app.use(errorHandler)

const PORT = config.port
const HOST = config.host

app.listen(PORT, HOST, () => {
  logger.info(`Auth Service running on ${HOST}:${PORT}`)
  logger.info(`Environment: ${config.env}`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully')
  process.exit(0)
})
