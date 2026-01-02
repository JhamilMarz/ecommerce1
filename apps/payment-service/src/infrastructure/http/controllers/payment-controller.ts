import { Request, Response } from 'express'
import { InitiatePaymentUseCase } from '@/application/use-cases/initiate-payment'
import { GetPaymentUseCase } from '@/application/use-cases/get-payment'
import { GetPaymentsByOrderUseCase } from '@/application/use-cases/get-payments-by-order'
import { InitiatePaymentDto } from '@/application/dtos/payment-dto'

/**
 * Payment Controller
 * 
 * Architecture: Clean Architecture - Infrastructure Layer (HTTP)
 * 
 * Handles HTTP requests for payment operations:
 * - POST /payments/init - Initiate new payment
 * - GET /payments/:id - Get payment by ID
 * - GET /payments/order/:orderId - Get all payments for order
 * - GET /health - Health check endpoint
 * 
 * Security:
 * - JWT authentication required (except health check)
 * - RBAC: users see only their payments, admins see all
 * - Returns 404 (not 403) to prevent ID enumeration
 */

export class PaymentController {
  constructor(
    private readonly initiatePaymentUseCase: InitiatePaymentUseCase,
    private readonly getPaymentUseCase: GetPaymentUseCase,
    private readonly getPaymentsByOrderUseCase: GetPaymentsByOrderUseCase
  ) {}

  /**
   * POST /payments/init
   * Initiates a new payment for an order
   * 
   * Request body:
   * {
   *   "orderId": "string",
   *   "userId": "string",
   *   "amount": number,
   *   "currency": "string",
   *   "method": "credit_card" | "debit_card" | "paypal" | "stripe" | "bank_transfer",
   *   "correlationId"?: "string"
   * }
   * 
   * Response: PaymentResponseDto (201 Created)
   */
  async initiatePayment(req: Request, res: Response): Promise<void> {
    try {
      const dto: InitiatePaymentDto = {
        orderId: req.body.orderId,
        userId: req.body.userId,
        amount: req.body.amount,
        currency: req.body.currency || 'USD',
        method: req.body.method,
        correlationId: req.body.correlationId || req.headers['x-correlation-id'] as string,
      }

      const payment = await this.initiatePaymentUseCase.execute(dto)

      res.status(201).json({
        success: true,
        data: payment,
      })
    } catch (error) {
      // Let error middleware handle it
      throw error
    }
  }

  /**
   * GET /payments/:id
   * Retrieves a payment by ID
   * 
   * RBAC:
   * - Users can only view their own payments
   * - Admins can view all payments
   * 
   * Security:
   * - Returns 404 if payment not found or user lacks permission
   *   (prevents payment ID enumeration)
   * 
   * Response: PaymentResponseDto (200 OK) or 404 Not Found
   */
  async getPayment(req: Request, res: Response): Promise<void> {
    try {
      const paymentId = req.params.id
      const requestingUserId = req.user?.userId
      const isAdmin = req.user?.role === 'admin'

      if (!requestingUserId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        })
        return
      }

      const payment = await this.getPaymentUseCase.execute(
        paymentId,
        requestingUserId,
        isAdmin
      )

      if (!payment) {
        res.status(404).json({
          success: false,
          error: 'Payment not found',
        })
        return
      }

      res.status(200).json({
        success: true,
        data: payment,
      })
    } catch (error) {
      throw error
    }
  }

  /**
   * GET /payments/order/:orderId
   * Retrieves all payments for a specific order
   * 
   * RBAC:
   * - Users can only view payments for their own orders
   * - Admins can view payments for all orders
   * 
   * Security:
   * - Returns empty array if order not found or user lacks permission
   *   (prevents order ID enumeration)
   * 
   * Use cases:
   * - View payment history for an order
   * - Check if order has successful payment
   * - Track payment retries
   * 
   * Response: PaymentResponseDto[] (200 OK)
   */
  async getPaymentsByOrder(req: Request, res: Response): Promise<void> {
    try {
      const orderId = req.params.orderId
      const requestingUserId = req.user?.userId
      const isAdmin = req.user?.role === 'admin'

      if (!requestingUserId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        })
        return
      }

      const payments = await this.getPaymentsByOrderUseCase.execute(
        orderId,
        requestingUserId,
        isAdmin
      )

      res.status(200).json({
        success: true,
        data: payments,
        count: payments.length,
      })
    } catch (error) {
      throw error
    }
  }

  /**
   * GET /health
   * Health check endpoint
   * 
   * No authentication required
   * Used by Docker healthcheck, Kubernetes liveness/readiness probes
   * 
   * Response: { status: "ok", timestamp: ISO8601 }
   */
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      res.status(200).json({
        status: 'ok',
        service: 'payment-service',
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      res.status(503).json({
        status: 'error',
        service: 'payment-service',
        timestamp: new Date().toISOString(),
      })
    }
  }
}
