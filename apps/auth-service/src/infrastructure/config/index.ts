import dotenv from 'dotenv'

dotenv.config()

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.AUTH_SERVICE_PORT || '3001', 10),
  host: process.env.AUTH_SERVICE_HOST || '0.0.0.0',
  jwt: {
    secret: process.env.JWT_SECRET || 'change-me-in-production',
    accessTokenExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
  },
  database: {
    host: process.env.AUTH_DB_HOST || 'localhost',
    port: parseInt(process.env.AUTH_DB_PORT || '5432', 10),
    name: process.env.AUTH_DB_NAME || 'auth',
    user: process.env.AUTH_DB_USER || 'postgres',
    password: process.env.AUTH_DB_PASSWORD || 'postgres',
  },
}
