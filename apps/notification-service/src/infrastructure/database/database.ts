import { Sequelize } from 'sequelize'

/**
 * PostgreSQL Database Connection
 *
 * Manages Sequelize connection to PostgreSQL database.
 *
 * @remarks
 * - Connection string from DATABASE_URL environment variable
 * - Retry logic for transient failures
 * - Pool configuration for optimal performance
 * - Logging disabled in production
 */

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required')
}

/**
 * Sequelize instance
 *
 * Configured for PostgreSQL with connection pooling.
 */
export const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 10,
    min: 2,
    acquire: 30000,
    idle: 10000,
  },
  retry: {
    max: 3,
    match: [
      /SequelizeConnectionError/,
      /SequelizeConnectionRefusedError/,
      /SequelizeHostNotFoundError/,
      /SequelizeHostNotReachableError/,
      /SequelizeInvalidConnectionError/,
      /SequelizeConnectionTimedOutError/,
    ],
  },
  dialectOptions: {
    // SSL configuration for production
    ...(process.env.NODE_ENV === 'production' && {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    }),
  },
})

/**
 * Connect to database with retry logic
 *
 * @param maxRetries - Maximum retry attempts (default: 5)
 * @param retryDelay - Delay between retries in ms (default: 5000)
 * @throws Error if connection fails after all retries
 */
export async function connectDatabase(
  maxRetries: number = 5,
  retryDelay: number = 5000
): Promise<void> {
  let lastError: Error | undefined

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await sequelize.authenticate()
      console.log(`✅ PostgreSQL connected successfully (attempt ${attempt}/${maxRetries})`)
      return
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      console.error(
        `❌ PostgreSQL connection failed (attempt ${attempt}/${maxRetries}):`,
        lastError.message
      )

      if (attempt < maxRetries) {
        console.log(`⏳ Retrying in ${retryDelay / 1000} seconds...`)
        await new Promise((resolve) => setTimeout(resolve, retryDelay))
      }
    }
  }

  throw new Error(`Failed to connect to PostgreSQL after ${maxRetries} attempts: ${lastError?.message}`)
}

/**
 * Close database connection gracefully
 *
 * Should be called on application shutdown.
 */
export async function closeDatabase(): Promise<void> {
  try {
    await sequelize.close()
    console.log('✅ PostgreSQL connection closed')
  } catch (error) {
    console.error('❌ Error closing PostgreSQL connection:', error)
    throw error
  }
}

/**
 * Check database connection health
 *
 * @returns True if database is connected and responsive
 */
export async function isDatabaseHealthy(): Promise<boolean> {
  try {
    await sequelize.authenticate()
    return true
  } catch {
    return false
  }
}

/**
 * Get connection status
 *
 * @returns Connection status string
 */
export function getConnectionStatus(): string {
  try {
    // Check if connection is established
    const connectionManager = sequelize.connectionManager
    const isConnected = connectionManager.pool !== undefined

    return isConnected ? 'connected' : 'disconnected'
  } catch {
    return 'error'
  }
}
