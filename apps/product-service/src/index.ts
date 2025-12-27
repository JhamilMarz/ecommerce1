import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { config } from './infrastructure/config/config';
import { logger } from './infrastructure/logger/logger';
import { connectDatabase, disconnectDatabase } from './infrastructure/database/connection';
import { correlationIdMiddleware } from './infrastructure/http/middleware/correlation-id';
import { metricsMiddleware } from './infrastructure/http/middleware/metrics-middleware';
import { errorHandler } from './infrastructure/http/middleware/error-handler';
import { healthCheck } from './infrastructure/http/controllers/health-controller';
import { register } from './infrastructure/metrics/metrics';

// Repositories
import { PostgresProductRepository } from './infrastructure/database/repositories/postgres-product-repository';
import { PostgresCategoryRepository } from './infrastructure/database/repositories/postgres-category-repository';
import { PostgresInventoryRepository } from './infrastructure/database/repositories/postgres-inventory-repository';

// Use cases
import { CreateProductUseCase } from './application/use-cases/create-product';
import { GetProductUseCase } from './application/use-cases/get-product';
import { ListProductsUseCase } from './application/use-cases/list-products';
import { UpdateProductUseCase } from './application/use-cases/update-product';
import { DeleteProductUseCase } from './application/use-cases/delete-product';
import { CreateCategoryUseCase } from './application/use-cases/create-category';
import { ListCategoriesUseCase } from './application/use-cases/list-categories';

// Controllers
import { ProductController } from './infrastructure/http/controllers/product-controller';
import { CategoryController } from './infrastructure/http/controllers/category-controller';

// Routes
import { createProductRoutes } from './infrastructure/http/routes/product-routes';
import { createCategoryRoutes } from './infrastructure/http/routes/category-routes';

// Messaging
import { RabbitMQEventPublisher } from './infrastructure/messaging/rabbitmq-event-publisher';
import { RabbitMQEventConsumer } from './infrastructure/messaging/rabbitmq-event-consumer';

class ProductServiceApp {
  private app: Application;
  private eventPublisher: RabbitMQEventPublisher;
  private eventConsumer: RabbitMQEventConsumer;

  constructor() {
    this.app = express();
    this.eventPublisher = new RabbitMQEventPublisher();
    
    const inventoryRepository = new PostgresInventoryRepository();
    this.eventConsumer = new RabbitMQEventConsumer(inventoryRepository);
  }

  private setupMiddleware(): void {
    this.app.use(helmet());
    this.app.use(cors({ origin: config.server.corsOrigin }));
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(correlationIdMiddleware);
    this.app.use(metricsMiddleware);
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', healthCheck);

    // Metrics
    this.app.get('/metrics', async (req, res) => {
      res.set('Content-Type', register.contentType);
      const metrics = await register.metrics();
      res.end(metrics);
    });

    // Dependency injection
    const productRepository = new PostgresProductRepository();
    const categoryRepository = new PostgresCategoryRepository();
    const inventoryRepository = new PostgresInventoryRepository();

    // Use cases
    const createProductUseCase = new CreateProductUseCase(
      productRepository,
      categoryRepository,
      inventoryRepository,
      this.eventPublisher,
    );
    const getProductUseCase = new GetProductUseCase(productRepository);
    const listProductsUseCase = new ListProductsUseCase(productRepository);
    const updateProductUseCase = new UpdateProductUseCase(productRepository, this.eventPublisher);
    const deleteProductUseCase = new DeleteProductUseCase(productRepository, this.eventPublisher);
    const createCategoryUseCase = new CreateCategoryUseCase(categoryRepository);
    const listCategoriesUseCase = new ListCategoriesUseCase(categoryRepository);

    // Controllers
    const productController = new ProductController(
      createProductUseCase,
      getProductUseCase,
      listProductsUseCase,
      updateProductUseCase,
      deleteProductUseCase,
    );
    const categoryController = new CategoryController(createCategoryUseCase, listCategoriesUseCase);

    // Routes
    this.app.use('/api/products', createProductRoutes(productController));
    this.app.use('/api/categories', createCategoryRoutes(categoryController));

    // Error handler (must be last)
    this.app.use(errorHandler);
  }

  async start(): Promise<void> {
    try {
      // Connect to database
      await connectDatabase();
      logger.info('Database connected');

      // Connect to RabbitMQ
      await this.eventPublisher.connect();
      await this.eventConsumer.connect();
      await this.eventConsumer.startConsuming();
      logger.info('RabbitMQ connected');

      // Setup Express
      this.setupMiddleware();
      this.setupRoutes();

      // Start server
      this.app.listen(config.server.port, () => {
        logger.info(`Product Service listening on port ${config.server.port}`);
        logger.info(`Environment: ${config.server.env}`);
      });
    } catch (error) {
      logger.error('Failed to start application:', error);
      process.exit(1);
    }
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down gracefully...');
    
    try {
      await this.eventPublisher.close();
      await this.eventConsumer.close();
      await disconnectDatabase();
      logger.info('All connections closed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  }
}

// Bootstrap
const app = new ProductServiceApp();

// Graceful shutdown
process.on('SIGTERM', () => app.shutdown());
process.on('SIGINT', () => app.shutdown());

// Start application
app.start().catch((error) => {
  logger.error('Fatal error during startup:', error);
  process.exit(1);
});

export default app;
