import { Request, Response, NextFunction } from 'express'
import { logger } from '@/infrastructure/observability/logger'

/**
 * Global Error Handler Middleware
 * 
 * Architecture: Clean Architecture - Infrastructure Layer (HTTP)
 * 
 * Catches all errors and returns consistent error responses
 * Must be registered as LAST middleware in Express app
 * 
 * Error Handling:
 * - Logs error with stack trace
 * - Maps error messages to HTTP status codes
 * - Returns consistent JSON response
 * - Includes stack trace in development mode
 */
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  logger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    correlationId: req.headers['x-correlation-id'],
  })

  // Determine status code based on error message
  let statusCode = 500
  let message = 'Internal server error'

  if (
    error.message.includes('not found') ||
    error.message.includes('Not found')
  ) {
    statusCode = 404
    message = error.message
  } else if (
    error.message.includes('Forbidden') ||
    error.message.includes('forbidden')
  ) {
    statusCode = 403
    message = error.message
  } else if (
    error.message.includes('Unauthorized') ||
    error.message.includes('unauthorized')
  ) {
    statusCode = 401
    message = error.message
  } else if (
    error.message.includes('validation') ||
    error.message.includes('invalid') ||
    error.message.includes('required') ||
    error.message.includes('Invalid')
  ) {
    statusCode = 400
    message = error.message
  } else if (
    error.message.includes('already exists') ||
    error.message.includes('duplicate')
  ) {
    statusCode = 409
    message = error.message
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    correlationId: req.headers['x-correlation-id'],
    ...(process.env.NODE_ENV === 'development' && {
      stack: error.stack,
    }),
  })
}
