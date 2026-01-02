import { OrderHistory } from '@/domain/entities/order-history';
import { OrderHistoryRepository } from '@/domain/repositories/order-history-repository';
import {
  OrderHistoryModel,
  OrderHistoryDocument,
} from '../schemas/order-history-schema';
import { logger } from '../../observability/logger';

/**
 * MongoDB Order History Repository Implementation
 * 
 * Architecture: Clean Architecture - Infrastructure Layer
 * Implements OrderHistoryRepository interface from Domain Layer
 * Maps between OrderHistory domain entity and MongoDB OrderHistoryDocument
 */
export class MongoOrderHistoryRepository implements OrderHistoryRepository {
  /**
   * Save a history entry
   */
  async save(history: OrderHistory): Promise<OrderHistory> {
    try {
      const document = this.toDocument(history);

      const savedDoc = await OrderHistoryModel.create(document);

      return this.toDomain(savedDoc);
    } catch (error) {
      logger.error('MongoOrderHistoryRepository: Failed to save history', {
        historyId: history.id,
        orderId: history.orderId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Find all history entries for an order (ordered by changedAt)
   */
  async findByOrderId(orderId: string): Promise<OrderHistory[]> {
    try {
      const documents = await OrderHistoryModel.find({ orderId }).sort({
        changedAt: 1,
      }); // Ascending order (oldest first)

      return documents.map((doc) => this.toDomain(doc));
    } catch (error) {
      logger.error(
        'MongoOrderHistoryRepository: Failed to find history by orderId',
        {
          orderId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      );
      throw error;
    }
  }

  /**
   * Find history by ID
   */
  async findById(id: string): Promise<OrderHistory | null> {
    try {
      const document = await OrderHistoryModel.findById(id);

      if (!document) {
        return null;
      }

      return this.toDomain(document);
    } catch (error) {
      logger.error('MongoOrderHistoryRepository: Failed to find history by ID', {
        historyId: id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Map MongoDB document to domain entity
   */
  private toDomain(document: OrderHistoryDocument): OrderHistory {
    return new OrderHistory(
      document._id,
      document.orderId,
      document.oldStatus,
      document.newStatus,
      document.changedAt,
      document.changedBy,
      document.reason,
      document.metadata,
    );
  }

  /**
   * Map domain entity to MongoDB document
   */
  private toDocument(history: OrderHistory): Partial<OrderHistoryDocument> {
    return {
      _id: history.id,
      orderId: history.orderId,
      oldStatus: history.oldStatus,
      newStatus: history.newStatus,
      changedAt: history.changedAt,
      changedBy: history.changedBy,
      reason: history.reason,
      metadata: history.metadata,
    };
  }
}
