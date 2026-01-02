/**
 * Infrastructure Layer - Barrel Export
 * 
 * Architecture: Clean Architecture - Infrastructure Layer
 * 
 * Centralized exports for all infrastructure components
 */

// Database
export { database } from './database/database'
export { PaymentModel } from './database/schemas/payment-schema'
export { MongoPaymentRepository } from './database/repositories/mongo-payment-repository'
export { createIndexes, listIndexes } from './database/indexes'
export { seedDatabase, clearDatabase } from './database/seed'

// HTTP
export { PaymentController } from './http/controllers/payment-controller'
export { createPaymentRoutes } from './http/routes/payment-routes'
export { initiatePaymentSchema } from './http/validation/initiate-payment-schema'
export { authenticate } from './http/middleware/auth'
export { validateRequest } from './http/middleware/validation'
export { attachCorrelationId } from './http/middleware/correlation-id'
export { errorHandler } from './http/middleware/error-handler'

// Messaging
export { RabbitMQEventPublisher } from './messaging/rabbitmq-event-publisher'
export { RabbitMQEventConsumer } from './messaging/rabbitmq-event-consumer'

// Payment Simulator
export { PaymentSimulatorService } from './payment-simulator/payment-simulator-service'

// Observability
export { logger, createChildLogger, logPaymentOperation, logHttpRequest, logRabbitMQEvent, logDatabaseOperation, logError } from './observability/logger'
export { register, getMetrics, recordHttpRequest, recordPaymentOperation, recordRabbitMQMessage, recordDatabaseOperation } from './observability/metrics'
