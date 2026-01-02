/**
 * Notification Channel Type
 *
 * Defines available channels for sending notifications.
 *
 * @remarks
 * - EMAIL: Email notifications
 * - WEBHOOK: HTTP webhook callbacks
 * - SMS: SMS notifications (future implementation)
 * - PUSH: Push notifications (future implementation)
 */
export type NotificationChannel = 'email' | 'webhook' | 'sms' | 'push'

/**
 * Valid notification channels
 */
export const NOTIFICATION_CHANNELS: readonly NotificationChannel[] = [
  'email',
  'webhook',
  'sms',
  'push',
] as const

/**
 * Check if a value is a valid notification channel
 */
export function isValidNotificationChannel(value: unknown): value is NotificationChannel {
  return typeof value === 'string' && NOTIFICATION_CHANNELS.includes(value as NotificationChannel)
}

/**
 * Get human-readable name for channel
 */
export function getChannelDisplayName(channel: NotificationChannel): string {
  const names: Record<NotificationChannel, string> = {
    email: 'Email',
    webhook: 'Webhook',
    sms: 'SMS',
    push: 'Push Notification',
  }

  return names[channel]
}
