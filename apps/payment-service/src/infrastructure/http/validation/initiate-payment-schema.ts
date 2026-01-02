import Joi from 'joi'
import { PaymentMethod } from '@/domain/entities/payment-method'

/**
 * Initiate Payment Validation Schema
 * 
 * Architecture: Clean Architecture - Infrastructure Layer (HTTP)
 * 
 * Validates request body for POST /payments/init
 * 
 * Validation Rules:
 * - orderId: Required, string, min 1 char
 * - userId: Required, string, min 1 char
 * - amount: Required, number, min 0.01 (positive, at least 1 cent)
 * - currency: Optional, string, 3 chars, uppercase, default "USD"
 * - method: Required, one of PaymentMethod enum values
 * - correlationId: Optional, string, UUID format
 */

export const initiatePaymentSchema = Joi.object({
  orderId: Joi.string().min(1).required().messages({
    'string.empty': 'Order ID cannot be empty',
    'any.required': 'Order ID is required',
  }),

  userId: Joi.string().min(1).required().messages({
    'string.empty': 'User ID cannot be empty',
    'any.required': 'User ID is required',
  }),

  amount: Joi.number().min(0.01).required().messages({
    'number.min': 'Amount must be at least 0.01',
    'any.required': 'Amount is required',
  }),

  currency: Joi.string()
    .length(3)
    .uppercase()
    .default('USD')
    .optional()
    .messages({
      'string.length': 'Currency must be 3 characters (e.g., USD, EUR)',
    }),

  method: Joi.string()
    .valid(...Object.values(PaymentMethod))
    .required()
    .messages({
      'any.only': `Payment method must be one of: ${Object.values(PaymentMethod).join(', ')}`,
      'any.required': 'Payment method is required',
    }),

  correlationId: Joi.string().uuid().optional().messages({
    'string.guid': 'Correlation ID must be a valid UUID',
  }),
})
