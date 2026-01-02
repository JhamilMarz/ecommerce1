import { OrderStatus } from './order-status';

/**
 * OrderHistory Entity - Audit Trail
 * 
 * Stores all status changes for an order.
 * Used for:
 * - Audit trail
 * - Debugging
 * - Business analytics
 * - Customer support
 */
export class OrderHistory {
  constructor(
    public readonly id: string,
    public readonly orderId: string,
    public readonly oldStatus: OrderStatus,
    public readonly newStatus: OrderStatus,
    public readonly changedAt: Date,
    public readonly changedBy: string,
    public readonly reason?: string,
    public readonly metadata?: Record<string, unknown>,
  ) {
    this.validate();
  }

  /**
   * Domain validation
   */
  private validate(): void {
    if (!this.id || this.id.trim() === '') {
      throw new Error('OrderHistory: id is required');
    }

    if (!this.orderId || this.orderId.trim() === '') {
      throw new Error('OrderHistory: orderId is required');
    }

    if (!Object.values(OrderStatus).includes(this.oldStatus)) {
      throw new Error(`OrderHistory: invalid oldStatus ${this.oldStatus}`);
    }

    if (!Object.values(OrderStatus).includes(this.newStatus)) {
      throw new Error(`OrderHistory: invalid newStatus ${this.newStatus}`);
    }

    if (!this.changedBy || this.changedBy.trim() === '') {
      throw new Error('OrderHistory: changedBy is required');
    }
  }

  /**
   * Static factory: create history entry for status change
   */
  public static create(
    id: string,
    orderId: string,
    oldStatus: OrderStatus,
    newStatus: OrderStatus,
    changedBy: string,
    reason?: string,
    metadata?: Record<string, unknown>,
  ): OrderHistory {
    return new OrderHistory(
      id,
      orderId,
      oldStatus,
      newStatus,
      new Date(),
      changedBy,
      reason,
      metadata,
    );
  }
}
