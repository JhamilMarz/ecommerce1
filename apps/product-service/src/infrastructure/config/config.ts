export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  logging: boolean;
}

export interface JwtConfig {
  secret: string;
  expiresIn: string;
}

export interface RabbitMQConfig {
  url: string;
  exchange: string;
  exchangeType: string;
  queues: {
    productEvents: string;
    inventoryUpdates: string;
    dlq: string;
  };
}

export interface ServerConfig {
  port: number;
  corsOrigin: string;
  env: string;
}

export interface Config {
  server: ServerConfig;
  database: DatabaseConfig;
  jwt: JwtConfig;
  rabbitmq: RabbitMQConfig;
  logLevel: string;
}

export const config: Config = {
  server: {
    port: parseInt(process.env.PORT || '3002', 10),
    corsOrigin: process.env.CORS_ORIGIN || '*',
    env: process.env.NODE_ENV || 'development',
  },
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'product_db',
    logging: process.env.DB_LOGGING === 'true',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'CHANGE_ME_IN_PRODUCTION',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
    exchange: process.env.RABBITMQ_EXCHANGE || 'ecommerce.events',
    exchangeType: process.env.RABBITMQ_EXCHANGE_TYPE || 'topic',
    queues: {
      productEvents: process.env.RABBITMQ_QUEUE_PRODUCT_EVENTS || 'product.events',
      inventoryUpdates: process.env.RABBITMQ_QUEUE_INVENTORY_UPDATES || 'inventory.updates',
      dlq: process.env.RABBITMQ_DLQ || 'dead-letter-queue',
    },
  },
  logLevel: process.env.LOG_LEVEL || 'info',
};
