import dotenv from 'dotenv'

dotenv.config()

export const config = {
  // Server
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.AUTH_SERVICE_PORT || '3001', 10),
  host: process.env.AUTH_SERVICE_HOST || '0.0.0.0',

  // JWT
  jwt: {
    accessTokenSecret: process.env.JWT_ACCESS_SECRET || 'access-secret-change-in-production',
    refreshTokenSecret: process.env.JWT_REFRESH_SECRET || 'refresh-secret-change-in-production',
    accessTokenExpiresIn: parseInt(process.env.JWT_ACCESS_EXPIRES_IN || '900', 10), // 15 minutes in seconds
    refreshTokenExpiresIn: parseInt(process.env.JWT_REFRESH_EXPIRES_IN || '604800', 10), // 7 days in seconds
  },

  // Database
  database: {
    host: process.env.AUTH_DB_HOST || 'localhost',
    port: parseInt(process.env.AUTH_DB_PORT || '5432', 10),
    name: process.env.AUTH_DB_NAME || 'auth_db',
    user: process.env.AUTH_DB_USER || 'postgres',
    password: process.env.AUTH_DB_PASSWORD || 'postgres',
    dialect: 'postgres' as const,
    logging: process.env.DB_LOGGING === 'true',
  },

  // RabbitMQ
  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
    exchange: process.env.RABBITMQ_EXCHANGE || 'auth.events',
    reconnectDelay: parseInt(process.env.RABBITMQ_RECONNECT_DELAY || '5000', 10),
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: process.env.CORS_CREDENTIALS === 'true',
  },
}
