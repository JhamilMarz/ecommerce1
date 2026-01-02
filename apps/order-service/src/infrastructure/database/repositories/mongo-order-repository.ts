import { Order } from '@/domain/entities/order';
import { OrderItem } from '@/domain/entities/order-item';
import { OrderStatus } from '@/domain/entities/order-status';
import { OrderRepository } from '@/domain/repositories/order-repository';
import { OrderModel, OrderDocument } from '../schemas/order-schema';
import { logger } from '../../observability/logger';

/**
 * MongoDB Order Repository Implementation
 * 
 * Architecture: Clean Architecture - Infrastructure Layer
 * Implements OrderRepository interface from Domain Layer
 * Maps between Order domain entity and MongoDB OrderDocument
 */
export class MongoOrderRepository implements OrderRepository {
  /**
   * Save a new order or update existing one
   */
  async save(order: Order): Promise<Order> {
    try {
      const document = this.toDocument(order);

      const savedDoc = await OrderModel.findByIdAndUpdate(
        order.id,
        document,
        { upsert: true, new: true, runValidators: true },
      );

      if (!savedDoc) {
        throw new Error(`Failed to save order ${order.id}`);
      }

      return this.toDomain(savedDoc);
    } catch (error) {
      logger.error('MongoOrderRepository: Failed to save order', {
        orderId: order.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Find order by ID
   */
  async findById(id: string): Promise<Order | null> {
    try {
      const document = await OrderModel.findById(id);

      if (!document) {
        return null;
      }

      return this.toDomain(document);
    } catch (error) {
      logger.error('MongoOrderRepository: Failed to find order by ID', {
        orderId: id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Find all orders for a specific user (paginated)
   */
  async findByUserId(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ orders: Order[]; total: number }> {
    try {
      const skip = (page - 1) * limit;

      const [documents, total] = await Promise.all([
        OrderModel.find({ userId })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        OrderModel.countDocuments({ userId }),
      ]);

      const orders = documents.map((doc) => this.toDomain(doc));

      return { orders, total };
    } catch (error) {
      logger.error('MongoOrderRepository: Failed to find orders by userId', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Find all orders (admin only, paginated)
   */
  async findAll(
    page: number = 1,
    limit: number = 10,
    status?: OrderStatus,
  ): Promise<{ orders: Order[]; total: number }> {
    try {
      const skip = (page - 1) * limit;
      const filter = status ? { status } : {};

      const [documents, total] = await Promise.all([
        OrderModel.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        OrderModel.countDocuments(filter),
      ]);

      const orders = documents.map((doc) => this.toDomain(doc));

      return { orders, total };
    } catch (error) {
      logger.error('MongoOrderRepository: Failed to find all orders', {
        status,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Check if order exists
   */
  async exists(id: string): Promise<boolean> {
    try {
      const count = await OrderModel.countDocuments({ _id: id });
      return count > 0;
    } catch (error) {
      logger.error('MongoOrderRepository: Failed to check order existence', {
        orderId: id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Delete order (for testing/cleanup only)
   */
  async delete(id: string): Promise<boolean> {
    try {
      const result = await OrderModel.deleteOne({ _id: id });
      return result.deletedCount > 0;
    } catch (error) {
      logger.error('MongoOrderRepository: Failed to delete order', {
        orderId: id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Map MongoDB document to domain entity
   */
  private toDomain(document: OrderDocument): Order {
    const items = document.items.map(
      (item) =>
        new OrderItem(
          item.productId,
          item.productName,
          item.quantity,
          item.priceSnapshot,
        ),
    );

    return new Order(
      document._id,
      document.userId,
      items,
      document.status,
      document.createdAt,
      document.updatedAt,
      document.correlationId,
      document.paymentReference,
    );
  }

  /**
   * Map domain entity to MongoDB document
   */
  private toDocument(order: Order): Partial<OrderDocument> {
    return {
      _id: order.id,
      userId: order.userId,
      items: order.items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        priceSnapshot: item.priceSnapshot,
      })),
      status: order.status,
      correlationId: order.correlationId,
      paymentReference: order.paymentReference,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }
}
