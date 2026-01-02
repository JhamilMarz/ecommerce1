/**
 * Domain Layer Exports
 *
 * Central export point for domain layer components.
 * Organized by category for easy imports.
 */

// ============================================================================
// ENTITIES
// ============================================================================
export {
  Notification,
  type CreateNotificationProps,
  type NotificationProps,
  MAX_RETRY_ATTEMPTS,
} from './entities/notification'

// ============================================================================
// VALUE OBJECTS
// ============================================================================
export {
  type NotificationChannel,
  NOTIFICATION_CHANNELS,
  isValidNotificationChannel,
  getChannelDisplayName,
} from './value-objects/notification-channel'

export {
  type NotificationStatus,
  NOTIFICATION_STATUSES,
  VALID_STATUS_TRANSITIONS,
  isValidNotificationStatus,
  isValidStatusTransition,
  isTerminalStatus,
  getStatusDisplayName,
} from './value-objects/notification-status'

// ============================================================================
// REPOSITORIES
// ============================================================================
export { type NotificationRepository } from './repositories/notification-repository'
