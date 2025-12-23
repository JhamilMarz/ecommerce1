import { Express } from 'express'
import { createProxyMiddleware } from 'http-proxy-middleware'
import rateLimit from 'express-rate-limit'

import { config } from '../config'
import { logger } from '../logger'

const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: 'Too many requests from this IP, please try again later.',
})

export function setupRoutes(app: Express): void {
  // Apply rate limiting
  app.use(limiter)

  // Auth service proxy
  app.use(
    '/api/auth',
    createProxyMiddleware({
      target: config.services.auth,
      changeOrigin: true,
      pathRewrite: { '^/api/auth': '' },
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

  // Product service proxy
  app.use(
    '/api/products',
    createProxyMiddleware({
      target: config.services.product,
      changeOrigin: true,
      pathRewrite: { '^/api/products': '' },
      on: {
        error: (err, _req, res) => {
          logger.error('Product service proxy error:', err)
          if ('status' in res && typeof res.status === 'function') {
            res.status(503).json({ error: 'Product service unavailable' })
          }
        },
      },
    })
  )

  // Order service proxy
  app.use(
    '/api/orders',
    createProxyMiddleware({
      target: config.services.order,
      changeOrigin: true,
      pathRewrite: { '^/api/orders': '' },
      on: {
        error: (err, _req, res) => {
          logger.error('Order service proxy error:', err)
          if ('status' in res && typeof res.status === 'function') {
            res.status(503).json({ error: 'Order service unavailable' })
          }
        },
      },
    })
  )

  // Notification service proxy
  app.use(
    '/api/notifications',
    createProxyMiddleware({
      target: config.services.notification,
      changeOrigin: true,
      pathRewrite: { '^/api/notifications': '' },
      on: {
        error: (err, _req, res) => {
          logger.error('Notification service proxy error:', err)
          if ('status' in res && typeof res.status === 'function') {
            res.status(503).json({ error: 'Notification service unavailable' })
          }
        },
      },
    })
  )

  // Payment service proxy
  app.use(
    '/api/payments',
    createProxyMiddleware({
      target: config.services.payment,
      changeOrigin: true,
      pathRewrite: { '^/api/payments': '' },
      on: {
        error: (err, _req, res) => {
          logger.error('Payment service proxy error:', err)
          if ('status' in res && typeof res.status === 'function') {
            res.status(503).json({ error: 'Payment service unavailable' })
          }
        },
      },
    })
  )

  logger.info('Routes configured')
}
