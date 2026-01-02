import { v4 as uuidv4 } from 'uuid';
import { OrderModel } from './schemas/order-schema';
import { OrderHistoryModel } from './schemas/order-history-schema';
import { OrderStatus } from '@/domain/entities/order-status';
import { logger } from '../observability/logger';

/**
 * Database Seed Data
 * 
 * Creates sample orders and history for development and testing
 */
export async function seedDatabase(): Promise<void> {
  try {
    logger.info('Seeding database...');

    // Check if data already exists
    const existingOrders = await OrderModel.countDocuments();

    if (existingOrders > 0) {
      logger.info('Database already contains data, skipping seed');
      return;
    }

    // Sample user IDs (these should match users from auth-service)
    const userId1 = 'user-123';
    const userId2 = 'user-456';

    // Sample orders
    const orders = [
      {
        _id: uuidv4(),
        userId: userId1,
        items: [
          {
            productId: 'prod-001',
            productName: 'Laptop Dell XPS 15',
            quantity: 1,
            priceSnapshot: 1299.99,
          },
          {
            productId: 'prod-002',
            productName: 'Wireless Mouse Logitech',
            quantity: 2,
            priceSnapshot: 29.99,
          },
        ],
        status: OrderStatus.PAID,
        correlationId: uuidv4(),
        paymentReference: 'pay-123456',
        createdAt: new Date('2026-01-01T10:00:00Z'),
        updatedAt: new Date('2026-01-01T10:15:00Z'),
      },
      {
        _id: uuidv4(),
        userId: userId1,
        items: [
          {
            productId: 'prod-003',
            productName: 'Mechanical Keyboard',
            quantity: 1,
            priceSnapshot: 149.99,
          },
        ],
        status: OrderStatus.SHIPPED,
        correlationId: uuidv4(),
        paymentReference: 'pay-789012',
        createdAt: new Date('2025-12-28T14:30:00Z'),
        updatedAt: new Date('2025-12-29T09:00:00Z'),
      },
      {
        _id: uuidv4(),
        userId: userId2,
        items: [
          {
            productId: 'prod-004',
            productName: 'USB-C Hub',
            quantity: 1,
            priceSnapshot: 49.99,
          },
          {
            productId: 'prod-005',
            productName: 'HDMI Cable 2m',
            quantity: 2,
            priceSnapshot: 12.99,
          },
        ],
        status: OrderStatus.PENDING,
        correlationId: uuidv4(),
        createdAt: new Date('2026-01-01T15:00:00Z'),
        updatedAt: new Date('2026-01-01T15:00:00Z'),
      },
      {
        _id: uuidv4(),
        userId: userId2,
        items: [
          {
            productId: 'prod-006',
            productName: 'Webcam HD 1080p',
            quantity: 1,
            priceSnapshot: 79.99,
          },
        ],
        status: OrderStatus.CANCELLED,
        correlationId: uuidv4(),
        createdAt: new Date('2025-12-25T11:00:00Z'),
        updatedAt: new Date('2025-12-25T12:00:00Z'),
      },
    ];

    // Insert orders
    await OrderModel.insertMany(orders);
    logger.info(`Seeded ${orders.length} orders`);

    // Create history entries for each order
    const historyEntries = [];

    for (const order of orders) {
      // Initial pending status
      historyEntries.push({
        _id: uuidv4(),
        orderId: order._id,
        oldStatus: OrderStatus.PENDING,
        newStatus: OrderStatus.PENDING,
        changedAt: order.createdAt,
        changedBy: order.userId,
        reason: 'Order created',
        metadata: { correlationId: order.correlationId },
      });

      // Additional status changes based on current status
      if (order.status === OrderStatus.PAID) {
        historyEntries.push({
          _id: uuidv4(),
          orderId: order._id,
          oldStatus: OrderStatus.PENDING,
          newStatus: OrderStatus.AWAITING_PAYMENT,
          changedAt: new Date(order.createdAt.getTime() + 5 * 60 * 1000), // 5 min later
          changedBy: 'system',
          reason: 'Payment initiated',
        });

        historyEntries.push({
          _id: uuidv4(),
          orderId: order._id,
          oldStatus: OrderStatus.AWAITING_PAYMENT,
          newStatus: OrderStatus.PAID,
          changedAt: new Date(order.createdAt.getTime() + 10 * 60 * 1000), // 10 min later
          changedBy: 'system',
          reason: 'Payment confirmed',
          metadata: { paymentReference: order.paymentReference },
        });
      }

      if (order.status === OrderStatus.SHIPPED) {
        historyEntries.push({
          _id: uuidv4(),
          orderId: order._id,
          oldStatus: OrderStatus.PENDING,
          newStatus: OrderStatus.AWAITING_PAYMENT,
          changedAt: new Date(order.createdAt.getTime() + 5 * 60 * 1000),
          changedBy: 'system',
          reason: 'Payment initiated',
        });

        historyEntries.push({
          _id: uuidv4(),
          orderId: order._id,
          oldStatus: OrderStatus.AWAITING_PAYMENT,
          newStatus: OrderStatus.PAID,
          changedAt: new Date(order.createdAt.getTime() + 10 * 60 * 1000),
          changedBy: 'system',
          reason: 'Payment confirmed',
          metadata: { paymentReference: order.paymentReference },
        });

        historyEntries.push({
          _id: uuidv4(),
          orderId: order._id,
          oldStatus: OrderStatus.PAID,
          newStatus: OrderStatus.SHIPPED,
          changedAt: order.updatedAt,
          changedBy: 'admin-001',
          reason: 'Order shipped',
        });
      }

      if (order.status === OrderStatus.CANCELLED) {
        historyEntries.push({
          _id: uuidv4(),
          orderId: order._id,
          oldStatus: OrderStatus.PENDING,
          newStatus: OrderStatus.CANCELLED,
          changedAt: order.updatedAt,
          changedBy: order.userId,
          reason: 'Cancelled by customer',
        });
      }
    }

    await OrderHistoryModel.insertMany(historyEntries);
    logger.info(`Seeded ${historyEntries.length} history entries`);

    logger.info('Database seeding completed successfully');
  } catch (error) {
    logger.error('Failed to seed database', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Clear all data (for testing)
 */
export async function clearDatabase(): Promise<void> {
  try {
    logger.warn('Clearing database...');

    await OrderModel.deleteMany({});
    await OrderHistoryModel.deleteMany({});

    logger.warn('Database cleared successfully');
  } catch (error) {
    logger.error('Failed to clear database', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
