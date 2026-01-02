import { Router } from 'express';
import { OrderController } from '../controllers/order-controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validation';
import {
  createOrderSchema,
  updateOrderStatusSchema,
  paginationSchema,
  uuidParamSchema,
} from '../validation/schemas';

/**
 * Order Routes
 * 
 * Architecture: Infrastructure Layer - HTTP
 * Defines all HTTP routes for order service
 */
export function createOrderRoutes(controller: OrderController): Router {
  const router = Router();

  /**
   * POST /orders
   * Create a new order
   * Auth: Required (any authenticated user)
   */
  router.post(
    '/',
    authenticate,
    validate(createOrderSchema, 'body'),
    controller.createOrder,
  );

  /**
   * GET /orders/:id
   * Get order by ID
   * Auth: Required (owner or admin)
   */
  router.get(
    '/:id',
    authenticate,
    validate(uuidParamSchema, 'params'),
    controller.getOrder,
  );

  /**
   * GET /orders/user/:userId
   * List orders for a user (paginated)
   * Auth: Required (owner or admin)
   */
  router.get(
    '/user/:userId',
    authenticate,
    validate(uuidParamSchema, 'params'),
    validate(paginationSchema, 'query'),
    controller.listUserOrders,
  );

  /**
   * PATCH /orders/:id/status
   * Update order status
   * Auth: Required (admin only)
   */
  router.patch(
    '/:id/status',
    authenticate,
    authorize('admin'),
    validate(uuidParamSchema, 'params'),
    validate(updateOrderStatusSchema, 'body'),
    controller.updateOrderStatus,
  );

  /**
   * GET /orders/:id/history
   * Get order status change history
   * Auth: Required (owner or admin)
   */
  router.get(
    '/:id/history',
    authenticate,
    validate(uuidParamSchema, 'params'),
    controller.getOrderHistory,
  );

  return router;
}
