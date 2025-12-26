import { Request, Response, NextFunction } from 'express'
import { logger } from '../logger'

/**
 * Middleware de logging de requests
 * - Captura método, path, status code, duration
 * - Incluye correlation ID para tracing
 * - Logs estructurados en formato JSON
 * - Fundamental para observabilidad
 */
export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now()

  // Log incoming request
  logger.info('Incoming request', {
    correlationId: req.correlationId,
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  })

  // Capture response finish event
  res.on('finish', () => {
    const duration = Date.now() - startTime

    const logData = {
      correlationId: req.correlationId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('content-length'),
    }

    if (res.statusCode >= 500) {
      logger.error('Request completed with server error', logData)
    } else if (res.statusCode >= 400) {
      logger.warn('Request completed with client error', logData)
    } else {
      logger.info('Request completed successfully', logData)
    }
  })

  next()
}
