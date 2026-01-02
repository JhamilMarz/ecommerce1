import { v4 as uuidv4 } from 'uuid'
import { PaymentSimulator, PaymentSimulationRequest, PaymentSimulationResult } from '@/application/interfaces/payment-simulator'
import { PaymentMethod } from '@/domain/entities/payment-method'

/**
 * Payment Simulator Service
 * 
 * Architecture: Clean Architecture - Infrastructure Layer
 * 
 * IMPORTANT: THIS IS A SIMULATOR FOR DEVELOPMENT/TESTING ONLY
 * 
 * For PRODUCTION, replace with real payment gateway integration:
 * - Stripe SDK (https://stripe.com/docs/api)
 * - PayPal SDK (https://developer.paypal.com/docs/api/overview/)
 * - Implement webhook handlers for async notifications
 * - Handle PCI compliance requirements
 * - Implement proper error handling and retry logic
 * - Add fraud detection
 * - Implement 3D Secure / Strong Customer Authentication
 * 
 * PLACEHOLDER FOR EXTERNAL PAYMENT SERVICE:
 * console.log("INSERTAR SERVICIO DE PAGO EXTERNO")
 * 
 * Simulation Logic:
 * - 80% success rate (random)
 * - 20% failure rate (random failures)
 * - Simulated processing delay: 500-2000ms
 * - Generates mock provider transaction IDs
 * - Returns mock provider responses
 */

export class PaymentSimulatorService implements PaymentSimulator {
  private readonly successRate: number = 0.8 // 80% success
  private readonly minProcessingTime: number = 500 // 500ms
  private readonly maxProcessingTime: number = 2000 // 2000ms

  /**
   * Simulates payment processing
   * 
   * PRODUCTION: Replace with real payment gateway API call
   * Example Stripe integration:
   * 
   * ```typescript
   * const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
   * const paymentIntent = await stripe.paymentIntents.create({
   *   amount: Math.round(request.amount * 100), // Stripe uses cents
   *   currency: request.currency.toLowerCase(),
   *   metadata: {
   *     paymentId: request.paymentId,
   *     orderId: request.orderId,
   *     userId: request.userId
   *   }
   * })
   * ```
   */
  async processPayment(request: PaymentSimulationRequest): Promise<PaymentSimulationResult> {
    // PLACEHOLDER: Log where external payment service would be integrated
    console.log('INSERTAR SERVICIO DE PAGO EXTERNO')
    console.log('Payment Simulator: Processing payment', {
      paymentId: request.paymentId,
      orderId: request.orderId,
      amount: request.amount,
      currency: request.currency,
      method: request.method,
    })

    // Validate payment method is supported
    if (!this.isMethodSupported(request.method)) {
      return {
        success: false,
        providerTransactionId: uuidv4(),
        failureReason: `Payment method ${request.method} not supported`,
        processingTime: 100,
      }
    }

    // Simulate processing delay
    const processingTime = this.getRandomProcessingTime()
    await this.sleep(processingTime)

    // Simulate success/failure (80% success rate)
    const isSuccess = Math.random() < this.successRate

    if (isSuccess) {
      // Simulate successful payment
      const result: PaymentSimulationResult = {
        success: true,
        providerTransactionId: this.generateProviderTransactionId(),
        providerResponse: {
          authCode: this.generateAuthCode(),
          cardLast4: this.generateCardLast4(),
          cardBrand: this.getCardBrand(request.method),
          timestamp: new Date().toISOString(),
          message: 'Payment processed successfully',
        },
        processingTime,
      }

      console.log('Payment Simulator: Payment succeeded', {
        paymentId: request.paymentId,
        providerTransactionId: result.providerTransactionId,
      })

      return result
    } else {
      // Simulate failed payment
      const failureReasons = [
        'Insufficient funds',
        'Card declined',
        'Invalid card number',
        'Card expired',
        'Transaction timeout',
        'Payment gateway error',
      ]

      const failureReason = failureReasons[Math.floor(Math.random() * failureReasons.length)]

      const result: PaymentSimulationResult = {
        success: false,
        providerTransactionId: this.generateProviderTransactionId(),
        failureReason,
        providerResponse: {
          errorCode: this.getErrorCode(failureReason),
          errorMessage: failureReason,
          timestamp: new Date().toISOString(),
        },
        processingTime,
      }

      console.log('Payment Simulator: Payment failed', {
        paymentId: request.paymentId,
        providerTransactionId: result.providerTransactionId,
        failureReason,
      })

      return result
    }
  }

  /**
   * Checks if payment method is supported
   */
  isMethodSupported(method: PaymentMethod): boolean {
    return Object.values(PaymentMethod).includes(method)
  }

  /**
   * Returns estimated processing time for payment method
   */
  getEstimatedProcessingTime(method: PaymentMethod): number {
    const processingTimes: Record<PaymentMethod, number> = {
      [PaymentMethod.CREDIT_CARD]: 1000,
      [PaymentMethod.DEBIT_CARD]: 1200,
      [PaymentMethod.PAYPAL]: 1500,
      [PaymentMethod.STRIPE]: 800,
      [PaymentMethod.BANK_TRANSFER]: 2000,
    }

    return processingTimes[method] || 1000
  }

  /**
   * Helper: Generates random processing time
   */
  private getRandomProcessingTime(): number {
    return Math.floor(
      Math.random() * (this.maxProcessingTime - this.minProcessingTime) +
        this.minProcessingTime
    )
  }

  /**
   * Helper: Generates mock provider transaction ID
   */
  private generateProviderTransactionId(): string {
    return `provider-txn-${uuidv4()}`
  }

  /**
   * Helper: Generates mock authorization code
   */
  private generateAuthCode(): string {
    return `AUTH${Math.floor(Math.random() * 1000000)
      .toString()
      .padStart(6, '0')}`
  }

  /**
   * Helper: Generates mock card last 4 digits
   */
  private generateCardLast4(): string {
    return Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0')
  }

  /**
   * Helper: Returns card brand based on payment method
   */
  private getCardBrand(method: PaymentMethod): string {
    if (method === PaymentMethod.CREDIT_CARD || method === PaymentMethod.DEBIT_CARD) {
      const brands = ['Visa', 'Mastercard', 'American Express', 'Discover']
      return brands[Math.floor(Math.random() * brands.length)]
    }
    return method
  }

  /**
   * Helper: Maps failure reason to error code
   */
  private getErrorCode(failureReason: string): string {
    const errorCodeMap: Record<string, string> = {
      'Insufficient funds': 'INSUFFICIENT_FUNDS',
      'Card declined': 'CARD_DECLINED',
      'Invalid card number': 'INVALID_CARD',
      'Card expired': 'CARD_EXPIRED',
      'Transaction timeout': 'TIMEOUT',
      'Payment gateway error': 'GATEWAY_ERROR',
    }

    return errorCodeMap[failureReason] || 'UNKNOWN_ERROR'
  }

  /**
   * Helper: Simulates async delay
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
