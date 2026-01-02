import winston from 'winston'

/**
 * Logger Configuration
 * 
 * Architecture: Clean Architecture - Infrastructure Layer (Observability)
 * 
 * Winston logger with JSON structured logging
 * 
 * Features:
 * - JSON format for machine parsing
 * - Correlation ID tracking (x-correlation-id)
 * - Log levels: error, warn, info, debug
 * - Console output with colorization (development)
 * - File output: error.log, combined.log (production)
 * - Timestamp in ISO8601 format
 * 
 * Usage:
 * ```typescript
 * logger.info('Payment initiated', { paymentId, orderId, amount })
 * logger.error('Payment failed', { paymentId, error: error.message })
 * ```
 */

const logLevel = process.env.LOG_LEVEL || 'info'
const nodeEnv = process.env.NODE_ENV || 'development'

/**
 * Custom format for structured JSON logging
 */
const jsonFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
)

/**
 * Human-readable format for development
 */
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`
    
    // Add metadata if present
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`
    }
    
    return msg
  })
)

/**
 * Winston logger instance
 */
export const logger = winston.createLogger({
  level: logLevel,
  format: jsonFormat,
  defaultMeta: {
    service: 'payment-service',
    environment: nodeEnv,
  },
  transports: [
    // Console transport (always enabled)
    new winston.transports.Console({
      format: nodeEnv === 'production' ? jsonFormat : consoleFormat,
    }),

    // File transports (production only)
    ...(nodeEnv === 'production'
      ? [
          // Error logs
          new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
          }),

          // Combined logs
          new winston.transports.File({
            filename: 'logs/combined.log',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
          }),
        ]
      : []),
  ],
})

/**
 * Creates child logger with correlation ID
 * 
 * Usage in request context:
 * ```typescript
 * const requestLogger = logger.child({ correlationId: req.headers['x-correlation-id'] })
 * requestLogger.info('Processing payment', { paymentId })
 * ```
 */
export function createChildLogger(correlationId: string): winston.Logger {
  return logger.child({ correlationId })
}

/**
 * Log payment operation
 */
export function logPaymentOperation(
  level: 'info' | 'error' | 'warn',
  message: string,
  metadata: Record<string, unknown>
): void {
  logger.log(level, message, {
    ...metadata,
    timestamp: new Date().toISOString(),
  })
}

/**
 * Log HTTP request
 */
export function logHttpRequest(
  method: string,
  path: string,
  statusCode: number,
  duration: number,
  correlationId?: string
): void {
  logger.info('HTTP Request', {
    method,
    path,
    statusCode,
    duration,
    correlationId,
  })
}

/**
 * Log RabbitMQ event
 */
export function logRabbitMQEvent(
  direction: 'published' | 'consumed',
  eventType: string,
  metadata: Record<string, unknown>
): void {
  logger.info(`RabbitMQ Event ${direction}`, {
    eventType,
    ...metadata,
  })
}

/**
 * Log database operation
 */
export function logDatabaseOperation(
  operation: string,
  collection: string,
  duration: number,
  metadata?: Record<string, unknown>
): void {
  logger.debug('Database Operation', {
    operation,
    collection,
    duration,
    ...metadata,
  })
}

/**
 * Log error with stack trace
 */
export function logError(error: Error, context?: Record<string, unknown>): void {
  logger.error('Error occurred', {
    message: error.message,
    stack: error.stack,
    ...context,
  })
}
