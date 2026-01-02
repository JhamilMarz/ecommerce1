import { Notification, CreateNotificationProps } from '../../domain/entities/notification'
import { NotificationRepository } from '../../domain/repositories/notification-repository'
import { NotificationProviderRegistry } from '../services/notification-provider'

/**
 * Send Notification Use Case
 *
 * Handles the business logic for creating and sending notifications.
 *
 * Responsibilities:
 * - Validate notification data
 * - Check for duplicate notifications (idempotency)
 * - Create notification entity
 * - Select appropriate provider by channel
 * - Send notification through provider
 * - Update notification status based on result
 * - Persist notification
 *
 * @remarks
 * - Implements Single Responsibility Principle
 * - Depends on abstractions (NotificationRepository, NotificationProviderRegistry)
 * - Handles errors gracefully without throwing to caller
 */
export class SendNotificationUseCase {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly providerRegistry: NotificationProviderRegistry
  ) {}

  /**
   * Execute use case: create and send notification
   *
   * @param props - Notification creation data
   * @returns Created notification with status
   *
   * @remarks
   * Idempotency: If correlationId exists and has successful notification, returns existing.
   * Error handling: If sending fails, notification is saved with 'failed' status.
   */
  async execute(props: CreateNotificationProps): Promise<Notification> {
    // Check for duplicate notification (idempotency)
    if (props.correlationId) {
      const existingNotifications = await this.notificationRepository.findByCorrelationId(
        props.correlationId
      )

      const successfulNotification = existingNotifications.find(
        (n) => n.status === 'sent' && n.eventType === props.eventType && n.channel === props.channel
      )

      if (successfulNotification) {
        return successfulNotification
      }
    }

    // Create notification entity
    const notification = Notification.create(props)

    // Save notification in pending state
    const savedNotification = await this.notificationRepository.save(notification)

    // Send notification asynchronously
    await this.sendNotificationAsync(savedNotification)

    return savedNotification
  }

  /**
   * Send notification through appropriate provider
   *
   * @param notification - Notification to send
   *
   * @remarks
   * Handles provider selection, sending, and status updates.
   * Errors are caught and logged, notification marked as failed.
   */
  private async sendNotificationAsync(notification: Notification): Promise<void> {
    try {
      // Check if provider exists for channel
      if (!this.providerRegistry.hasProvider(notification.channel)) {
        throw new Error(`No provider registered for channel: ${notification.channel}`)
      }

      // Get provider for channel
      const provider = this.providerRegistry.getProvider(notification.channel)

      // Check if provider is available
      const isAvailable = await provider.isAvailable()
      if (!isAvailable) {
        throw new Error(`Provider ${provider.getProviderName()} is not available`)
      }

      // Send notification through provider
      const result = await provider.send(notification)

      if (result.success) {
        // Mark notification as sent
        notification.markSent({
          messageId: result.messageId,
          provider: provider.getProviderName(),
          ...result.metadata,
        })
      } else {
        // Mark notification as failed
        notification.markFailed(result.error || 'Unknown error from provider')
      }
    } catch (error) {
      // Handle unexpected errors
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      notification.markFailed(errorMessage)
    } finally {
      // Always update notification in database
      await this.notificationRepository.update(notification)
    }
  }
}
