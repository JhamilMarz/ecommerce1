import { Request, Response, NextFunction } from 'express'
import { v4 as uuidv4 } from 'uuid'

/**
 * Correlation ID Middleware
 * 
 * Architecture: Clean Architecture - Infrastructure Layer (HTTP)
 * 
 * Adds or forwards correlation ID for distributed tracing
 * Used to track requests across microservices
 * 
 * If x-correlation-id header exists, forwards it
 * Otherwise, generates new UUID
 * 
 * Adds correlation ID to:
 * - Request headers (for logging in controllers)
 * - Response headers (for client tracking)
 */
export const attachCorrelationId = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Get correlation ID from header or generate new one
  const correlationIdValue = (req.headers['x-correlation-id'] as string) || uuidv4()

  // Set header for downstream services
  req.headers['x-correlation-id'] = correlationIdValue

  // Add to response headers for client
  res.setHeader('x-correlation-id', correlationIdValue)

  next()
}
