import { OrderHistory } from '../entities/order-history';

/**
 * Order History Repository Interface - Domain Layer
 * 
 * Architecture: Clean Architecture - Domain Layer
 * Repository for audit trail of order status changes
 * 
 * Implementation will be in Infrastructure Layer
 */
export interface OrderHistoryRepository {
  /**
   * Save a history entry
   */
  save(history: OrderHistory): Promise<OrderHistory>;

  /**
   * Find all history entries for an order
   */
  findByOrderId(orderId: string): Promise<OrderHistory[]>;

  /**
   * Find history by ID
   */
  findById(id: string): Promise<OrderHistory | null>;
}
