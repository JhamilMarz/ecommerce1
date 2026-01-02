import { OrderItem } from './order-item';
import { OrderStatus, isValidTransition } from './order-status';

/**
 * Order Entity - Aggregate Root
 * 
 * Architecture: Clean Architecture - Domain Layer
 * This is the aggregate root for the Order context.
 * 
 * Business Rules:
 * - Order must have at least 1 OrderItem
 * - Confirmed orders (paid, shipped, completed) cannot modify items
 * - Status transitions must follow state machine rules
 * - Total amount is calculated from items, not stored separately
 * - All changes to order state must be validated
 */
export class Order {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly items: OrderItem[],
    public readonly status: OrderStatus,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly correlationId?: string,
    public readonly paymentReference?: string,
  ) {
    this.validate();
  }

  /**
   * Calculate total amount from items
   */
  public calculateTotal(): number {
    return this.items.reduce((sum, item) => sum + item.calculateSubtotal(), 0);
  }

  /**
   * Domain validation
   */
  private validate(): void {
    if (!this.id || this.id.trim() === '') {
      throw new Error('Order: id is required');
    }

    if (!this.userId || this.userId.trim() === '') {
      throw new Error('Order: userId is required');
    }

    if (!this.items || this.items.length === 0) {
      throw new Error('Order: must have at least one item');
    }

    if (!Object.values(OrderStatus).includes(this.status)) {
      throw new Error(`Order: invalid status ${this.status}`);
    }

    if (this.createdAt > this.updatedAt) {
      throw new Error('Order: createdAt cannot be after updatedAt');
    }
  }

  /**
   * Add item to order (only if order is still pending)
   */
  public addItem(item: OrderItem): Order {
    if (this.status !== OrderStatus.PENDING) {
      throw new Error('Order: cannot add items to non-pending order');
    }

    const newItems = [...this.items, item];
    return this.withItems(newItems);
  }

  /**
   * Remove item from order (only if order is still pending)
   */
  public removeItem(productId: string): Order {
    if (this.status !== OrderStatus.PENDING) {
      throw new Error('Order: cannot remove items from non-pending order');
    }

    const newItems = this.items.filter((item) => item.productId !== productId);

    if (newItems.length === 0) {
      throw new Error('Order: must have at least one item');
    }

    return this.withItems(newItems);
  }

  /**
   * Change order status (validates state machine transitions)
   */
  public changeStatus(
    newStatus: OrderStatus,
    paymentReference?: string,
  ): Order {
    if (!isValidTransition(this.status, newStatus)) {
      throw new Error(
        `Order: invalid state transition from ${this.status} to ${newStatus}`,
      );
    }

    return new Order(
      this.id,
      this.userId,
      this.items,
      newStatus,
      this.createdAt,
      new Date(),
      this.correlationId,
      paymentReference || this.paymentReference,
    );
  }

  /**
   * Mark order as awaiting payment
   */
  public markAwaitingPayment(): Order {
    return this.changeStatus(OrderStatus.AWAITING_PAYMENT);
  }

  /**
   * Mark order as paid
   */
  public markPaid(paymentReference: string): Order {
    if (!paymentReference || paymentReference.trim() === '') {
      throw new Error('Order: paymentReference is required when marking as paid');
    }

    return this.changeStatus(OrderStatus.PAID, paymentReference);
  }

  /**
   * Mark order as shipped
   */
  public markShipped(): Order {
    return this.changeStatus(OrderStatus.SHIPPED);
  }

  /**
   * Mark order as completed
   */
  public markCompleted(): Order {
    return this.changeStatus(OrderStatus.COMPLETED);
  }

  /**
   * Cancel order
   */
  public cancel(): Order {
    return this.changeStatus(OrderStatus.CANCELLED);
  }

  /**
   * Check if order can be modified (items)
   */
  public canModifyItems(): boolean {
    return this.status === OrderStatus.PENDING;
  }

  /**
   * Check if order can be cancelled
   */
  public canBeCancelled(): boolean {
    return ![OrderStatus.COMPLETED, OrderStatus.CANCELLED].includes(this.status);
  }

  /**
   * Helper: create copy with new items
   */
  private withItems(items: OrderItem[]): Order {
    return new Order(
      this.id,
      this.userId,
      items,
      this.status,
      this.createdAt,
      new Date(),
      this.correlationId,
      this.paymentReference,
    );
  }

  /**
   * Static factory: create new pending order
   */
  public static create(
    id: string,
    userId: string,
    items: OrderItem[],
    correlationId?: string,
  ): Order {
    return new Order(
      id,
      userId,
      items,
      OrderStatus.PENDING,
      new Date(),
      new Date(),
      correlationId,
      undefined,
    );
  }
}
