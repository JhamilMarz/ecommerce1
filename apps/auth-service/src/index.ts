import express from 'express';
import helmet from 'helmet';
import cors from 'cors';

import { config } from './infrastructure/config';
import { logger } from './infrastructure/logger';
import { sequelize } from './infrastructure/database';
import { RabbitMQEventPublisher } from './infrastructure/messaging/rabbitmq-event-publisher';

// Repositories
import { PostgresUserRepository } from './infrastructure/database/repositories/postgres-user-repository';
import { PostgresRefreshTokenRepository } from './infrastructure/database/repositories/postgres-refresh-token-repository';

// Services
import { JoseJwtService } from './infrastructure/services/jose-jwt-service';
import { Argon2PasswordService } from './infrastructure/services/argon2-password-service';

// Use Cases
import { RegisterUserUseCase } from './application/use-cases/register-user';
import { LoginUserUseCase } from './application/use-cases/login-user';
import { RefreshTokenUseCase } from './application/use-cases/refresh-token';
import { LogoutUserUseCase } from './application/use-cases/logout-user';
import { GetCurrentUserUseCase } from './application/use-cases/get-current-user';

// HTTP
import { AuthController } from './infrastructure/http/auth-controller';
import { createAuthRoutes } from './infrastructure/http/auth-routes';
import { correlationIdMiddleware } from './infrastructure/middleware/correlation-id';
import { requestLoggerMiddleware } from './infrastructure/middleware/request-logger';
import { errorHandler } from './infrastructure/middleware/error-handler';

const app = express();

// Global middleware
app.use(helmet());
app.use(cors(config.cors));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(correlationIdMiddleware);
app.use(requestLoggerMiddleware);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'auth-service' });
});

// Initialize dependencies
const userRepository = new PostgresUserRepository();
const refreshTokenRepository = new PostgresRefreshTokenRepository();
const jwtService = new JoseJwtService();
const passwordHashingService = new Argon2PasswordService();
const eventPublisher = new RabbitMQEventPublisher();

// Initialize use cases
const registerUserUseCase = new RegisterUserUseCase(
  userRepository,
  passwordHashingService,
  eventPublisher
);

const loginUserUseCase = new LoginUserUseCase(
  userRepository,
  refreshTokenRepository,
  passwordHashingService,
  jwtService,
  eventPublisher
);

const refreshTokenUseCase = new RefreshTokenUseCase(
  userRepository,
  refreshTokenRepository,
  jwtService
);

const logoutUserUseCase = new LogoutUserUseCase(
  refreshTokenRepository,
  eventPublisher
);

const getCurrentUserUseCase = new GetCurrentUserUseCase(userRepository);

// Initialize controller
const authController = new AuthController(
  registerUserUseCase,
  loginUserUseCase,
  refreshTokenUseCase,
  logoutUserUseCase,
  getCurrentUserUseCase
);

// Setup routes
const authRoutes = createAuthRoutes(authController);
app.use('/api/v1/auth', authRoutes);

// Error handling (must be last)
app.use(errorHandler);

const PORT = config.port;
const HOST = config.host;

// Startup function
async function startup() {
  try {
    // Connect to database
    logger.info('Connecting to database...');
    await sequelize.authenticate();
    logger.info('Database connected successfully');

    // Sync database (development only)
    if (config.env === 'development') {
      await sequelize.sync({ alter: true });
      logger.info('Database synchronized');
    }

    // Connect to RabbitMQ
    logger.info('Connecting to RabbitMQ...');
    await eventPublisher.connect();
    logger.info('RabbitMQ connected successfully');

    // Start server
    app.listen(PORT, HOST, () => {
      logger.info(`Auth Service running on ${HOST}:${PORT}`);
      logger.info(`Environment: ${config.env}`);
    });
  } catch (error) {
    logger.error('Failed to start service', { error });
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown() {
  logger.info('Shutting down gracefully...');

  try {
    // Close RabbitMQ connection
    await eventPublisher.close();
    logger.info('RabbitMQ connection closed');

    // Close database connection
    await sequelize.close();
    logger.info('Database connection closed');

    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', { error });
    process.exit(1);
  }
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start the application
startup();
