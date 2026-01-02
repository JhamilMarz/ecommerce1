import { PaymentStatus, isValidTransition } from './payment-status'
import { PaymentMethod } from './payment-method'

/**
 * Payment Entity - Aggregate Root
 * 
 * Architecture: Clean Architecture - Domain Layer
 * Represents a payment attempt in the system
 * 
 * Business Rules:
 * - Payment must have valid amount (> 0)
 * - Status transitions must follow state machine
 * - orderId and userId are immutable
 * - Cannot modify succeeded/failed/cancelled payments
 * - Amount cannot be changed after creation
 */
export class Payment {
  constructor(
    public readonly id: string,
    public readonly orderId: string,
    public readonly userId: string,
    public readonly amount: number,
    public readonly currency: string,
    public readonly method: PaymentMethod,
    public status: PaymentStatus,
    public readonly createdAt: Date,
    public updatedAt: Date,
    public readonly correlationId?: string,
    public providerTransactionId?: string,
    public providerResponse?: Record<string, unknown>,
    public failureReason?: string,
    public retryCount: number = 0,
  ) {
    this.validate()
  }

  /**
   * Validates payment invariants
   * Throws if any business rule is violated
   */
  private validate(): void {
    if (!this.id || this.id.trim().length === 0) {
      throw new Error('Payment: id is required')
    }

    if (!this.orderId || this.orderId.trim().length === 0) {
      throw new Error('Payment: orderId is required')
    }

    if (!this.userId || this.userId.trim().length === 0) {
      throw new Error('Payment: userId is required')
    }

    if (this.amount <= 0) {
      throw new Error('Payment: amount must be greater than 0')
    }

    if (!this.currency || this.currency.trim().length === 0) {
      throw new Error('Payment: currency is required')
    }

    if (!Object.values(PaymentMethod).includes(this.method)) {
      throw new Error(`Payment: invalid payment method '${this.method}'`)
    }

    if (!Object.values(PaymentStatus).includes(this.status)) {
      throw new Error(`Payment: invalid status '${this.status}'`)
    }
  }

  /**
   * Changes payment status
   * Validates state machine transition
   * 
   * @throws Error if transition is invalid
   */
  changeStatus(newStatus: PaymentStatus): Payment {
    if (!isValidTransition(this.status, newStatus)) {
      throw new Error(
        `Payment: cannot transition from '${this.status}' to '${newStatus}'`,
      )
    }

    this.status = newStatus
    this.updatedAt = new Date()
    return this
  }

  /**
   * Marks payment as processing
   * Sets provider transaction ID
   */
  markProcessing(providerTransactionId: string): Payment {
    this.changeStatus(PaymentStatus.PROCESSING)
    this.providerTransactionId = providerTransactionId
    return this
  }

  /**
   * Marks payment as succeeded
   * Records provider response
   */
  markSucceeded(providerResponse?: Record<string, unknown>): Payment {
    this.changeStatus(PaymentStatus.SUCCEEDED)
    this.providerResponse = providerResponse
    return this
  }

  /**
   * Marks payment as failed
   * Records failure reason and provider response
   */
  markFailed(
    failureReason: string,
    providerResponse?: Record<string, unknown>,
  ): Payment {
    this.changeStatus(PaymentStatus.FAILED)
    this.failureReason = failureReason
    this.providerResponse = providerResponse
    return this
  }

  /**
   * Marks payment as cancelled
   * Admin action or order cancellation
   */
  cancel(reason?: string): Payment {
    this.changeStatus(PaymentStatus.CANCELLED)
    this.failureReason = reason || 'Payment cancelled'
    return this
  }

  /**
   * Increments retry counter
   * Used for tracking payment retry attempts
   */
  incrementRetry(): Payment {
    this.retryCount += 1
    this.updatedAt = new Date()
    return this
  }

  /**
   * Checks if payment can be modified
   * Terminal states (succeeded, failed, cancelled) cannot be modified
   */
  canBeModified(): boolean {
    return ![
      PaymentStatus.SUCCEEDED,
      PaymentStatus.FAILED,
      PaymentStatus.CANCELLED,
    ].includes(this.status)
  }

  /**
   * Checks if payment can be retried
   * Only failed payments can be retried
   */
  canBeRetried(): boolean {
    return this.status === PaymentStatus.FAILED
  }

  /**
   * Checks if payment is in terminal state
   */
  isTerminal(): boolean {
    return [
      PaymentStatus.SUCCEEDED,
      PaymentStatus.FAILED,
      PaymentStatus.CANCELLED,
    ].includes(this.status)
  }

  /**
   * Factory method to create new payment
   */
  static create(
    id: string,
    orderId: string,
    userId: string,
    amount: number,
    currency: string,
    method: PaymentMethod,
    correlationId?: string,
  ): Payment {
    return new Payment(
      id,
      orderId,
      userId,
      amount,
      currency,
      method,
      PaymentStatus.PENDING,
      new Date(),
      new Date(),
      correlationId,
      undefined,
      undefined,
      undefined,
      0,
    )
  }
}
