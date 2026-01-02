import { PaymentRepository } from '@/domain/repositories/payment-repository'
import { EventPublisher } from '../interfaces/event-publisher-interface'
import { PaymentCallbackDto, PaymentResponseDto } from '../dtos/payment-dto'

/**
 * Process Payment Callback Use Case
 * 
 * Architecture: Clean Architecture - Application Layer
 * Processes webhook callbacks from payment provider (simulator)
 * 
 * Flow:
 * 1. Find payment by ID
 * 2. Validate current status allows update
 * 3. Update payment status based on callback
 * 4. Publish domain event
 * 5. Return updated payment
 * 
 * Note: In production, this would:
 * - Verify webhook signature
 * - Handle idempotency (same webhook multiple times)
 * - Implement retry logic
 */
export class ProcessPaymentCallbackUseCase {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(dto: PaymentCallbackDto): Promise<PaymentResponseDto> {
    // Validate input
    this.validateInput(dto)

    // Find payment
    const payment = await this.paymentRepository.findById(dto.paymentId)

    if (!payment) {
      throw new Error(`Payment '${dto.paymentId}' not found`)
    }

    // Validate payment can be modified
    if (!payment.canBeModified()) {
      throw new Error(
        `Payment '${dto.paymentId}' is in terminal state '${payment.status}' and cannot be modified`,
      )
    }

    // Update payment based on callback status
    if (dto.status === 'success') {
      payment.markSucceeded(dto.providerResponse)
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
        providerTransactionId: dto.providerTransactionId,
        processedAt: new Date().toISOString(),
        timestamp: new Date().toISOString(),
        correlationId: payment.correlationId,
      })
    } else {
      payment.markFailed(dto.failureReason || 'Payment failed', dto.providerResponse)
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

    return this.toResponseDto(payment)
  }

  /**
   * Validates payment callback DTO
   */
  private validateInput(dto: PaymentCallbackDto): void {
    if (!dto.paymentId || dto.paymentId.trim().length === 0) {
      throw new Error('paymentId is required')
    }

    if (
      !dto.providerTransactionId ||
      dto.providerTransactionId.trim().length === 0
    ) {
      throw new Error('providerTransactionId is required')
    }

    if (!dto.status || !['success', 'failure'].includes(dto.status)) {
      throw new Error("status must be 'success' or 'failure'")
    }

    if (dto.status === 'failure' && !dto.failureReason) {
      throw new Error('failureReason is required for failed payments')
    }
  }

  /**
   * Converts Payment entity to response DTO
   */
  private toResponseDto(payment: any): PaymentResponseDto {
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
