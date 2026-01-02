import Joi from 'joi';
import { OrderStatus } from '@/domain/entities/order-status';

/**
 * Validation Schemas - Joi
 * 
 * Architecture: Infrastructure Layer
 * Request validation using Joi (per Coding-Standards.md)
 */

/**
 * Schema for creating an order item
 */
const createOrderItemSchema = Joi.object({
  productId: Joi.string().required().trim().min(1),
  productName: Joi.string().required().trim().min(1).max(200),
  quantity: Joi.number().required().integer().min(1).max(1000),
  priceSnapshot: Joi.number().required().min(0).max(1000000),
});

/**
 * Schema for creating an order
 */
export const createOrderSchema = Joi.object({
  userId: Joi.string().required().trim().min(1),
  items: Joi.array().items(createOrderItemSchema).required().min(1).max(100),
  correlationId: Joi.string().optional().trim().uuid(),
});

/**
 * Schema for updating order status
 */
export const updateOrderStatusSchema = Joi.object({
  newStatus: Joi.string()
    .required()
    .valid(...Object.values(OrderStatus)),
  paymentReference: Joi.string().optional().trim().min(1).max(100),
  reason: Joi.string().optional().trim().max(500),
});

/**
 * Schema for query parameters (pagination)
 */
export const paginationSchema = Joi.object({
  page: Joi.number().optional().integer().min(1).default(1),
  limit: Joi.number().optional().integer().min(1).max(100).default(10),
  status: Joi.string()
    .optional()
    .valid(...Object.values(OrderStatus)),
});

/**
 * Schema for UUID parameters
 */
export const uuidParamSchema = Joi.object({
  id: Joi.string().required().trim().min(1),
  userId: Joi.string().optional().trim().min(1),
});
