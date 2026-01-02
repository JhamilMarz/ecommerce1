import { Router } from 'express'
import { register } from 'prom-client'
import { HealthController } from './controllers/health-controller'

/**
 * HTTP Routes
 *
 * Defines Express routes for notification service.
 *
 * @remarks
 * - No business logic endpoints (internal service)
 * - Only observability endpoints (health, metrics)
 * - No authentication required
 */
export function createRoutes(healthController: HealthController): Router {
  const router = Router()

  /**
   * Health check endpoint
   *
   * @route GET /health
   * @returns Service health status
   */
  router.get('/health', async (req, res) => {
    await healthController.healthCheck(req, res)
  })

  /**
   * Prometheus metrics endpoint
   *
   * @route GET /metrics
   * @returns Prometheus metrics in text format
   */
  router.get('/metrics', async (req, res) => {
    try {
      res.set('Content-Type', register.contentType)
      const metrics = await register.metrics()
      res.end(metrics)
    } catch (error) {
      res.status(500).json({
        error: 'Failed to collect metrics',
        message: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  })

  return router
}
