import { Router } from 'express'
import { PaymentController } from '../controllers/payment-controller'
import { validateRequest } from '../middleware/validation'
import { authenticate } from '../middleware/auth'
import { attachCorrelationId } from '../middleware/correlation-id'
import { initiatePaymentSchema } from '../validation/initiate-payment-schema'

/**
 * Payment Routes
 * 
 * Architecture: Clean Architecture - Infrastructure Layer (HTTP)
 * 
 * Defines HTTP routes for payment operations
 * 
 * Endpoints:
 * - POST /payments/init - Initiate payment (authenticated, validated)
 * - GET /payments/:id - Get payment by ID (authenticated)
 * - GET /payments/order/:orderId - Get payments by order (authenticated)
 * - GET /health - Health check (public)
 * 
 * Middleware chain:
 * 1. attachCorrelationId - Adds x-correlation-id header
 * 2. authenticate - JWT validation (except health)
 * 3. validateRequest - Joi schema validation
 * 4. controller method
 * 5. errorHandler (global middleware in app)
 */

export function createPaymentRoutes(controller: PaymentController): Router {
  const router = Router()

  // Apply correlation ID to all routes
  router.use(attachCorrelationId)

  /**
   * POST /payments/init
   * Initiate new payment
   * 
   * Middleware:
   * - authenticate: Validates JWT token
   * - validateRequest: Validates request body against Joi schema
   * 
   * Request body:
   * {
   *   "orderId": "string" (required),
   *   "userId": "string" (required),
   *   "amount": number (required, > 0),
   *   "currency": "string" (optional, default "USD"),
   *   "method": "credit_card" | "debit_card" | "paypal" | "stripe" | "bank_transfer" (required),
   *   "correlationId": "string" (optional)
   * }
   */
  router.post(
    '/init',
    authenticate,
    validateRequest(initiatePaymentSchema),
    (req, res) => controller.initiatePayment(req, res)
  )

  /**
   * GET /payments/:id
   * Get payment by ID
   * 
   * Middleware:
   * - authenticate: Validates JWT token
   * 
   * RBAC:
   * - Users: Can only view their own payments
   * - Admins: Can view all payments
   * 
   * Returns:
   * - 200: Payment found and user authorized
   * - 404: Payment not found or user not authorized (anti-enumeration)
   * - 401: No authentication token
   */
  router.get('/:id', authenticate, (req, res) =>
    controller.getPayment(req, res)
  )

  /**
   * GET /payments/order/:orderId
   * Get all payments for an order
   * 
   * Middleware:
   * - authenticate: Validates JWT token
   * 
   * RBAC:
   * - Users: Can only view payments for their own orders
   * - Admins: Can view payments for all orders
   * 
   * Returns:
   * - 200: Array of payments (empty if not found or not authorized - anti-enumeration)
   * - 401: No authentication token
   */
  router.get('/order/:orderId', authenticate, (req, res) =>
    controller.getPaymentsByOrder(req, res)
  )

  /**
   * GET /health
   * Health check endpoint
   * 
   * No authentication required
   * Used by Docker healthcheck, Kubernetes liveness/readiness probes
   * 
   * Returns:
   * - 200: Service healthy
   * - 503: Service unhealthy
   */
  router.get('/health', (req, res) => controller.healthCheck(req, res))

  return router
}
