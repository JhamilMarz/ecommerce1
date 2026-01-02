import { Counter, Histogram, Registry, collectDefaultMetrics } from 'prom-client'

/**
 * Prometheus Metrics
 * 
 * Architecture: Clean Architecture - Infrastructure Layer (Observability)
 * 
 * Tracks application metrics for monitoring and alerting
 * 
 * Metrics:
 * - HTTP request duration (histogram)
 * - HTTP request total (counter by status code)
 * - Payment operations (counter by status: succeeded, failed, cancelled)
 * - Payment amount total (counter)
 * - RabbitMQ messages (counter by direction: published, consumed)
 * - Database operations (histogram by operation type)
 * 
 * Endpoint: GET /metrics (Prometheus scrape endpoint)
 * Format: Prometheus text format
 */

/**
 * Prometheus registry
 */
export const register = new Registry()

/**
 * Collect default Node.js metrics
 * - Process CPU usage
 * - Event loop lag
 * - Memory usage
 * - GC statistics
 */
collectDefaultMetrics({ register })

/**
 * HTTP Metrics
 */
export const httpRequestDuration = new Histogram({
  name: 'payment_service_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register],
})

export const httpRequestTotal = new Counter({
  name: 'payment_service_http_request_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
})

/**
 * Payment Metrics
 */
export const paymentOperationsTotal = new Counter({
  name: 'payment_service_payment_operations_total',
  help: 'Total number of payment operations',
  labelNames: ['status', 'method'],
  registers: [register],
})

export const paymentAmountTotal = new Counter({
  name: 'payment_service_payment_amount_total',
  help: 'Total amount of payments processed',
  labelNames: ['currency', 'status'],
  registers: [register],
})

export const paymentProcessingDuration = new Histogram({
  name: 'payment_service_payment_processing_duration_seconds',
  help: 'Duration of payment processing in seconds',
  labelNames: ['method', 'status'],
  buckets: [0.5, 1, 2, 5, 10, 30],
  registers: [register],
})

/**
 * RabbitMQ Metrics
 */
export const rabbitmqMessagesTotal = new Counter({
  name: 'payment_service_rabbitmq_messages_total',
  help: 'Total number of RabbitMQ messages',
  labelNames: ['direction', 'event_type', 'status'],
  registers: [register],
})

export const rabbitmqMessageProcessingDuration = new Histogram({
  name: 'payment_service_rabbitmq_message_processing_duration_seconds',
  help: 'Duration of RabbitMQ message processing in seconds',
  labelNames: ['event_type', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2],
  registers: [register],
})

/**
 * Database Metrics
 */
export const databaseOperationDuration = new Histogram({
  name: 'payment_service_database_operation_duration_seconds',
  help: 'Duration of database operations in seconds',
  labelNames: ['operation', 'collection'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [register],
})

export const databaseOperationsTotal = new Counter({
  name: 'payment_service_database_operations_total',
  help: 'Total number of database operations',
  labelNames: ['operation', 'collection', 'status'],
  registers: [register],
})

/**
 * Helper Functions
 */

/**
 * Records HTTP request metrics
 */
export function recordHttpRequest(
  method: string,
  route: string,
  statusCode: number,
  duration: number
): void {
  httpRequestDuration.observe({ method, route, status_code: statusCode }, duration)
  httpRequestTotal.inc({ method, route, status_code: statusCode })
}

/**
 * Records payment operation metrics
 */
export function recordPaymentOperation(
  status: 'succeeded' | 'failed' | 'cancelled' | 'pending' | 'processing',
  method: string,
  amount: number,
  currency: string,
  duration?: number
): void {
  paymentOperationsTotal.inc({ status, method })
  
  if (status === 'succeeded') {
    paymentAmountTotal.inc({ currency, status }, amount)
  }
  
  if (duration !== undefined) {
    paymentProcessingDuration.observe({ method, status }, duration)
  }
}

/**
 * Records RabbitMQ message metrics
 */
export function recordRabbitMQMessage(
  direction: 'published' | 'consumed',
  eventType: string,
  status: 'success' | 'error',
  duration?: number
): void {
  rabbitmqMessagesTotal.inc({ direction, event_type: eventType, status })
  
  if (duration !== undefined) {
    rabbitmqMessageProcessingDuration.observe({ event_type: eventType, status }, duration)
  }
}

/**
 * Records database operation metrics
 */
export function recordDatabaseOperation(
  operation: 'find' | 'save' | 'update' | 'delete' | 'count',
  collection: string,
  status: 'success' | 'error',
  duration: number
): void {
  databaseOperationDuration.observe({ operation, collection }, duration)
  databaseOperationsTotal.inc({ operation, collection, status })
}

/**
 * Returns Prometheus metrics in text format
 */
export async function getMetrics(): Promise<string> {
  return register.metrics()
}
