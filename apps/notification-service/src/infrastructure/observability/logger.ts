import winston from 'winston'

/**
 * Winston Logger Configuration
 *
 * Structured JSON logging for production and development.
 *
 * @remarks
 * - JSON format for log aggregation
 * - Console transport (always)
 * - File transport (production only)
 * - Log level from environment variable
 */

const logLevel = process.env.LOG_LEVEL || 'info'

export const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'notification-service' },
  transports: [
    // Console transport (always)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
          return `${timestamp} [${level}]: ${message} ${metaStr}`
        })
      ),
    }),

    // File transport (production only)
    ...(process.env.NODE_ENV === 'production'
      ? [
          new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            format: winston.format.json(),
          }),
          new winston.transports.File({
            filename: 'logs/combined.log',
            format: winston.format.json(),
          }),
        ]
      : []),
  ],
})

/**
 * Create child logger with correlation ID
 */
export function createChildLogger(correlationId: string): winston.Logger {
  return logger.child({ correlationId })
}

/**
 * Log notification operation
 */
export function logNotificationOperation(
  operation: string,
  notificationId: string,
  status: string,
  metadata?: Record<string, unknown>
): void {
  logger.info('Notification operation', {
    operation,
    notificationId,
    status,
    ...metadata,
  })
}

/**
 * Log RabbitMQ event
 */
export function logRabbitMQEvent(
  eventType: string,
  action: 'received' | 'processed' | 'failed',
  metadata?: Record<string, unknown>
): void {
  const level = action === 'failed' ? 'error' : 'info'

  logger.log(level, 'RabbitMQ event', {
    eventType,
    action,
    ...metadata,
  })
}

/**
 * Log provider operation
 */
export function logProviderOperation(
  provider: string,
  channel: string,
  success: boolean,
  duration: number,
  metadata?: Record<string, unknown>
): void {
  logger.info('Provider operation', {
    provider,
    channel,
    success,
    duration,
    ...metadata,
  })
}

/**
 * Log database operation
 */
export function logDatabaseOperation(
  operation: string,
  duration: number,
  success: boolean,
  metadata?: Record<string, unknown>
): void {
  logger.info('Database operation', {
    operation,
    duration,
    success,
    ...metadata,
  })
}

/**
 * Log error with full context
 */
export function logError(
  error: Error,
  context: string,
  metadata?: Record<string, unknown>
): void {
  logger.error('Error occurred', {
    context,
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
    },
    ...metadata,
  })
}
