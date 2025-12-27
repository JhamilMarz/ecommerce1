import { Request, Response, NextFunction } from 'express';
import { logger } from '../../logger/logger';

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction): void {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    correlationId: req.headers['x-correlation-id'],
  });

  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
    correlationId: req.headers['x-correlation-id'],
  });
}
