import { Notification } from '../../domain/entities/notification'
import { NotificationRepository } from '../../domain/repositories/notification-repository'

/**
 * Get Notification Use Case
 *
 * Retrieves notification(s) by various criteria.
 *
 * Responsibilities:
 * - Find notification by ID
 * - Find notifications by correlation ID
 * - Handle not found scenarios
 *
 * @remarks
 * - Read-only operation
 * - Simple pass-through to repository
 * - Can be extended with business logic if needed
 */
export class GetNotificationUseCase {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  /**
   * Get notification by ID
   *
   * @param id - Notification ID
   * @returns Notification if found
   * @throws Error if notification not found
   */
  async getById(id: string): Promise<Notification> {
    const notification = await this.notificationRepository.findById(id)

    if (!notification) {
      throw new Error(`Notification with ID ${id} not found`)
    }

    return notification
  }

  /**
   * Get notifications by correlation ID
   *
   * Useful for tracking all notifications related to a specific event/transaction.
   *
   * @param correlationId - Correlation ID
   * @returns Array of notifications (may be empty)
   */
  async getByCorrelationId(correlationId: string): Promise<Notification[]> {
    return this.notificationRepository.findByCorrelationId(correlationId)
  }

  /**
   * Get notifications by event type
   *
   * @param eventType - Event type (e.g., 'user.created', 'order.paid')
   * @param limit - Maximum number of results (default: 50)
   * @returns Array of notifications (may be empty)
   */
  async getByEventType(eventType: string, limit: number = 50): Promise<Notification[]> {
    return this.notificationRepository.findByEventType(eventType, limit)
  }

  /**
   * Get notifications by recipient ID
   *
   * @param recipientId - Recipient ID
   * @param limit - Maximum number of results (default: 50)
   * @returns Array of notifications for recipient
   */
  async getByRecipientId(recipientId: string, limit: number = 50): Promise<Notification[]> {
    return this.notificationRepository.findByRecipientId(recipientId, limit)
  }
}
