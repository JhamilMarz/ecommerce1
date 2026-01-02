/**
 * Domain Event Interface
 * 
 * Base interface for all domain events published to RabbitMQ
 */
export interface DomainEvent {
  eventType: string;
  eventId: string;
  timestamp: Date;
  correlationId?: string;
  payload: unknown;
}

/**
 * Order Created Event
 * Published when a new order is created
 */
export interface OrderCreatedEvent extends DomainEvent {
  eventType: 'order.created';
  payload: {
    orderId: string;
    userId: string;
    items: Array<{
      productId: string;
      quantity: number;
      priceSnapshot: number;
    }>;
    totalAmount: number;
    status: string;
  };
}

/**
 * Order Paid Event
 * Published when an order is marked as paid
 */
export interface OrderPaidEvent extends DomainEvent {
  eventType: 'order.paid';
  payload: {
    orderId: string;
    userId: string;
    paymentReference: string;
    totalAmount: number;
  };
}

/**
 * Order Cancelled Event
 * Published when an order is cancelled
 */
export interface OrderCancelledEvent extends DomainEvent {
  eventType: 'order.cancelled';
  payload: {
    orderId: string;
    userId: string;
    reason?: string;
  };
}

/**
 * Payment Succeeded Event (consumed)
 * Event from Payment Service when payment succeeds
 */
export interface PaymentSucceededEvent extends DomainEvent {
  eventType: 'payment.succeeded';
  payload: {
    orderId: string;
    paymentId: string;
    amount: number;
  };
}

/**
 * Payment Failed Event (consumed)
 * Event from Payment Service when payment fails
 */
export interface PaymentFailedEvent extends DomainEvent {
  eventType: 'payment.failed';
  payload: {
    orderId: string;
    paymentId: string;
    reason: string;
  };
}
