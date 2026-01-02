/**
 * Payment Status Enum
 * 
 * Architecture: Clean Architecture - Domain Layer
 * Represents all possible states of a payment in the system
 * 
 * State Machine:
 * pending → processing → succeeded | failed
 * any state → cancelled (admin action)
 */
export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * Valid state transitions for payment status
 * Enforces business rules at domain level
 */
const VALID_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  [PaymentStatus.PENDING]: [PaymentStatus.PROCESSING, PaymentStatus.CANCELLED],
  [PaymentStatus.PROCESSING]: [
    PaymentStatus.SUCCEEDED,
    PaymentStatus.FAILED,
    PaymentStatus.CANCELLED,
  ],
  [PaymentStatus.SUCCEEDED]: [], // Terminal state
  [PaymentStatus.FAILED]: [PaymentStatus.PENDING], // Allow retry
  [PaymentStatus.CANCELLED]: [], // Terminal state
}

/**
 * Validates if a status transition is allowed
 * 
 * @param currentStatus - Current payment status
 * @param newStatus - Desired new status
 * @returns true if transition is valid, false otherwise
 * 
 * @example
 * ```typescript
 * isValidTransition(PaymentStatus.PENDING, PaymentStatus.PROCESSING) // true
 * isValidTransition(PaymentStatus.SUCCEEDED, PaymentStatus.FAILED) // false
 * ```
 */
export function isValidTransition(
  currentStatus: PaymentStatus,
  newStatus: PaymentStatus,
): boolean {
  return VALID_TRANSITIONS[currentStatus]?.includes(newStatus) ?? false
}

/**
 * Gets all valid next states for a given status
 * 
 * @param currentStatus - Current payment status
 * @returns Array of valid next statuses
 */
export function getValidNextStates(
  currentStatus: PaymentStatus,
): PaymentStatus[] {
  return VALID_TRANSITIONS[currentStatus] || []
}
