import { v4 as uuidv4 } from 'uuid'
import { NotificationModel } from './models/notification-model'

/**
 * Seed Notification Data
 *
 * Creates sample notifications for development and testing.
 *
 * @remarks
 * - Only run in development environment
 * - Includes various statuses, channels, and event types
 * - Useful for testing UI and retry logic
 */

export async function seedNotifications(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    console.warn('⚠️  Skipping seed in production environment')
    return
  }

  console.log('🌱 Seeding notification data...')

  try {
    // Clear existing data
    await NotificationModel.destroy({ where: {}, truncate: true })

    const correlationId1 = uuidv4()
    const correlationId2 = uuidv4()
    const correlationId3 = uuidv4()

    // Seed notifications
    const notifications = [
      // 1. Successful email notification (user.created)
      {
        id: uuidv4(),
        eventType: 'user.created',
        channel: 'email' as const,
        recipientId: 'user-001',
        recipientEmail: 'john.doe@example.com',
        subject: 'Welcome to Our Platform!',
        message: 'Thank you for registering. Your account has been created successfully.',
        metadata: {
          userId: 'user-001',
          username: 'johndoe',
          registrationDate: new Date().toISOString(),
        },
        status: 'sent' as const,
        retries: 0,
        providerResponse: {
          messageId: 'email-msg-001',
          provider: 'email',
          timestamp: new Date().toISOString(),
        },
        sentAt: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
        correlationId: correlationId1,
      },

      // 2. Successful webhook notification (order.created)
      {
        id: uuidv4(),
        eventType: 'order.created',
        channel: 'webhook' as const,
        recipientId: 'merchant-001',
        recipientWebhookUrl: 'https://merchant.example.com/webhooks/orders',
        message: JSON.stringify({
          event: 'order.created',
          orderId: 'order-001',
          totalAmount: 99.99,
          currency: 'USD',
        }),
        metadata: {
          orderId: 'order-001',
          merchantId: 'merchant-001',
          orderAmount: 99.99,
        },
        status: 'sent' as const,
        retries: 0,
        providerResponse: {
          messageId: 'webhook-msg-001',
          provider: 'webhook',
          statusCode: 200,
          timestamp: new Date().toISOString(),
        },
        sentAt: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
        correlationId: correlationId2,
      },

      // 3. Failed email notification (order.paid)
      {
        id: uuidv4(),
        eventType: 'order.paid',
        channel: 'email' as const,
        recipientId: 'user-002',
        recipientEmail: 'invalid-email@',
        subject: 'Payment Confirmed',
        message: 'Your payment has been processed successfully.',
        metadata: {
          orderId: 'order-002',
          paymentId: 'payment-002',
          amount: 149.99,
        },
        status: 'failed' as const,
        retries: 2,
        lastError: 'Invalid email address format',
        correlationId: correlationId3,
      },

      // 4. Pending email notification (order.cancelled)
      {
        id: uuidv4(),
        eventType: 'order.cancelled',
        channel: 'email' as const,
        recipientId: 'user-003',
        recipientEmail: 'jane.smith@example.com',
        subject: 'Order Cancelled',
        message: 'Your order has been cancelled as requested.',
        metadata: {
          orderId: 'order-003',
          cancellationReason: 'Customer request',
        },
        status: 'pending' as const,
        retries: 0,
        correlationId: uuidv4(),
      },

      // 5. Retrying webhook notification (payment.failed)
      {
        id: uuidv4(),
        eventType: 'payment.failed',
        channel: 'webhook' as const,
        recipientId: 'merchant-002',
        recipientWebhookUrl: 'https://merchant2.example.com/webhooks/payments',
        message: JSON.stringify({
          event: 'payment.failed',
          paymentId: 'payment-003',
          reason: 'Insufficient funds',
        }),
        metadata: {
          paymentId: 'payment-003',
          merchantId: 'merchant-002',
          failureReason: 'Insufficient funds',
        },
        status: 'retrying' as const,
        retries: 1,
        lastError: 'Webhook endpoint returned 503 Service Unavailable',
        correlationId: uuidv4(),
      },

      // 6. Successful email notification (order.created)
      {
        id: uuidv4(),
        eventType: 'order.created',
        channel: 'email' as const,
        recipientId: 'user-004',
        recipientEmail: 'bob.wilson@example.com',
        subject: 'Order Confirmation',
        message: 'Your order has been received and is being processed.',
        metadata: {
          orderId: 'order-004',
          userId: 'user-004',
          totalAmount: 79.99,
        },
        status: 'sent' as const,
        retries: 0,
        providerResponse: {
          messageId: 'email-msg-002',
          provider: 'email',
          timestamp: new Date().toISOString(),
        },
        sentAt: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
        correlationId: uuidv4(),
      },

      // 7. Failed webhook notification (max retries exceeded)
      {
        id: uuidv4(),
        eventType: 'order.paid',
        channel: 'webhook' as const,
        recipientId: 'merchant-003',
        recipientWebhookUrl: 'https://offline-merchant.example.com/webhooks',
        message: JSON.stringify({
          event: 'order.paid',
          orderId: 'order-005',
          paymentId: 'payment-004',
        }),
        metadata: {
          orderId: 'order-005',
          merchantId: 'merchant-003',
        },
        status: 'failed' as const,
        retries: 3,
        lastError: 'Max retry attempts (3) exceeded. Webhook endpoint unreachable.',
        correlationId: uuidv4(),
      },
    ]

    await NotificationModel.bulkCreate(notifications)

    console.log(`✅ Seeded ${notifications.length} notifications successfully`)
    console.log('  - Sent: 3 notifications')
    console.log('  - Failed: 2 notifications')
    console.log('  - Pending: 1 notification')
    console.log('  - Retrying: 1 notification')
  } catch (error) {
    console.error('❌ Error seeding notifications:', error)
    throw error
  }
}

/**
 * Clear all notification data
 *
 * Useful for resetting the database.
 */
export async function clearNotifications(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    console.warn('⚠️  Cannot clear data in production environment')
    return
  }

  console.log('🗑️  Clearing notification data...')

  try {
    const deletedCount = await NotificationModel.destroy({ where: {}, truncate: true })
    console.log(`✅ Cleared ${deletedCount} notifications`)
  } catch (error) {
    console.error('❌ Error clearing notifications:', error)
    throw error
  }
}
