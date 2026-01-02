import { Notification } from '../../domain/entities/notification'
import { NotificationRepository } from '../../domain/repositories/notification-repository'
import { NotificationProviderRegistry } from '../services/notification-provider'

/**
 * Retry Notification Use Case
 *
 * Handles retry logic for failed notifications.
 *
 * Responsibilities:
 * - Validate notification can be retried
 * - Increment retry counter
 * - Mark notification as retrying
 * - Attempt to send through provider
 * - Update notification status based on result
 *
 * @remarks
 * - Enforces max retry limit (3 attempts)
 * - Only retries notifications in 'failed' status
 * - Updates status to 'sent' or 'failed' after retry
 */
export class RetryNotificationUseCase {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly providerRegistry: NotificationProviderRegistry
  ) {}

  /**
   * Retry a failed notification
   *
   * @param notificationId - ID of notification to retry
   * @returns Updated notification
   * @throws Error if notification cannot be retried
   */
  async execute(notificationId: string): Promise<Notification> {
    // Fetch notification
    const notification = await this.notificationRepository.findById(notificationId)

    if (!notification) {
      throw new Error(`Notification with ID ${notificationId} not found`)
    }

    // Validate can retry
    if (!notification.canRetry()) {
      throw new Error(
        `Notification cannot be retried. Status: ${notification.status}, Retries: ${notification.retries}/3`
      )
    }

    // Mark as retrying and increment counter
    notification.markRetrying()
    notification.incrementRetry()

    // Update notification before attempting send
    await this.notificationRepository.update(notification)

    // Attempt to send
    await this.attemptSend(notification)

    return notification
  }

  /**
   * Retry all failed notifications eligible for retry
   *
   * Useful for batch retry jobs.
   *
   * @param limit - Maximum number of notifications to retry (default: 10)
   * @returns Array of retried notifications
   */
  async retryFailedNotifications(limit: number = 10): Promise<Notification[]> {
    const failedNotifications = await this.notificationRepository.findRetryable(limit)

    const retriedNotifications: Notification[] = []

    for (const notification of failedNotifications) {
      try {
        const retried = await this.execute(notification.id)
        retriedNotifications.push(retried)
      } catch (error) {
        // Log error but continue with other notifications
        console.error(
          `Failed to retry notification ${notification.id}:`,
          error instanceof Error ? error.message : error
        )
      }
    }

    return retriedNotifications
  }

  /**
   * Attempt to send notification through provider
   *
   * @param notification - Notification to send
   *
   * @remarks
   * Updates notification status based on send result.
   * Always persists final status to database.
   */
  private async attemptSend(notification: Notification): Promise<void> {
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
          retryAttempt: notification.retries,
          ...result.metadata,
        })
      } else {
        // Mark notification as failed again
        notification.markFailed(
          result.error || `Retry ${notification.retries}/3 failed: Unknown error`
        )
      }
    } catch (error) {
      // Handle unexpected errors
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      notification.markFailed(`Retry ${notification.retries}/3 failed: ${errorMessage}`)
    } finally {
      // Always update notification in database
      await this.notificationRepository.update(notification)
    }
  }
}
