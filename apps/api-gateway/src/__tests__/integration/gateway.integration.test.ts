import request from 'supertest'
import express, { Express } from 'express'
import helmet from 'helmet'
import cors from 'cors'
import jwt from 'jsonwebtoken'

// Set JWT_SECRET before importing modules that depend on it
process.env.JWT_SECRET = 'test-secret-key'

import { setupRoutes } from '../../infrastructure/routes'
import { errorHandler } from '../../infrastructure/middleware/error-handler'
import { correlationIdMiddleware } from '../../infrastructure/middleware/correlation-id'
import { requestLoggerMiddleware } from '../../infrastructure/middleware/request-logger'

const JWT_SECRET = 'test-secret-key'

// Mock logger to avoid console spam in tests
jest.mock('../../infrastructure/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}))

describe('API Gateway Integration Tests', () => {
  let app: Express

  beforeAll(() => {
    app = express()

    // Apply middlewares in correct order
    app.use(correlationIdMiddleware)
    app.use(requestLoggerMiddleware)
    app.use(helmet())
    app.use(cors())
    app.use(express.json({ limit: '10kb' }))
    app.use(express.urlencoded({ extended: true, limit: '10kb' }))

    // Setup routes
    setupRoutes(app)

    // Error handler
    app.use(errorHandler)
  })

  describe('GET /health', () => {
    it('should return 200 and health status', async () => {
      const response = await request(app).get('/health')

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        status: 'ok',
        service: 'api-gateway',
      })
      expect(response.body.timestamp).toBeDefined()
    })

    it('should include correlation ID in response headers', async () => {
      const response = await request(app).get('/health')

      expect(response.headers['x-correlation-id']).toBeDefined()
      expect(response.headers['x-correlation-id']).toMatch(/^[0-9a-f-]+$/)
    })
  })

  describe('GET /status', () => {
    it('should return operational status with observability data', async () => {
      const response = await request(app).get('/status')

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject({
        status: 'operational',
        service: 'api-gateway',
        version: '1.0.0',
      })
      expect(response.body.uptime).toMatch(/^\d+s$/)
      expect(response.body.memory).toBeDefined()
      expect(response.body.memory.rss).toMatch(/^\d+MB$/)
      expect(response.body.upstreamServices).toBeDefined()
    })
  })

  describe('API Versioning', () => {
    it('should accept requests to /api/v1/auth', async () => {
      // This will fail to proxy (service not running), but should reach the proxy middleware
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com', password: 'test123' })

      // Expect proxy error (503) since auth service isn't running in tests
      expect([503, 200]).toContain(response.status)
    })

    it('should accept requests to /api/v1/products', async () => {
      const response = await request(app).get('/api/v1/products')

      // Expect proxy error (503) since product service isn't running
      expect([503, 200]).toContain(response.status)
    })
  })

  describe('JWT Protected Routes', () => {
    it('should reject request to /api/v1/orders without token', async () => {
      const response = await request(app).get('/api/v1/orders')

      expect(response.status).toBe(401)
      expect(response.body).toMatchObject({
        error: 'Unauthorized',
        message: 'Missing Authorization header',
      })
    })

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', 'Bearer invalid-token')

      expect(response.status).toBe(401)
      expect(response.body).toMatchObject({
        error: 'Unauthorized',
        message: 'Invalid token',
      })
    })

    it('should accept request to /api/v1/orders with valid token', async () => {
      const validToken = jwt.sign(
        { userId: '123', email: 'test@example.com', role: 'customer' },
        JWT_SECRET,
        { expiresIn: '1h' }
      )

      const response = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${validToken}`)

      // Should either proxy successfully or fail with 503 (service unavailable)
      // but NOT 401 (authentication passed)
      expect(response.status).not.toBe(401)
    })
  })

  describe('Optional JWT Routes', () => {
    it('should allow request to /api/v1/products without token', async () => {
      const response = await request(app).get('/api/v1/products')

      // Should not return 401 (optional auth)
      expect(response.status).not.toBe(401)
    })

    it('should allow request to /api/v1/products with valid token', async () => {
      const validToken = jwt.sign(
        { userId: '456', email: 'seller@example.com', role: 'seller' },
        JWT_SECRET,
        { expiresIn: '1h' }
      )

      const response = await request(app)
        .get('/api/v1/products')
        .set('Authorization', `Bearer ${validToken}`)

      expect(response.status).not.toBe(401)
    })
  })

  describe('Correlation ID Propagation', () => {
    it('should use provided correlation ID', async () => {
      const customCorrelationId = '123e4567-e89b-12d3-a456-426614174000'

      const response = await request(app)
        .get('/health')
        .set('X-Correlation-ID', customCorrelationId)

      expect(response.headers['x-correlation-id']).toBe(customCorrelationId)
    })

    it('should generate correlation ID if not provided', async () => {
      const response = await request(app).get('/health')

      expect(response.headers['x-correlation-id']).toBeDefined()
      expect(response.headers['x-correlation-id']).toMatch(/^[0-9a-f-]{36}$/)
    })
  })

  describe('Error Handling', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app).get('/non-existent-route')

      expect(response.status).toBe(404)
    })
  })
})
