import { PaymentMethod } from '@/domain/entities/payment-method'

/**
 * Payment Simulator Interface - Application Layer
 * 
 * Architecture: Clean Architecture - Application Layer
 * Simulates external payment gateway (Stripe, PayPal, etc.)
 * Implementation will be in Infrastructure Layer
 * 
 * IMPORTANT: THIS IS A SIMULATOR FOR DEVELOPMENT/TESTING
 * For production, implement real payment gateway integration:
 * - Stripe SDK
 * - PayPal SDK
 * - Payment gateway webhooks
 * - PCI compliance requirements
 * 
 * Placeholder for future implementation:
 * console.log("INSERTAR SERVICIO DE PAGO EXTERNO")
 */

/**
 * Payment simulation result
 */
export interface PaymentSimulationResult {
  success: boolean
  providerTransactionId: string
  providerResponse?: Record<string, unknown>
  failureReason?: string
  processingTime: number // milliseconds
}

/**
 * Payment request for simulation
 */
export interface PaymentSimulationRequest {
  paymentId: string
  amount: number
  currency: string
  method: PaymentMethod
  userId: string
  orderId: string
}

/**
 * Payment Simulator Interface
 * Abstracts payment gateway implementation
 */
export interface PaymentSimulator {
  /**
   * Simulates payment processing
   * 
   * In production, this would:
   * 1. Call real payment gateway API (Stripe, PayPal)
   * 2. Handle 3D Secure authentication
   * 3. Process webhooks
   * 4. Handle retries and idempotency
   * 
   * Current implementation:
   * - 80% success rate (random)
   * - Simulated delay (500-2000ms)
   * - Mock provider transaction ID
   * - Mock provider response
   * 
   * @param request - Payment simulation request
   * @returns Simulation result (success/failure)
   */
  processPayment(
    request: PaymentSimulationRequest,
  ): Promise<PaymentSimulationResult>

  /**
   * Validates payment method is supported
   * 
   * @param method - Payment method to validate
   * @returns true if supported, false otherwise
   */
  isMethodSupported(method: PaymentMethod): boolean

  /**
   * Gets estimated processing time for method
   * Different methods have different processing times
   * 
   * @param method - Payment method
   * @returns Estimated time in milliseconds
   */
  getEstimatedProcessingTime(method: PaymentMethod): number
}
