import express, { Express, Request, Response } from 'express'
import { Server } from 'http'
import { database } from './infrastructure/database/database'
import { createIndexes } from './infrastructure/database/indexes'
import { MongoPaymentRepository } from './infrastructure/database/repositories/mongo-payment-repository'
import { RabbitMQEventPublisher } from './infrastructure/messaging/rabbitmq-event-publisher'
import { RabbitMQEventConsumer } from './infrastructure/messaging/rabbitmq-event-consumer'
import { PaymentSimulatorService } from './infrastructure/payment-simulator/payment-simulator-service'
import { InitiatePaymentUseCase } from './application/use-cases/initiate-payment'
import { GetPaymentUseCase } from './application/use-cases/get-payment'
import { GetPaymentsByOrderUseCase } from './application/use-cases/get-payments-by-order'
import { PaymentController } from './infrastructure/http/controllers/payment-controller'
import { createPaymentRoutes } from './infrastructure/http/routes/payment-routes'
import { attachCorrelationId } from './infrastructure/http/middleware/correlation-id'
import { errorHandler } from './infrastructure/http/middleware/error-handler'
import { logger } from './infrastructure/observability/logger'
import { getMetrics } from './infrastructure/observability/metrics'

/**
 * Payment Service
 * 
 * Architecture: Clean Architecture
 * 
 * Main entry point for payment-service microservice
 * 
 * Responsibilities:
 * - Initialize infrastructure (MongoDB, RabbitMQ)
 * - Wire up dependencies (use cases, repositories, controllers)
 * - Start HTTP server
 * - Start RabbitMQ consumer
 * - Handle graceful shutdown
 * 
 * Environment Variables:
 * - PORT: HTTP port (default 3003)
 * - MONGODB_URI: MongoDB connection string
 * - RABBITMQ_URL: RabbitMQ connection string
 * - JWT_SECRET: JWT secret for authentication
 * - NODE_ENV: development | production
 */

export class PaymentService {
  private app: Express
  private server: Server | null = null
  private eventPublisher: RabbitMQEventPublisher | null = null
  private eventConsumer: RabbitMQEventConsumer | null = null
  private readonly port: number

  constructor() {
    this.port = parseInt(process.env.PORT || '3003', 10)
    this.app = express()
  }

