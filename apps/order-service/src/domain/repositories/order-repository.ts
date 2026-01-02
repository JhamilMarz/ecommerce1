import { Order } from '../entities/order';
import { OrderStatus } from '../entities/order-status';

/**
 * Order Repository Interface - Domain Layer
 * 
 * Architecture: Clean Architecture - Domain Layer
 * This interface defines the contract for persistence operations
 * without knowing about infrastructure details (MongoDB, etc.)
 * 
 * Implementation will be in Infrastructure Layer
 */
export interface OrderRepository {
  /**
   * Save a new order or update existing one
   */
  save(order: Order): Promise<Order>;

  /**
   * Find order by ID
   */
  findById(id: string): Promise<Order | null>;

  /**
   * Find all orders for a specific user
   */
  findByUserId(
    userId: string,
    page?: number,
    limit?: number,
  ): Promise<{ orders: Order[]; total: number }>;

  /**
   * Find all orders (admin only)
   */
  findAll(
    page?: number,
    limit?: number,
    status?: OrderStatus,
  ): Promise<{ orders: Order[]; total: number }>;

  /**
   * Check if order exists
   */
  exists(id: string): Promise<boolean>;

  /**
   * Delete order (for testing/cleanup only)
   */
  delete(id: string): Promise<boolean>;
}
