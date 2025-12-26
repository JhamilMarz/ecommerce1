import { Express } from 'express'
import { createProxyMiddleware } from 'http-proxy-middleware'
import rateLimit from 'express-rate-limit'

import { config } from '../config'
import { logger } from '../logger'
import { jwtValidationMiddleware, optionalJwtMiddleware } from '../middleware/jwt-validation'

const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: 'Too many requests from this IP, please try again later.',
})

const startTime = Date.now()

export function setupRoutes(app: Express): void {
  // Apply rate limiting globally
  app.use(limiter)

  // Health check endpoint (no auth required)
  app.get('/health', (_req, res) => {
    res.json({ 
      status: 'ok', 
      service: 'api-gateway',
      timestamp: new Date().toISOString(),
    })
  })

  // Status endpoint for observability (no auth required)
  app.get('/status', (_req, res) => {
    const uptime = Math.floor((Date.now() - startTime) / 1000)
    const memoryUsage = process.memoryUsage()

    res.json({
      status: 'operational',
      service: 'api-gateway',
      version: '1.0.0',
      uptime: `${uptime}s`,
      timestamp: new Date().toISOString(),
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`,
      },
      environment: config.env,
      upstreamServices: {
        auth: config.services.auth,
        product: config.services.product,
        order: config.services.order,
        notification: config.services.notification,
        payment: config.services.payment,
      },
    })
  })

  // API v1 Routes
  // Auth service proxy (public - no JWT required for login/register)
  app.use(
    '/api/v1/auth',
    createProxyMiddleware({
      target: config.services.auth,
      changeOrigin: true,
      pathRewrite: { '^/api/v1/auth': '/auth' },
      on: {
        error: (err, _req, res) => {
          logger.error('Auth service proxy error:', err)
          if ('status' in res && typeof res.status === 'function') {
            res.status(503).json({ error: 'Auth service unavailable' })
          }
        },
      },
    })
  )

  // Product service proxy (public with optional auth)
  app.use(
    '/api/v1/products',
    optionalJwtMiddleware,
    createProxyMiddleware({
      target: config.services.product,
      changeOrigin: true,
      pathRewrite: { '^/api/v1/products': '/products' },
      on: {
        proxyReq: (proxyReq, req) => {
          // Forward user info if authenticated
          if (req.user) {
            proxyReq.setHeader('X-User-Id', req.user.userId)
            proxyReq.setHeader('X-User-Email', req.user.email)
            proxyReq.setHeader('X-User-Role', req.user.role)
          }
          // Forward correlation ID
          if (req.correlationId) {
            proxyReq.setHeader('X-Correlation-ID', req.correlationId)
          }
        },
        error: (err, _req, res) => {
          logger.error('Product service proxy error:', err)
          if ('status' in res && typeof res.status === 'function') {
            res.status(503).json({ error: 'Product service unavailable' })
          }
        },
      },
    })
  )

  // Order service proxy (protected - requires JWT)
  app.use(
    '/api/v1/orders',
    jwtValidationMiddleware,
    createProxyMiddleware({
      target: config.services.order,
      changeOrigin: true,
      pathRewrite: { '^/api/v1/orders': '/orders' },
      on: {
        proxyReq: (proxyReq, req) => {
          // Forward user info from JWT
          if (req.user) {
            proxyReq.setHeader('X-User-Id', req.user.userId)
            proxyReq.setHeader('X-User-Email', req.user.email)
            proxyReq.setHeader('X-User-Role', req.user.role)
          }
          // Forward correlation ID
          if (req.correlationId) {
            proxyReq.setHeader('X-Correlation-ID', req.correlationId)
          }
        },
        error: (err, _req, res) => {
          logger.error('Order service proxy error:', err)
          if ('status' in res && typeof res.status === 'function') {
            res.status(503).json({ error: 'Order service unavailable' })
          }
        },
      },
    })
  )

  // Payment service proxy (protected - requires JWT)
  app.use(
    '/api/v1/payments',
    jwtValidationMiddleware,
    createProxyMiddleware({
      target: config.services.payment,
      changeOrigin: true,
      pathRewrite: { '^/api/v1/payments': '/payments' },
      on: {
        proxyReq: (proxyReq, req) => {
          if (req.user) {
            proxyReq.setHeader('X-User-Id', req.user.userId)
            proxyReq.setHeader('X-User-Email', req.user.email)
            proxyReq.setHeader('X-User-Role', req.user.role)
          }
          if (req.correlationId) {
            proxyReq.setHeader('X-Correlation-ID', req.correlationId)
          }
        },
        error: (err, _req, res) => {
          logger.error('Payment service proxy error:', err)
          if ('status' in res && typeof res.status === 'function') {
            res.status(503).json({ error: 'Payment service unavailable' })
          }
        },
      },
    })
  )

  // Notification service proxy (protected - requires JWT)
  app.use(
    '/api/v1/notifications',
    jwtValidationMiddleware,
    createProxyMiddleware({
      target: config.services.notification,
      changeOrigin: true,
      pathRewrite: { '^/api/v1/notifications': '/notifications' },
      on: {
        proxyReq: (proxyReq, req) => {
          if (req.user) {
            proxyReq.setHeader('X-User-Id', req.user.userId)
            proxyReq.setHeader('X-User-Email', req.user.email)
            proxyReq.setHeader('X-User-Role', req.user.role)
          }
          if (req.correlationId) {
            proxyReq.setHeader('X-Correlation-ID', req.correlationId)
          }
        },
        error: (err, _req, res) => {
          logger.error('Notification service proxy error:', err)
          if ('status' in res && typeof res.status === 'function') {
            res.status(503).json({ error: 'Notification service unavailable' })
          }
        },
      },
    })
  )

  logger.info('Routes configured with API versioning (v1)')
}
