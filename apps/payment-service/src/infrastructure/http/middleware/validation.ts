import { Request, Response, NextFunction } from 'express'
import Joi from 'joi'
import { logger } from '@/infrastructure/observability/logger'

/**
 * Validation Middleware
 * 
 * Architecture: Clean Architecture - Infrastructure Layer (HTTP)
 * 
 * Validates request body, query params, or route params against Joi schema
 * 
 * Options:
 * - abortEarly: false (returns all errors)
 * - stripUnknown: true (removes unknown properties)
 * 
 * Returns 400 Bad Request with validation errors
 */
export const validateRequest = (
  schema: Joi.ObjectSchema,
  property: 'body' | 'query' | 'params' = 'body'
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false, // Return all errors
      stripUnknown: true, // Remove unknown properties
    })

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }))

      logger.warn('Validation failed', {
        property,
        errors,
        correlationId: req.headers['x-correlation-id'],
      })

      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors,
      })
      return
    }

    // Replace request property with validated value (applies defaults)
    req[property] = value
    next()
  }
}
