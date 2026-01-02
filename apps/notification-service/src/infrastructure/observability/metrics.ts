import { Counter, Histogram, register } from 'prom-client'

/**
 * Prometheus Metrics
 *
 * Application metrics for monitoring and alerting.
 *
 * @remarks
 * - Exposed via /metrics endpoint
 * - Compatible with Prometheus scraping
 */

// Clear default metrics
register.clear()

/**
 * Notification operations counter
 *
 * Tracks notification operations by status and channel.
 */
export const notificationOperationsTotal = new Counter({
  name: 'notification_operations_total',
  help: 'Total number of notification operations',
  labelNames: ['operation', 'status', 'channel'],
})

/**
 * Notification processing duration histogram
 *
 * Tracks time to process notifications.
 */
export const notificationProcessingDuration = new Histogram({
  name: 'notification_processing_duration_seconds',
  help: 'Notification processing duration in seconds',
  labelNames: ['operation', 'channel'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
})

/**
 * Provider operation duration histogram
 *
 * Tracks provider send duration.
 */
export const providerOperationDuration = new Histogram({
  name: 'provider_operation_duration_seconds',
  help: 'Provider operation duration in seconds',
  labelNames: ['provider', 'channel', 'success'],
  buckets: [0.5, 1, 2, 5, 10, 30],
})

/**
 * RabbitMQ messages counter
 *
 * Tracks RabbitMQ message consumption.
 */
export const rabbitmqMessagesTotal = new Counter({
  name: 'rabbitmq_messages_total',
  help: 'Total number of RabbitMQ messages',
  labelNames: ['event_type', 'status'],
})

/**
 * RabbitMQ message processing duration histogram
 *
 * Tracks message processing time.
 */
export const rabbitmqMessageProcessingDuration = new Histogram({
  name: 'rabbitmq_message_processing_duration_seconds',
  help: 'RabbitMQ message processing duration in seconds',
  labelNames: ['event_type'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
})

/**
 * Database operation duration histogram
 *
 * Tracks database query duration.
 */
export const databaseOperationDuration = new Histogram({
  name: 'database_operation_duration_seconds',
  help: 'Database operation duration in seconds',
  labelNames: ['operation'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2],
})

/**
 * Database operations counter
 *
 * Tracks database operations by type.
 */
export const databaseOperationsTotal = new Counter({
  name: 'database_operations_total',
  help: 'Total number of database operations',
  labelNames: ['operation', 'success'],
})

/**
 * Record notification operation
 */
export function recordNotificationOperation(
  operation: string,
  status: string,
  channel: string
): void {
  notificationOperationsTotal.inc({ operation, status, channel })
}

/**
 * Record provider operation
 */
export function recordProviderOperation(
  provider: string,
  channel: string,
  success: boolean,
  duration: number
): void {
  providerOperationDuration.observe({ provider, channel, success: String(success) }, duration)
}

/**
 * Record RabbitMQ message
 */
export function recordRabbitMQMessage(eventType: string, status: 'success' | 'failure'): void {
  rabbitmqMessagesTotal.inc({ event_type: eventType, status })
}

/**
 * Record RabbitMQ message processing duration
 */
export function recordRabbitMQMessageDuration(eventType: string, duration: number): void {
  rabbitmqMessageProcessingDuration.observe({ event_type: eventType }, duration)
}

/**
 * Record database operation
 */
export function recordDatabaseOperation(
  operation: string,
  success: boolean,
  duration: number
): void {
  databaseOperationsTotal.inc({ operation, success: String(success) })
  databaseOperationDuration.observe({ operation }, duration)
}

/**
 * Get all metrics
 */
export async function getMetrics(): Promise<string> {
  return register.metrics()
}
