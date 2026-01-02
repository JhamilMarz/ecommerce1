/**
 * Infrastructure Layer Exports
 *
 * Central export point for infrastructure components.
 * Organized by category for easy imports.
 */

// ============================================================================
// DATABASE
// ============================================================================
export * from './database'

// ============================================================================
// PROVIDERS
// ============================================================================
export { EmailProviderService } from './providers/email-provider-service'
export { WebhookProviderService } from './providers/webhook-provider-service'
export { NotificationProviderRegistryImpl } from './providers/notification-provider-registry'

// ============================================================================
// MESSAGING
// ============================================================================
export { RabbitMQEventConsumer } from './messaging/rabbitmq-event-consumer'
export { EventHandlers } from './messaging/event-handlers'

// ============================================================================
// HTTP
// ============================================================================
export { HealthController } from './http/controllers/health-controller'
export { createRoutes } from './http/routes'

// ============================================================================
// OBSERVABILITY
// ============================================================================
export * from './observability/logger'
export * from './observability/metrics'
