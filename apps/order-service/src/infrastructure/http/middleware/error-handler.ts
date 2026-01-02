import { Request, Response, NextFunction } from 'express';
import { logger } from '@/infrastructure/observability/logger';

/**
 * Global Error Handler Middleware
 * 
 * Catches all errors and returns consistent error responses
 * Must be registered as last middleware in Express app
 */
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction,
): void => {
  logger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    correlationId: req.headers['x-correlation-id'],
  });

  // Determine status code based on error type
  let statusCode = 500;
  let message = 'Internal server error';

  if (error.message.includes('not found')) {
    statusCode = 404;
    message = error.message;
  } else if (error.message.includes('Forbidden')) {
    statusCode = 403;
    message = error.message;
  } else if (error.message.includes('Unauthorized')) {
    statusCode = 401;
    message = error.message;
  } else if (
    error.message.includes('validation') ||
    error.message.includes('invalid') ||
    error.message.includes('required')
  ) {
    statusCode = 400;
    message = error.message;
  }

  res.status(statusCode).json({
    error: message,
    correlationId: req.headers['x-correlation-id'],
    ...(process.env.NODE_ENV === 'development' && {
      stack: error.stack,
    }),
  });
};
