import mongoose from 'mongoose';
import { logger } from '../observability/logger';

/**
 * MongoDB Database Configuration
 * 
 * Architecture: Clean Architecture - Infrastructure Layer
 * Handles MongoDB connection with Mongoose
 */
export class Database {
  private static instance: Database;
  private isConnected = false;

  private constructor() {}

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  /**
   * Connect to MongoDB
   */
  public async connect(): Promise<void> {
    if (this.isConnected) {
      logger.info('MongoDB: Already connected');
      return;
    }

    const uri = process.env.MONGODB_URI;

    if (!uri) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }

    try {
      await mongoose.connect(uri, {
        maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE || '20', 10),
        minPoolSize: parseInt(process.env.MONGODB_POOL_SIZE || '10', 10),
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      this.isConnected = true;

      logger.info('MongoDB: Connected successfully', {
        host: mongoose.connection.host,
        database: mongoose.connection.name,
      });

      // Handle connection events
      mongoose.connection.on('error', (error) => {
        logger.error('MongoDB: Connection error', { error: error.message });
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB: Disconnected');
        this.isConnected = false;
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('MongoDB: Reconnected');
        this.isConnected = true;
      });
    } catch (error) {
      logger.error('MongoDB: Connection failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Disconnect from MongoDB
   */
  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.disconnect();
      this.isConnected = false;
      logger.info('MongoDB: Disconnected successfully');
    } catch (error) {
      logger.error('MongoDB: Disconnect failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get connection status
   */
  public getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Health check
   */
  public async healthCheck(): Promise<boolean> {
    try {
      if (!this.isConnected) {
        return false;
      }

      // Ping database
      await mongoose.connection.db.admin().ping();
      return true;
    } catch (error) {
      logger.error('MongoDB: Health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }
}

export const database = Database.getInstance();
