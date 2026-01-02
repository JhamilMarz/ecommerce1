/**
 * Notification Status Type
 *
 * Defines the lifecycle states of a notification.
 *
 * State machine:
 * - pending → sent (success)
 * - pending → failed (error)
 * - failed → retrying (retry attempt)
 * - retrying → sent (retry success)
 * - retrying → failed (retry failed)
 */
export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'retrying'

/**
 * Valid notification statuses
 */
export const NOTIFICATION_STATUSES: readonly NotificationStatus[] = [
  'pending',
  'sent',
  'failed',
  'retrying',
] as const

/**
 * Valid status transitions
 *
 * Enforces business rules for state changes
 */
export const VALID_STATUS_TRANSITIONS: Record<NotificationStatus, NotificationStatus[]> = {
  pending: ['sent', 'failed', 'retrying'],
  sent: [], // Terminal state
  failed: ['retrying'], // Can retry
  retrying: ['sent', 'failed'],
}

/**
 * Check if a value is a valid notification status
 */
export function isValidNotificationStatus(value: unknown): value is NotificationStatus {
  return (
    typeof value === 'string' && NOTIFICATION_STATUSES.includes(value as NotificationStatus)
  )
}

/**
 * Check if a status transition is valid
 */
export function isValidStatusTransition(
  from: NotificationStatus,
  to: NotificationStatus
): boolean {
  return VALID_STATUS_TRANSITIONS[from].includes(to)
}

/**
 * Check if status is terminal (no further changes allowed)
 */
export function isTerminalStatus(status: NotificationStatus): boolean {
  return VALID_STATUS_TRANSITIONS[status].length === 0
}

/**
 * Get human-readable name for status
 */
export function getStatusDisplayName(status: NotificationStatus): string {
  const names: Record<NotificationStatus, string> = {
    pending: 'Pending',
    sent: 'Sent',
    failed: 'Failed',
    retrying: 'Retrying',
  }

  return names[status]
}
