import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import { database } from './infrastructure/database';
import { createIndexes } from './infrastructure/database/indexes';
import { MongoOrderRepository } from './infrastructure/database/repositories/mongo-order-repository';
import { MongoOrderHistoryRepository } from './infrastructure/database/repositories/mongo-order-history-repository';
import {
  CreateOrderUseCase,
  GetOrderUseCase,
  ListUserOrdersUseCase,
  UpdateOrderStatusUseCase,
  GetOrderHistoryUseCase,
} from './application/use-cases';
import { OrderController } from './infrastructure/http/controllers/order-controller';
import { createOrderRoutes } from './infrastructure/http/routes/order-routes';
import { correlationId } from './infrastructure/http/middleware/correlation-id';
import { errorHandler } from './infrastructure/http/middleware/error-handler';
import {
  createMetricsRouter,
  metricsMiddleware,
} from './infrastructure/observability/metrics';
import { RabbitMQEventPublisher } from './infrastructure/messaging/rabbitmq-event-publisher';
import { RabbitMQEventConsumer } from './infrastructure/messaging/rabbitmq-event-consumer';
import { logger } from './infrastructure/observability/logger';

// Load environment variables
dotenv.config();

/**
 * Order Service - Main Entry Point
 * 
 * Architecture: Clean Architecture
 * - Domain Layer (entities, repositories interfaces)
 * - Application Layer (use cases, DTOs)
 * - Infrastructure Layer (database, HTTP, messaging, observability)
 * 
 * Features:
 * - MongoDB with Mongoose
 * - RabbitMQ publisher & consumer
 * - JWT authentication + RBAC
 * - Prometheus metrics
 * - Winston logging
 * - Graceful shutdown
 */
class OrderService {
  private app: Application;
  private eventPublisher: RabbitMQEventPublisher;
  private eventConsumer: RabbitMQEventConsumer;
  private orderRepository: MongoOrderRepository;
  private historyRepository: MongoOrderHistoryRepository;

  constructor() {
    this.app = express();
    this.orderRepository = new MongoOrderRepository();
    this.historyRepository = new MongoOrderHistoryRepository();

    // Initialize RabbitMQ
    this.eventPublisher = new RabbitMQEventPublisher(
      process.env.RABBITMQ_URL || 'amqp://localhost:5672',
      process.env.RABBITMQ_EXCHANGE || 'ecommerce.events',
      process.env.RABBITMQ_EXCHANGE_TYPE || 'topic',
    );

    this.eventConsumer = new RabbitMQEventConsumer(
      this.orderRepository,
      this.historyRepository,
      process.env.RABBITMQ_URL || 'amqp://localhost:5672',
      process.env.RABBITMQ_EXCHANGE || 'ecommerce.events',
      process.env.RABBITMQ_QUEUE_PAYMENT_EVENTS || 'order.payment-events',
      process.env.RABBITMQ_DLQ || 'order.payment-events.dlq',
      parseInt(process.env.RABBITMQ_MAX_RETRIES || '3', 10),
    );
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    // Security
    this.app.use(helmet());

    // CORS
    this.app.use(
      cors({
        origin: process.env.CORS_ORIGIN || '*',
        credentials: true,
      }),
    );

    // Body parser
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Correlation ID (distributed tracing)
    this.app.use(correlationId);

    // Metrics middleware
    this.app.use(metricsMiddleware());
  }

  /**
   * Setup routes
   */
  private setupRoutes(): void {
    // Use cases (dependency injection)
    const createOrderUseCase = new CreateOrderUseCase(
      this.orderRepository,
      this.historyRepository,
      this.eventPublisher,
    );

    const getOrderUseCase = new GetOrderUseCase(this.orderRepository);

    const listUserOrdersUseCase = new ListUserOrdersUseCase(
      this.orderRepository,
    );

    const updateOrderStatusUseCase = new UpdateOrderStatusUseCase(
      this.orderRepository,
      this.historyRepository,
      this.eventPublisher,
    );

    const getOrderHistoryUseCase = new GetOrderHistoryUseCase(
      this.historyRepository,
    );

    // Controller
    const orderController = new OrderController(
      createOrderUseCase,
      getOrderUseCase,
      listUserOrdersUseCase,
      updateOrderStatusUseCase,
      getOrderHistoryUseCase,
    );

    // Health check
    this.app.get('/health', orderController.healthCheck);

    // Metrics endpoint
    this.app.use('/metrics', createMetricsRouter());

    // Order routes
    this.app.use('/orders', createOrderRoutes(orderController));

    // Error handler (must be last)
    this.app.use(errorHandler);
  }

  /**
   * Start the service
   */
  async start(): Promise<void> {
    try {
      const port = parseInt(process.env.PORT || '3003', 10);

      logger.info('Starting Order Service...', {
        nodeEnv: process.env.NODE_ENV,
        port,
      });

      // Connect to MongoDB
      await database.connect();
      logger.info('MongoDB connected');

      // Create indexes
      await createIndexes();
      logger.info('Database indexes created');

      // Connect RabbitMQ publisher
      await this.eventPublisher.connect();
      logger.info('RabbitMQ publisher connected');

      // Connect RabbitMQ consumer
      await this.eventConsumer.connect();
      logger.info('RabbitMQ consumer connected');

      // Setup middleware and routes
      this.setupMiddleware();
      this.setupRoutes();

      // Start HTTP server
      this.app.listen(port, () => {
        logger.info('Order Service started successfully', {
          port,
          environment: process.env.NODE_ENV || 'development',
        });
      });

      // Setup graceful shutdown
      this.setupGracefulShutdown();
    } catch (error) {
      logger.error('Failed to start Order Service', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      process.exit(1);
    }
  }

  /**
   * Setup graceful shutdown
   */
  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string): Promise<void> => {
      logger.info(`Received ${signal}, starting graceful shutdown...`);

      try {
        // Close RabbitMQ connections
        await this.eventConsumer.close();
        logger.info('RabbitMQ consumer closed');

        await this.eventPublisher.close();
        logger.info('RabbitMQ publisher closed');

        // Close database connection
        await database.disconnect();
        logger.info('Database disconnected');

        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during graceful shutdown', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        process.exit(1);
      }
    };

    // Listen for termination signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', {
        error: error.message,
        stack: error.stack,
      });
      shutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled rejection', {
        reason: reason instanceof Error ? reason.message : reason,
      });
      shutdown('unhandledRejection');
    });
  }
}

// Start the service
const service = new OrderService();
service.start();
