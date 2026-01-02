import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Correlation ID Middleware
 * 
 * Adds or forwards correlation ID for distributed tracing
 * Used to track requests across microservices
 */
export const correlationId = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  // Get correlation ID from header or generate new one
  const correlationId =
    (req.headers['x-correlation-id'] as string) || uuidv4();

  // Set header for downstream services
  req.headers['x-correlation-id'] = correlationId;

  // Add to response headers for client
  res.setHeader('x-correlation-id', correlationId);

  next();
};
