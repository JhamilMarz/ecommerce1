import { Notification } from '../../domain/entities/notification'
import { NotificationChannel } from '../../domain/value-objects/notification-channel'

/**
 * Notification provider result
 */
export interface NotificationProviderResult {
  success: boolean
  messageId?: string
  error?: string
  metadata?: Record<string, unknown>
}

/**
 * Notification Provider Interface
 *
 * Defines contract for notification delivery services.
 * Implementations handle channel-specific logic (email, SMS, webhook, push).
 *
 * @remarks
 * - Each channel (email, SMS, webhook, push) has its own provider
 * - Providers are configured in infrastructure layer
 * - Application layer depends on this interface (DIP)
 * - Enables easy testing with mocks
 * - Enables swapping providers without changing use cases
 *
 * @example
 * ```typescript
 * // Infrastructure implementations:
 * class EmailProviderService implements NotificationProvider
 * class WebhookProviderService implements NotificationProvider
 * class SmsProviderService implements NotificationProvider
 * class PushProviderService implements NotificationProvider
 * ```
 */
export interface NotificationProvider {
  /**
   * Send notification through this provider
   *
   * @param notification - Notification to send
   * @returns Result with success status and metadata
   */
  send(notification: Notification): Promise<NotificationProviderResult>

  /**
   * Check if provider is available and configured
   *
   * @returns True if provider can send notifications
   */
  isAvailable(): Promise<boolean>

  /**
   * Get provider name for logging/debugging
   *
   * @returns Provider name (e.g., 'email', 'webhook', 'sms', 'push')
   */
  getProviderName(): string

  /**
   * Get supported channel for this provider
   *
   * @returns Channel this provider handles
   */
  getSupportedChannel(): NotificationChannel
}

/**
 * Provider registry for managing multiple providers
 *
 * Maps channels to their respective providers.
 */
export interface NotificationProviderRegistry {
  /**
   * Get provider for a specific channel
   *
   * @param channel - Notification channel
   * @returns Provider for the channel
   * @throws Error if no provider registered for channel
   */
  getProvider(channel: NotificationChannel): NotificationProvider

  /**
   * Register a provider for a channel
   *
   * @param channel - Notification channel
   * @param provider - Provider implementation
   */
  registerProvider(channel: NotificationChannel, provider: NotificationProvider): void

  /**
   * Check if a channel has a registered provider
   *
   * @param channel - Notification channel
   * @returns True if provider exists for channel
   */
  hasProvider(channel: NotificationChannel): boolean

  /**
   * Get all registered channels
   *
   * @returns Array of channels with registered providers
   */
  getRegisteredChannels(): NotificationChannel[]
}
