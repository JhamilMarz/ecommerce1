import { Request, Response, NextFunction } from 'express'
import { v4 as uuidv4 } from 'uuid'

declare global {
  namespace Express {
    interface Request {
      correlationId?: string
    }
  }
}

/**
 * Middleware que agrega o propaga Correlation ID
 * - Si la request ya tiene X-Correlation-ID header, lo usa
 * - Si no, genera uno nuevo con UUID v4
 * - Lo agrega al objeto request y al response header
 * - Fundamental para tracing distribuido
 */
export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Try to get correlation ID from incoming header
  const incomingCorrelationId = req.headers['x-correlation-id'] as string | undefined

  // Generate new one if not present
  const correlationId = incomingCorrelationId || uuidv4()

  // Attach to request object for downstream use
  req.correlationId = correlationId

  // Send back in response headers for client tracing
  res.setHeader('X-Correlation-ID', correlationId)

  next()
}
