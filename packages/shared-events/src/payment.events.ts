import { DomainEvent } from './base.event'

export class PaymentProcessedEvent extends DomainEvent {
  constructor(
    public readonly paymentId: string,
    public readonly orderId: string,
    public readonly amount: number,
    public readonly status: 'success' | 'failed'
  ) {
    super('payment.processed')
  }
}

export class PaymentRefundedEvent extends DomainEvent {
  constructor(
    public readonly paymentId: string,
    public readonly orderId: string,
    public readonly amount: number
  ) {
    super('payment.refunded')
  }
}
