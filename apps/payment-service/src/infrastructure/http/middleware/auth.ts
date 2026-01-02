import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { logger } from '@/infrastructure/observability/logger'

/**
 * JWT Payload Interface
 */
export interface JwtPayload {
  userId: string
  email: string
  role: string
  iat?: number
  exp?: number
}

/**
 * Extend Express Request to include user
 */
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload
    }
  }
}

/**
 * JWT Authentication Middleware
 * 
 * Architecture: Clean Architecture - Infrastructure Layer (HTTP)
 * 
 * Validates JWT token from Authorization header
 * Attaches user information to request object
 * 
 * Token format: Authorization: Bearer <token>
 * 
 * JWT Secret: Must be set in JWT_SECRET environment variable
 * Shared across all microservices
 */
export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header',
      })
      return
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix
    const secret = process.env.JWT_SECRET

    if (!secret) {
      logger.error('JWT_SECRET environment variable is not defined')
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Authentication configuration error',
      })
      return
    }

    // Verify token
    const decoded = jwt.verify(token, secret) as JwtPayload

    // Attach user to request
    req.user = decoded

    logger.debug('JWT authentication successful', {
      userId: decoded.userId,
      role: decoded.role,
      correlationId: req.headers['x-correlation-id'],
    })

    next()
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('JWT validation failed', {
        error: error.message,
        correlationId: req.headers['x-correlation-id'],
      })

      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      })
      return
    }

    logger.error('Authentication middleware error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      correlationId: req.headers['x-correlation-id'],
    })

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Authentication error',
    })
  }
}
