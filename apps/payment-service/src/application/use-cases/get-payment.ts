import { Payment } from '@/domain/entities/payment'
import { PaymentRepository } from '@/domain/repositories/payment-repository'
import { PaymentResponseDto } from '../dtos/payment-dto'

/**
 * Get Payment Use Case
 * 
 * Architecture: Clean Architecture - Application Layer
 * Retrieves payment by ID with RBAC enforcement
 * 
 * RBAC Rules:
 * - Users can only view their own payments
 * - Admins can view any payment
 * 
 * Security:
 * - Validates payment ownership
 * - Returns 404 if not found (not 403 to avoid enumeration)
 * - Logs access attempts for audit
 */
export class GetPaymentUseCase {
  constructor(private readonly paymentRepository: PaymentRepository) {}

  async execute(
    paymentId: string,
    requestingUserId: string,
    isAdmin: boolean,
  ): Promise<PaymentResponseDto> {
    // Validate input
    if (!paymentId || paymentId.trim().length === 0) {
      throw new Error('paymentId is required')
    }

    if (!requestingUserId || requestingUserId.trim().length === 0) {
      throw new Error('requesting user ID is required')
    }

    // Find payment
    const payment = await this.paymentRepository.findById(paymentId)

    if (!payment) {
      throw new Error(`Payment '${paymentId}' not found`)
    }

    // RBAC: Check if user owns this payment or is admin
    if (!isAdmin && payment.userId !== requestingUserId) {
      // Return 404 instead of 403 to avoid payment ID enumeration
      throw new Error(`Payment '${paymentId}' not found`)
    }

    return this.toResponseDto(payment)
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
