import { Notification } from '../entities/notification'
import { NotificationStatus } from '../value-objects/notification-status'

/**
 * Notification Repository Interface
 *
 * Defines contract for notification persistence operations.
 * Implementations handle database-specific logic.
 *
 * @remarks
 * - NO implementation details here (pure interface)
 * - Follows Repository pattern from Clean Architecture
 * - Enables dependency inversion (domain doesn't depend on infrastructure)
 */
export interface NotificationRepository {
  /**
   * Save a new notification
   *
   * @param notification - Notification to save
   * @returns Saved notification
   */
  save(notification: Notification): Promise<Notification>

  /**
   * Update an existing notification
   *
   * @param notification - Notification to update
   * @returns Updated notification
   */
  update(notification: Notification): Promise<Notification>

  /**
   * Find notification by ID
   *
   * @param id - Notification ID
   * @returns Notification if found, null otherwise
   */
  findById(id: string): Promise<Notification | null>

  /**
   * Find notifications by correlation ID
   *
   * Enables idempotency checks and related notification queries.
   *
   * @param correlationId - Correlation ID
   * @returns Array of notifications with same correlation ID
   */
  findByCorrelationId(correlationId: string): Promise<Notification[]>

  /**
   * Find notifications by event type
   *
   * @param eventType - Event type (e.g., 'user.created', 'order.paid')
   * @param limit - Maximum number of results
   * @returns Array of notifications
   */
  findByEventType(eventType: string, limit?: number): Promise<Notification[]>

  /**
   * Find notifications by status
   *
   * Useful for retry jobs and monitoring.
   *
   * @param status - Notification status
   * @param limit - Maximum number of results
   * @returns Array of notifications with given status
   */
  findByStatus(status: NotificationStatus, limit?: number): Promise<Notification[]>

  /**
   * Find notifications by recipient ID
   *
   * @param recipientId - Recipient ID
   * @param limit - Maximum number of results
   * @returns Array of notifications for recipient
   */
  findByRecipientId(recipientId: string, limit?: number): Promise<Notification[]>

  /**
   * Find failed notifications eligible for retry
   *
   * Queries notifications with status 'failed' and retries < max.
   *
   * @param limit - Maximum number of results
   * @returns Array of notifications that can be retried
   */
  findRetryable(limit?: number): Promise<Notification[]>

  /**
   * Count notifications by status
   *
   * @param status - Notification status
   * @returns Count of notifications
   */
  countByStatus(status: NotificationStatus): Promise<number>

  /**
   * Delete notification by ID
   *
   * @param id - Notification ID
   * @returns True if deleted, false if not found
   */
  deleteById(id: string): Promise<boolean>
}
