import { Payment } from '@/domain/entities/payment'
import { PaymentRepository } from '@/domain/repositories/payment-repository'
import { PaymentResponseDto } from '../dtos/payment-dto'

/**
 * Get Payments by Order Use Case
 * 
 * Architecture: Clean Architecture - Application Layer
 * Retrieves all payments for a specific order
 * 
 * Use Cases:
 * - View payment history for an order
 * - Check if order has successful payment
 * - Track payment retries
 * 
 * RBAC:
 * - Users can only view payments for their own orders
 * - Admins can view payments for any order
 */
export class GetPaymentsByOrderUseCase {
  constructor(private readonly paymentRepository: PaymentRepository) {}

  async execute(
    orderId: string,
    requestingUserId: string,
    isAdmin: boolean,
  ): Promise<PaymentResponseDto[]> {
    // Validate input
    if (!orderId || orderId.trim().length === 0) {
      throw new Error('orderId is required')
    }

    if (!requestingUserId || requestingUserId.trim().length === 0) {
      throw new Error('requesting user ID is required')
    }

    // Find all payments for order
    const payments = await this.paymentRepository.findByOrderId(orderId)

    if (payments.length === 0) {
      return []
    }

    // RBAC: Check if user owns this order or is admin
    // All payments for same order have same userId
    const orderOwnerId = payments[0].userId

    if (!isAdmin && orderOwnerId !== requestingUserId) {
      // Return empty array instead of error to avoid order ID enumeration
      return []
    }

    return payments.map((payment) => this.toResponseDto(payment))
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
