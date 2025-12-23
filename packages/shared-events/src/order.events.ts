import { DomainEvent } from './base.event'

export class OrderCreatedEvent extends DomainEvent {
  constructor(
    public readonly orderId: string,
    public readonly userId: string,
    public readonly totalAmount: number,
    public readonly items: Array<{ productId: string; quantity: number; price: number }>
  ) {
    super('order.created')
  }
}

export class OrderCancelledEvent extends DomainEvent {
  constructor(
    public readonly orderId: string,
    public readonly reason: string
  ) {
    super('order.cancelled')
  }
}

export class OrderShippedEvent extends DomainEvent {
  constructor(
    public readonly orderId: string,
    public readonly trackingNumber: string
  ) {
    super('order.shipped')
  }
}
