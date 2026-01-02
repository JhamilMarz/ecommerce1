import { Payment } from '@/domain/entities/payment'
import { PaymentRepository } from '@/domain/repositories/payment-repository'
import { EventPublisher } from '../interfaces/event-publisher-interface'
import { PaymentSimulator } from '../interfaces/payment-simulator'
import { InitiatePaymentDto, PaymentResponseDto } from '../dtos/payment-dto'
import { v4 as uuidv4 } from 'uuid'

/**
 * Initiate Payment Use Case
 * 
 * Architecture: Clean Architecture - Application Layer
 * Orchestrates payment initiation workflow
 * 
 * Flow:
 * 1. Validate input
 * 2. Create Payment entity
 * 3. Save to repository
 * 4. Trigger payment processing (async via simulator)
 * 5. Return payment response
 * 
 * Note: Processing happens asynchronously
 * Callback will publish payment.succeeded or payment.failed events
 */
export class InitiatePaymentUseCase {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly paymentSimulator: PaymentSimulator,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(dto: InitiatePaymentDto): Promise<PaymentResponseDto> {
    // Validate input
    this.validateInput(dto)

    // Check if payment method is supported
    if (!this.paymentSimulator.isMethodSupported(dto.method)) {
      throw new Error(`Payment method '${dto.method}' is not supported`)
    }

    // Check if payment already exists for this order
    const existingPayments = await this.paymentRepository.findByOrderId(
      dto.orderId,
    )
    const hasSuccessfulPayment = existingPayments.some(
      (p) => p.status === 'succeeded',
    )

    if (hasSuccessfulPayment) {
      throw new Error(
        `Order '${dto.orderId}' already has a successful payment`,
      )
    }

    // Create payment entity
    const paymentId = uuidv4()
    const payment = Payment.create(
      paymentId,
      dto.orderId,
      dto.userId,
      dto.amount,
      dto.currency,
      dto.method,
      dto.correlationId,
    )

    // Save payment
    const savedPayment = await this.paymentRepository.save(payment)

    // Trigger payment processing asynchronously
    // This simulates calling external payment gateway
    this.processPaymentAsync(savedPayment)

    // Return immediate response
    return this.toResponseDto(savedPayment)
  }

  /**
   * Validates initiate payment DTO
   */
  private validateInput(dto: InitiatePaymentDto): void {
    if (!dto.orderId || dto.orderId.trim().length === 0) {
      throw new Error('orderId is required')
    }

    if (!dto.userId || dto.userId.trim().length === 0) {
      throw new Error('userId is required')
    }

    if (!dto.amount || dto.amount <= 0) {
      throw new Error('amount must be greater than 0')
    }

    if (!dto.currency || dto.currency.trim().length === 0) {
      throw new Error('currency is required')
    }

    if (!dto.method) {
      throw new Error('payment method is required')
    }
  }

  /**
   * Processes payment asynchronously
   * Simulates external payment gateway call
   * 
   * In production:
   * - This would call real payment gateway API
   * - Handle webhooks for async results
   * - Implement retry logic
   * - Handle idempotency
   */
  private async processPaymentAsync(payment: Payment): Promise<void> {
    try {
      // Mark as processing
      payment.markProcessing(`provider-${uuidv4()}`)
      await this.paymentRepository.save(payment)

      // Simulate payment processing
      const result = await this.paymentSimulator.processPayment({
        paymentId: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        method: payment.method,
        userId: payment.userId,
        orderId: payment.orderId,
      })

      // Update payment based on result
      if (result.success) {
        payment.markSucceeded(result.providerResponse)
        await this.paymentRepository.save(payment)

        // Publish success event
        await this.eventPublisher.publish({
          eventType: 'payment.succeeded',
          paymentId: payment.id,
          orderId: payment.orderId,
          userId: payment.userId,
          amount: payment.amount,
          currency: payment.currency,
          method: payment.method,
          providerTransactionId: payment.providerTransactionId,
          processedAt: new Date().toISOString(),
          timestamp: new Date().toISOString(),
          correlationId: payment.correlationId,
        })
      } else {
        payment.markFailed(
          result.failureReason || 'Payment processing failed',
          result.providerResponse,
        )
        await this.paymentRepository.save(payment)

        // Publish failure event
        await this.eventPublisher.publish({
          eventType: 'payment.failed',
          paymentId: payment.id,
          orderId: payment.orderId,
          userId: payment.userId,
          amount: payment.amount,
          currency: payment.currency,
          method: payment.method,
          failureReason: payment.failureReason || 'Unknown error',
          providerResponse: payment.providerResponse,
          failedAt: new Date().toISOString(),
          timestamp: new Date().toISOString(),
          correlationId: payment.correlationId,
        })
      }
    } catch (error) {
      // Handle processing error
      payment.markFailed(
        error instanceof Error ? error.message : 'Unknown error',
      )
      await this.paymentRepository.save(payment)

      // Publish failure event
      await this.eventPublisher.publish({
        eventType: 'payment.failed',
        paymentId: payment.id,
        orderId: payment.orderId,
        userId: payment.userId,
        amount: payment.amount,
        currency: payment.currency,
        method: payment.method,
        failureReason: payment.failureReason || 'Unknown error',
        failedAt: new Date().toISOString(),
        timestamp: new Date().toISOString(),
        correlationId: payment.correlationId,
      })
    }
  }

  /**
   * Converts Payment entity to response DTO
   */
  private toResponseDto(payment: Payment): PaymentResponseDto {
    return {
      id: payment.id,
      orderId: payment.orderId,
      userId: payment.userId,
      amount: payment.amount,
      currency: payment.currency,
      method: payment.method,
      status: payment.status,
      createdAt: payment.createdAt.toISOString(),
      updatedAt: payment.updatedAt.toISOString(),
      correlationId: payment.correlationId,
      providerTransactionId: payment.providerTransactionId,
      providerResponse: payment.providerResponse,
      failureReason: payment.failureReason,
      retryCount: payment.retryCount,
    }
  }
}
