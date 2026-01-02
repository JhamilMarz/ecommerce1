import mongoose from 'mongoose'

/**
 * MongoDB Database Connection - Singleton Pattern
 * 
 * Architecture: Clean Architecture - Infrastructure Layer
 * Manages MongoDB connection lifecycle
 * 
 * Features:
 * - Singleton pattern (one connection per application)
 * - Connection pooling
 * - Health checks
 * - Graceful shutdown
 * - Event logging
 */
class Database {
  private static instance: Database
  private isConnected: boolean = false

  private constructor() {
    this.setupEventListeners()
  }

  /**
   * Gets singleton instance
   */
  static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database()
    }
    return Database.instance
  }

  /**
   * Connects to MongoDB
   * Uses connection string from environment variables
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      console.log('MongoDB: Already connected')
      return
    }

    const mongoUri = process.env.MONGODB_URI

    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is required')
    }

    try {
      await mongoose.connect(mongoUri, {
        // Connection options
        maxPoolSize: 10,
        minPoolSize: 2,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        family: 4, // Use IPv4
      })

      this.isConnected = true
      console.log('MongoDB: Connected successfully')
    } catch (error) {
      console.error('MongoDB: Connection failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  }

  /**
   * Disconnects from MongoDB
   * Called during graceful shutdown
   */
  async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return
    }

    try {
      await mongoose.disconnect()
      this.isConnected = false
      console.log('MongoDB: Disconnected successfully')
    } catch (error) {
      console.error('MongoDB: Disconnect failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  }

  /**
   * Health check
   * Returns true if database is ready to accept queries
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (mongoose.connection.readyState !== 1) return false
      
      if (mongoose.connection.db) {
        await mongoose.connection.db.admin().ping()
      }
      return true
    } catch (error) {
      console.error('MongoDB: Health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      return false
    }
  }

  /**
   * Gets current connection status
   */
  getConnectionStatus(): string {
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    }
    return states[mongoose.connection.readyState as keyof typeof states] || 'unknown'
  }

  /**
   * Sets up event listeners for connection events
   */
  private setupEventListeners(): void {
    mongoose.connection.on('connected', () => {
      console.log('MongoDB: Connection established')
    })

    mongoose.connection.on('error', (error) => {
      console.error('MongoDB: Connection error', {
        error: error.message,
      })
    })

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB: Connection lost')
    })

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB: Reconnected successfully')
    })
  }
}

// Export singleton instance
export const database = Database.getInstance()
