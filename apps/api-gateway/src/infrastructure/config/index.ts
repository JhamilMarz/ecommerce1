import dotenv from 'dotenv'

dotenv.config()

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.API_GATEWAY_PORT || '3000', 10),
  host: process.env.API_GATEWAY_HOST || '0.0.0.0',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-key-change-in-production',
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },
  services: {
    auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    product: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002',
    order: process.env.ORDER_SERVICE_URL || 'http://localhost:3003',
    notification: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3004',
    payment: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3005',
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // limit each IP to 1000 requests per windowMs
  },
}
