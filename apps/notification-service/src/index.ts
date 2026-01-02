import express, { Express } from 'express'
import {
  connectDatabase,
  closeDatabase,
  NotificationModel,
  PostgresNotificationRepository,
  createIndexes,
} from './infrastructure/database'
import {
  SendNotificationUseCase,
  GetNotificationUseCase,
  RetryNotificationUseCase,
} from './application'
import {
  EmailProviderService,
  WebhookProviderService,
  NotificationProviderRegistryImpl,
} from './infrastructure/providers'
import { RabbitMQEventConsumer, EventHandlers } from './infrastructure/messaging'
import { HealthController } from './infrastructure/http/controllers/health-controller'
import { createRoutes } from './infrastructure/http/routes'
import { logger } from './infrastructure/observability/logger'

/**
 * Notification Service
 *
 * Main entry point for the notification microservice.
 *
 * Responsibilities:
 * - Consume events from RabbitMQ
 * - Send notifications via email/webhook/sms/push
 * - Track notification status
 * - Provide health and metrics endpoints
 *
 * @remarks
 * - NO public business logic endpoints
 * - Internal service triggered by events
 * - Graceful shutdown on SIGTERM/SIGINT
 */
export class NotificationService {
  private app: Express
  private server: any
  private port: number
  private eventConsumer: RabbitMQEventConsumer | null = null

  constructor() {
    this.app = express()
    this.port = parseInt(process.env.PORT || '3004', 10)
  }

  /**
   * Start the notification service
   */
  async start(): Promise<void> {
    try {
      logger.info('🚀 Starting Notification Service...')

      // 1. Initialize infrastructure
      await this.initializeInfrastructure()

      // 2. Setup Express app
      this.setupExpress()

      // 3. Start HTTP server
      await this.startHttpServer()

      // 4. Start RabbitMQ consumer
      await this.startEventConsumer()

      logger.info('✅ Notification Service started successfully')
    } catch (error) {
      logger.error('❌ Failed to start Notification Service:', error)
      throw error
    }
  }

  /**
   * Stop the notification service gracefully
   */
  async stop(): Promise<void> {
    logger.info('🛑 Stopping Notification Service...')

    try {
      // 1. Stop accepting new HTTP requests
      if (this.server) {
        await new Promise<void>((resolve, reject) => {
          this.server.close((err: Error | undefined) => {
            if (err) reject(err)
            else resolve()
          })
        })
        logger.info('✅ HTTP server closed')
      }

      // 2. Stop RabbitMQ consumer
      if (this.eventConsumer) {
        await this.eventConsumer.close()
      }

      // 3. Close database connection
      await closeDatabase()

      logger.info('✅ Notification Service stopped successfully')
    } catch (error) {
      logger.error('❌ Error stopping Notification Service:', error)
      throw error
    }
  }

  /**
   * Initialize infrastructure (database, indexes)
   */
  private async initializeInfrastructure(): Promise<void> {
    logger.info('📦 Initializing infrastructure...')

    // Connect to PostgreSQL
    await connectDatabase()

    // Sync database models
    await NotificationModel.sync({ alter: process.env.NODE_ENV === 'development' })
    logger.info('✅ Database models synced')

    // Create indexes
    await createIndexes()

    logger.info('✅ Infrastructure initialized')
  }

  /**
   * Setup Express application with middleware and routes
   */
  private setupExpress(): void {
    logger.info('⚙️  Setting up Express...')

    // Middleware
    this.app.use(express.json())
    this.app.use(express.urlencoded({ extended: true }))

    // Request logging middleware
    this.app.use((req, res, next) => {
      const start = Date.now()

      res.on('finish', () => {
        const duration = Date.now() - start
        logger.info('HTTP request', {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration,
        })
      })

      next()
    })

    // Dependency injection: Wire up components
    const notificationRepository = new PostgresNotificationRepository()

    const providerRegistry = new NotificationProviderRegistryImpl()
    providerRegistry.registerProvider('email', new EmailProviderService())
    providerRegistry.registerProvider('webhook', new WebhookProviderService())

    const sendNotificationUseCase = new SendNotificationUseCase(
      notificationRepository,
      providerRegistry
    )

    // Health controller
    const healthController = new HealthController()

    // Routes
    const routes = createRoutes(healthController)
    this.app.use(routes)

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.path} not found`,
      })
    })

    // Error handler
    this.app.use((err: Error, req: any, res: any, next: any) => {
      logger.error('Express error:', err)

      res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred',
      })
    })

    logger.info('✅ Express configured')
  }

  /**
   * Start HTTP server
   */
  private async startHttpServer(): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, () => {
        logger.info(`✅ HTTP server listening on port ${this.port}`)
        resolve()
      })
    })
  }

  /**
   * Start RabbitMQ event consumer
   */
  private async startEventConsumer(): Promise<void> {
    const rabbitmqUrl = process.env.RABBITMQ_URL

    if (!rabbitmqUrl) {
      throw new Error('RABBITMQ_URL environment variable is required')
    }

    // Dependency injection: Wire up use cases
    const notificationRepository = new PostgresNotificationRepository()
    const providerRegistry = new NotificationProviderRegistryImpl()
    providerRegistry.registerProvider('email', new EmailProviderService())
    providerRegistry.registerProvider('webhook', new WebhookProviderService())

    const sendNotificationUseCase = new SendNotificationUseCase(
      notificationRepository,
      providerRegistry
    )

    const eventHandlers = new EventHandlers(sendNotificationUseCase)

    // Create and start consumer
    this.eventConsumer = new RabbitMQEventConsumer(rabbitmqUrl, eventHandlers)
    await this.eventConsumer.connect()
    await this.eventConsumer.startConsuming()

    logger.info('✅ RabbitMQ consumer started')
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const service = new NotificationService()

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, shutting down gracefully...`)

    try {
      await service.stop()
      process.exit(0)
    } catch (error) {
      logger.error('Error during shutdown:', error)
      process.exit(1)
    }
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))

  // Handle unhandled rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection:', { reason, promise })
  })

  // Start service
  await service.start()
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    logger.error('Fatal error:', error)
    process.exit(1)
  })
}
