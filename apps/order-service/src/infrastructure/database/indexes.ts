import { OrderModel } from './schemas/order-schema';
import { OrderHistoryModel } from './schemas/order-history-schema';
import { logger } from '../observability/logger';

/**
 * Database Indexes Setup
 * 
 * Creates indexes for optimal query performance
 * Run this on application startup or as migration
 */
export async function createIndexes(): Promise<void> {
  try {
    logger.info('Creating database indexes...');

    // Order indexes
    await OrderModel.createIndexes();
    logger.info('Order indexes created successfully');

    // OrderHistory indexes
    await OrderHistoryModel.createIndexes();
    logger.info('OrderHistory indexes created successfully');

    logger.info('All database indexes created successfully');
  } catch (error) {
    logger.error('Failed to create database indexes', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * List all indexes for debugging
 */
export async function listIndexes(): Promise<void> {
  try {
    const orderIndexes = await OrderModel.collection.getIndexes();
    const historyIndexes = await OrderHistoryModel.collection.getIndexes();

    logger.info('Order collection indexes:', { indexes: orderIndexes });
    logger.info('OrderHistory collection indexes:', { indexes: historyIndexes });
  } catch (error) {
    logger.error('Failed to list indexes', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
