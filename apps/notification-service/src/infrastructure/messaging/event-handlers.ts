import { SendNotificationUseCase } from '../../application'
import { NotificationChannel } from '../../domain/value-objects/notification-channel'

/**
 * Event Handlers
 *
 * Handles incoming events from RabbitMQ and creates appropriate notifications.
 *
 * @remarks
 * - Determines notification channel based on event type
 * - Constructs notification messages
 * - Uses correlationId for tracing and idempotency
 * - Delegates to SendNotificationUseCase
 */
export class EventHandlers {
  constructor(private readonly sendNotificationUseCase: SendNotificationUseCase) {}

  /**
   * Handle user.created event
   *
   * Sends welcome email to new user.
   */
  async handleUserCreated(payload: any, correlationId: string): Promise<void> {
    const { userId, email, username } = payload

    await this.sendNotificationUseCase.execute({
      eventType: 'user.created',
      channel: 'email',
      recipientId: userId,
      recipientEmail: email,
      subject: 'Welcome to Our Platform!',
      message: `Hi ${username || 'there'},\n\nThank you for registering with us. Your account has been created successfully.\n\nBest regards,\nThe Team`,
      metadata: {
        userId,
        username,
        registrationDate: new Date().toISOString(),
      },
      correlationId,
    })
  }

  /**
   * Handle order.created event
   *
   * Sends order confirmation email to customer and webhook to merchant.
   */
  async handleOrderCreated(payload: any, correlationId: string): Promise<void> {
    const { orderId, customerId, customerEmail, items, totalAmount, currency } = payload

    // Email to customer
    await this.sendNotificationUseCase.execute({
      eventType: 'order.created',
      channel: 'email',
      recipientId: customerId,
      recipientEmail: customerEmail,
      subject: 'Order Confirmation',
      message: `Your order #${orderId} has been received and is being processed.\n\nOrder Total: ${totalAmount} ${currency}\nItems: ${items?.length || 0}\n\nThank you for your purchase!`,
      metadata: {
        orderId,
        customerId,
        totalAmount,
        currency,
        itemCount: items?.length || 0,
      },
      correlationId,
    })

    // Webhook to merchant (if webhook URL available)
    if (payload.merchantWebhookUrl) {
      await this.sendNotificationUseCase.execute({
        eventType: 'order.created',
        channel: 'webhook',
        recipientId: payload.merchantId || 'merchant-001',
        recipientWebhookUrl: payload.merchantWebhookUrl,
        message: JSON.stringify({
          event: 'order.created',
          orderId,
          customerId,
          totalAmount,
          currency,
          items,
          timestamp: new Date().toISOString(),
        }),
        metadata: {
          orderId,
          merchantId: payload.merchantId,
        },
        correlationId: `${correlationId}-webhook`,
      })
    }
  }

  /**
   * Handle order.paid event
   *
   * Sends payment confirmation email to customer.
   */
  async handleOrderPaid(payload: any, correlationId: string): Promise<void> {
    const { orderId, customerId, customerEmail, paymentId, amount, currency } = payload

    await this.sendNotificationUseCase.execute({
      eventType: 'order.paid',
      channel: 'email',
      recipientId: customerId,
      recipientEmail: customerEmail,
      subject: 'Payment Confirmed',
      message: `Your payment for order #${orderId} has been processed successfully.\n\nPayment ID: ${paymentId}\nAmount: ${amount} ${currency}\n\nThank you!`,
      metadata: {
        orderId,
        customerId,
        paymentId,
        amount,
        currency,
      },
      correlationId,
    })
  }

  /**
   * Handle order.cancelled event
   *
   * Sends cancellation confirmation email to customer.
   */
  async handleOrderCancelled(payload: any, correlationId: string): Promise<void> {
    const { orderId, customerId, customerEmail, cancellationReason } = payload

    await this.sendNotificationUseCase.execute({
      eventType: 'order.cancelled',
      channel: 'email',
      recipientId: customerId,
      recipientEmail: customerEmail,
      subject: 'Order Cancelled',
      message: `Your order #${orderId} has been cancelled as requested.\n\n${cancellationReason ? `Reason: ${cancellationReason}\n\n` : ''}If you have any questions, please contact our support team.`,
      metadata: {
        orderId,
        customerId,
        cancellationReason,
      },
      correlationId,
    })
  }

  /**
   * Handle payment.failed event
   *
   * Sends payment failure notification to customer and webhook to merchant.
   */
  async handlePaymentFailed(payload: any, correlationId: string): Promise<void> {
    const { paymentId, orderId, customerId, customerEmail, failureReason, amount, currency } =
      payload

    // Email to customer
    await this.sendNotificationUseCase.execute({
      eventType: 'payment.failed',
      channel: 'email',
      recipientId: customerId,
      recipientEmail: customerEmail,
      subject: 'Payment Failed',
      message: `Unfortunately, your payment for order #${orderId} could not be processed.\n\nReason: ${failureReason}\nAmount: ${amount} ${currency}\n\nPlease try again or use a different payment method.`,
      metadata: {
        paymentId,
        orderId,
        customerId,
        failureReason,
        amount,
        currency,
      },
      correlationId,
    })

    // Webhook to merchant (if webhook URL available)
    if (payload.merchantWebhookUrl) {
      await this.sendNotificationUseCase.execute({
        eventType: 'payment.failed',
        channel: 'webhook',
        recipientId: payload.merchantId || 'merchant-001',
        recipientWebhookUrl: payload.merchantWebhookUrl,
        message: JSON.stringify({
          event: 'payment.failed',
          paymentId,
          orderId,
          failureReason,
          amount,
          currency,
          timestamp: new Date().toISOString(),
        }),
        metadata: {
          paymentId,
          orderId,
          merchantId: payload.merchantId,
        },
        correlationId: `${correlationId}-webhook`,
      })
    }
  }
}