  /**
   * Initializes service
   */
  async start(): Promise<void> {
    try {
      logger.info('Payment Service: Starting...', {
        port: this.port,
        environment: process.env.NODE_ENV,
      })

      // Initialize infrastructure
      await this.initializeInfrastructure()

      // Setup Express app
      this.setupExpress()

      // Start HTTP server
      await this.startHttpServer()

      // Start RabbitMQ consumer
      await this.startEventConsumer()

      logger.info('Payment Service: Started successfully', {
        port: this.port,
      })
    } catch (error) {
      logger.error('Payment Service: Failed to start', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  }

  /**
   * Initializes infrastructure (MongoDB, RabbitMQ)
   */
  private async initializeInfrastructure(): Promise<void> {
    logger.info('Payment Service: Initializing infrastructure...')

    // MongoDB
    const mongoUri = process.env.MONGODB_URI
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is required')
    }

    await database.connect()
    await createIndexes()

    logger.info('Payment Service: MongoDB connected')

    // RabbitMQ Publisher
    const rabbitmqUrl = process.env.RABBITMQ_URL
    if (!rabbitmqUrl) {
      throw new Error('RABBITMQ_URL environment variable is required')
    }

    this.eventPublisher = new RabbitMQEventPublisher(rabbitmqUrl)
    await this.eventPublisher.connect()

    logger.info('Payment Service: RabbitMQ Publisher connected')

    // RabbitMQ Consumer (will be started after HTTP server)
    const paymentRepository = new MongoPaymentRepository()
    const paymentSimulator = new PaymentSimulatorService()

    const initiatePaymentUseCase = new InitiatePaymentUseCase(
      paymentRepository,
      this.eventPublisher,
      paymentSimulator
    )

    const getPaymentsByOrderUseCase = new GetPaymentsByOrderUseCase(
      paymentRepository
    )

    this.eventConsumer = new RabbitMQEventConsumer(
      rabbitmqUrl,
      initiatePaymentUseCase,
      getPaymentsByOrderUseCase,
      paymentRepository
    )

    await this.eventConsumer.connect()

    logger.info('Payment Service: Infrastructure initialized')
  }

  /**
   * Sets up Express app (middleware, routes)
   */
  private setupExpress(): void {
    // Middleware
    this.app.use(express.json())
    this.app.use(attachCorrelationId)

    // Wire up dependencies
    const paymentRepository = new MongoPaymentRepository()
    const paymentSimulator = new PaymentSimulatorService()

    if (!this.eventPublisher) {
      throw new Error('Event publisher not initialized')
    }

    const initiatePaymentUseCase = new InitiatePaymentUseCase(
      paymentRepository,
      this.eventPublisher,
      paymentSimulator
    )

    const getPaymentUseCase = new GetPaymentUseCase(paymentRepository)

    const getPaymentsByOrderUseCase = new GetPaymentsByOrderUseCase(
      paymentRepository
    )

    const paymentController = new PaymentController(
      initiatePaymentUseCase,
      getPaymentUseCase,
      getPaymentsByOrderUseCase
    )

    // Routes
    this.app.use('/payments', createPaymentRoutes(paymentController))

    // Metrics endpoint
    this.app.get('/metrics', async (_req: Request, res: Response) => {
      try {
        const metrics = await getMetrics()
        res.set('Content-Type', 'text/plain')
        res.send(metrics)
      } catch (error) {
        logger.error('Failed to generate metrics', {
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        res.status(500).send('Failed to generate metrics')
      }
    })

    // Health check (redundant with /payments/health, but useful for root)
    this.app.get('/health', (_req: Request, res: Response) => {
      res.json({
        status: 'ok',
        service: 'payment-service',
        timestamp: new Date().toISOString(),
      })
    })

    // Error handler (must be last)
    this.app.use(errorHandler)

    logger.info('Payment Service: Express app configured')
  }

  /**
   * Starts HTTP server
   */
  private async startHttpServer(): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, () => {
        logger.info(`Payment Service: HTTP server listening on port ${this.port}`)
        resolve()
      })
    })
  }

  /**
   * Starts RabbitMQ event consumer
   */
  private async startEventConsumer(): Promise<void> {
    if (!this.eventConsumer) {
      throw new Error('Event consumer not initialized')
    }

    await this.eventConsumer.startConsuming()
    logger.info('Payment Service: RabbitMQ Consumer started')
  }

  /**
   * Stops service gracefully
   */
  async stop(): Promise<void> {
    logger.info('Payment Service: Stopping...')

    // Stop HTTP server
    if (this.server) {
      await new Promise<void>((resolve, reject) => {
        this.server!.close((error) => {
          if (error) {
            logger.error('Failed to close HTTP server', {
              error: error.message,
            })
            reject(error)
          } else {
            logger.info('HTTP server closed')
            resolve()
          }
        })
      })
    }

    // Close RabbitMQ connections
    if (this.eventConsumer) {
      await this.eventConsumer.close()
      logger.info('RabbitMQ Consumer closed')
    }

    if (this.eventPublisher) {
      await this.eventPublisher.close()
      logger.info('RabbitMQ Publisher closed')
    }

    // Close MongoDB connection
    await database.disconnect()
    logger.info('MongoDB disconnected')

    logger.info('Payment Service: Stopped successfully')
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const service = new PaymentService()

  // Handle graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Received ${signal}, shutting down gracefully...`)

    try {
      await service.stop()
      process.exit(0)
    } catch (error) {
      logger.error('Error during shutdown', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      process.exit(1)
    }
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))

  // Handle unhandled rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Promise Rejection', {
      reason,
      promise,
    })
  })

  // Start service
  await service.start()
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    logger.error('Fatal error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    process.exit(1)
  })
}

export default PaymentService
