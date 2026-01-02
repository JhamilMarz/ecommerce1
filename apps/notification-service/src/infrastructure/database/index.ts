/**
 * Infrastructure Database Layer Exports
 *
 * Central export point for database components.
 * Organized by category for easy imports.
 */

// ============================================================================
// DATABASE CONNECTION
// ============================================================================
export {
  sequelize,
  connectDatabase,
  closeDatabase,
  isDatabaseHealthy,
  getConnectionStatus,
} from './database'

// ============================================================================
// MODELS
// ============================================================================
export {
  NotificationModel,
  type NotificationModelAttributes,
  type NotificationCreationAttributes,
} from './models/notification-model'

// ============================================================================
// REPOSITORIES
// ============================================================================
export { PostgresNotificationRepository } from './repositories/postgres-notification-repository'

// ============================================================================
// INDEXES
// ============================================================================
export { createIndexes, dropIndexes, showIndexStats } from './indexes'

// ============================================================================
// SEED DATA
// ============================================================================
export { seedNotifications, clearNotifications } from './seed'
