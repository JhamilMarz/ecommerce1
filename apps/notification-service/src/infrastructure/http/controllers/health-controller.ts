import { Request, Response } from 'express'
import { isDatabaseHealthy } from '../../database'

/**
 * Health Controller
 *
 * Handles health check requests for monitoring and load balancers.
 *
 * @remarks
 * - No authentication required (public endpoint)
 * - Checks database connectivity
 * - Returns service status and metadata
 */
export class HealthController {
  private readonly startTime: number

  constructor() {
    this.startTime = Date.now()
  }

  /**
   * Health check endpoint
   *
   * Returns service health status.
   *
   * @route GET /health
   */
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      // Check database health
      const databaseHealthy = await isDatabaseHealthy()

      // Calculate uptime
      const uptime = Math.floor((Date.now() - this.startTime) / 1000) // seconds

      // Overall health status
      const isHealthy = databaseHealthy

      // Response
      const response = {
        status: isHealthy ? 'healthy' : 'unhealthy',
        service: 'notification-service',
        timestamp: new Date().toISOString(),
        uptime,
        checks: {
          database: databaseHealthy ? 'healthy' : 'unhealthy',
        },
      }

      res.status(isHealthy ? 200 : 503).json(response)
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        service: 'notification-service',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }
}
