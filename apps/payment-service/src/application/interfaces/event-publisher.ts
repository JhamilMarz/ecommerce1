import { PaymentMethod } from '@/domain/entities/payment-method'
import { PaymentStatus } from '@/domain/entities/payment-status'

/**
 * Domain Events - Application Layer
 * 
 * Architecture: Clean Architecture - Application Layer
 * Events published when payment state changes
 * Consumed by other services (order-service, notification-service)
 * 
 * Event-Driven Architecture:
 * - Decouples services
 * - Enables async workflows
 * - Provides audit trail
 */

/**
 * Base domain event interface
 * All events extend this
 */
export interface DomainEvent {
  eventType: string
  timestamp: string
  correlationId?: string
  metadata?: Record<string, unknown>
}

/**
 * Payment Succeeded Event
 * Published when payment is successfully processed
 * 
 * Consumed by:
 * - order-service: Mark order as paid
 * - notification-service: Send payment confirmation email
 */
export interface PaymentSucceededEvent extends DomainEvent {
  eventType: 'payment.succeeded'
  paymentId: string
  orderId: string
  userId: string
  amount: number
  currency: string
  method: PaymentMethod
  providerTransactionId?: string
  processedAt: string
}

/**
 * Payment Failed Event
 * Published when payment processing fails
 * 
 * Consumed by:
 * - order-service: Mark order as payment failed, allow retry
 * - notification-service: Send payment failure notification
 */
export interface PaymentFailedEvent extends DomainEvent {
  eventType: 'payment.failed'
  paymentId: string
  orderId: string
  userId: string
  amount: number
  currency: string
  method: PaymentMethod
  failureReason: string
  providerResponse?: Record<string, unknown>
  failedAt: string
}

/**
 * Payment Cancelled Event
 * Published when payment is cancelled (admin action or order cancellation)
 * 
 * Consumed by:
 * - order-service: Update order status if needed
 * - notification-service: Send cancellation notification
 */
export interface PaymentCancelledEvent extends DomainEvent {
  eventType: 'payment.cancelled'
  paymentId: string
  orderId: string
  userId: string
  amount: number
  currency: string
  reason: string
  cancelledAt: string
}

/**
 * Order Created Event (consumed by payment-service)
 * Published by order-service when new order is created
 * 
 * Used by payment-service to auto-initiate payment
 */
export interface OrderCreatedEvent extends DomainEvent {
  eventType: 'order.created'
  orderId: string
  userId: string
  totalAmount: number
  currency: string
  items: Array<{
    productId: string
    productName: string
    quantity: number
    priceSnapshot: number
  }>
  createdAt: string
}

/**
 * Order Cancelled Event (consumed by payment-service)
 * Published by order-service when order is cancelled
 * 
 * Used by payment-service to cancel pending payments
 */
export interface OrderCancelledEvent extends DomainEvent {
  eventType: 'order.cancelled'
  orderId: string
  userId: string
  reason: string
  cancelledAt: string
}

/**
 * Union type of all events published by payment-service
 */
export type PaymentEvent =
  | PaymentSucceededEvent
  | PaymentFailedEvent
  | PaymentCancelledEvent

/**
 * Union type of all events consumed by payment-service
 */
export type OrderEvent = OrderCreatedEvent | OrderCancelledEvent
