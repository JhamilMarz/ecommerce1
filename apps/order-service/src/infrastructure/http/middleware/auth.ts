import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '@/infrastructure/observability/logger';

/**
 * JWT Payload Interface
 */
export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

/**
 * Extended Request with user information
 */
export interface AuthRequest extends Request {
  user?: JwtPayload;
}

/**
 * JWT Authentication Middleware
 * 
 * Validates JWT token from Authorization header
 * Attaches user information to request object
 */
export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header',
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      logger.error('JWT_SECRET environment variable is not defined');
      res.status(500).json({
        error: 'Internal server error',
        message: 'Authentication configuration error',
      });
      return;
    }

    // Verify token
    const decoded = jwt.verify(token, secret) as JwtPayload;

    // Attach user to request
    req.user = decoded;

    logger.debug('JWT authentication successful', {
      userId: decoded.userId,
      role: decoded.role,
      correlationId: req.headers['x-correlation-id'],
    });

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('JWT validation failed', {
        error: error.message,
        correlationId: req.headers['x-correlation-id'],
      });

      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      });
      return;
    }

    logger.error('Authentication middleware error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      correlationId: req.headers['x-correlation-id'],
    });

    res.status(500).json({
      error: 'Internal server error',
      message: 'Authentication error',
    });
  }
};

/**
 * RBAC - Role-Based Access Control
 * 
 * Checks if user has required role
 */
export const authorize = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('Authorization failed', {
        userId: req.user.userId,
        role: req.user.role,
        requiredRoles: allowedRoles,
        correlationId: req.headers['x-correlation-id'],
      });

      res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions',
      });
      return;
    }

    next();
  };
};
