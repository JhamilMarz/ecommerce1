import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config'

interface JwtPayload {
  userId: string
  email: string
  role: string
  iat?: number
  exp?: number
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload
    }
  }
}

/**
 * Middleware de validación JWT
 * - Extrae token del header Authorization (Bearer token)
 * - Verifica firma con JWT_SECRET
 * - Decodifica payload y lo adjunta a req.user
 * - Retorna 401 si token inválido o ausente
 * - Fundamental para seguridad
 */
export function jwtValidationMiddleware(req: Request, res: Response, next: NextFunction): void {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization

    if (!authHeader) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing Authorization header',
        correlationId: req.correlationId,
      })
      return
    }

    if (!authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid Authorization header format. Use: Bearer <token>',
        correlationId: req.correlationId,
      })
      return
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix

    if (!token) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing token',
        correlationId: req.correlationId,
      })
      return
    }

    // Verify and decode token
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload

    // Attach user info to request
    req.user = decoded

    next()
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Token expired',
        correlationId: req.correlationId,
      })
      return
    }

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid token',
        correlationId: req.correlationId,
      })
      return
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Error validating token',
      correlationId: req.correlationId,
    })
  }
}

/**
 * Middleware opcional de JWT (no falla si no hay token)
 * Útil para endpoints que pueden funcionar con o sin auth
 */
export function optionalJwtMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // No token provided, continue without user info
    next()
    return
  }

  const token = authHeader.substring(7)

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload
    req.user = decoded
  } catch (error) {
    // Invalid token, but we don't fail - just continue without user info
    // Could log this for security monitoring
  }

  next()
}
