import { Request, Response, NextFunction } from 'express'

import { logger } from '../../logger'
import { UnauthorizedError } from '../../errors/unauthorized.error'
import { ConflictError } from '../../errors/conflict.error'

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error({
    message: err.message,
    stack: err.stack,
    name: err.name,
  })

  if (err instanceof UnauthorizedError) {
    res.status(401).json({ error: err.message })
    return
  }

  if (err instanceof ConflictError) {
    res.status(409).json({ error: err.message })
    return
  }

  res.status(500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
  })
}
