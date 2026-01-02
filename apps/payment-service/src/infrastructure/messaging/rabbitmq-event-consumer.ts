import amqp, { Channel, Connection, ConsumeMessage } from 'amqplib'
import { OrderEvent, OrderCreatedEvent, OrderCancelledEvent } from '@/application/interfaces/event-publisher'
import { InitiatePaymentUseCase } from '@/application/use-cases/initiate-payment'
import { GetPaymentsByOrderUseCase } from '@/application/use-cases/get-payments-by-order'
import { Payment } from '@/domain/entities/payment'
import { PaymentRepository } from '@/domain/repositories/payment-repository'

/**
 * RabbitMQ Event Consumer
 * 
 * Architecture: Clean Architecture - Infrastructure Layer (Messaging)
 * 
 * Consumes events from order-service:
 * - order.created - Automatically initiates payment for new order
 * - order.cancelled - Cancels pending payments for cancelled order
 * 
 * Exchange: order-events (topic exchange)
 * Queue: payment-service-orders (durable)
 * Routing Keys: order.created, order.cancelled
 * 
 * Error Handling:
 * - Dead Letter Queue (DLQ): payment-service-orders-dlq
 * - Max Retries: 3 attempts
 * - Retry Delay: Exponential backoff (1s, 2s, 4s)
 * - After 3 failures → message sent to DLQ for manual review
 * 
 * Message Format: JSON
 * Acknowledgment: Manual (ack after successful processing, nack on error)
 */

export class RabbitMQEventConsumer {
  private connection: Connection | null = null
  private channel: Channel | null = null
  private readonly exchangeName = 'order-events'
  private readonly queueName = 'payment-service-orders'
  private readonly dlqName = 'payment-service-orders-dlq'
  private readonly maxRetries = 3
  private isConnected = false

  constructor(
    private readonly rabbitmqUrl: string,
    private readonly initiatePaymentUseCase: InitiatePaymentUseCase,
    private readonly getPaymentsByOrderUseCase: GetPaymentsByOrderUseCase,
    private readonly paymentRepository: PaymentRepository
  ) {}

  /**
   * Initializes RabbitMQ connection, channel, queues, and bindings
   */
  async connect(): Promise<void> {
    try {
      console.log('RabbitMQ Consumer: Connecting...', {
        url: this.rabbitmqUrl.replace(/:[^:@]+@/, ':****@'),
      })

      // Create connection
      this.connection = await amqp.connect(this.rabbitmqUrl)

      this.connection.on('error', (error) => {
        console.error('RabbitMQ Consumer: Connection error', { error: error.message })
        this.isConnected = false
      })

      this.connection.on('close', () => {
        console.log('RabbitMQ Consumer: Connection closed')
        this.isConnected = false
      })

      // Create channel
      this.channel = await this.connection.createChannel()

      this.channel.on('error', (error) => {
        console.error('RabbitMQ Consumer: Channel error', { error: error.message })
      })

      // Set prefetch count (process 1 message at a time)
      await this.channel.prefetch(1)

      // Declare exchange (topic)
      await this.channel.assertExchange(this.exchangeName, 'topic', {
        durable: true,
      })

      // Declare Dead Letter Queue (DLQ)
      await this.channel.assertQueue(this.dlqName, {
        durable: true,
      })

      // Declare main queue with DLQ configuration
      await this.channel.assertQueue(this.queueName, {
        durable: true,
        deadLetterExchange: '', // Default exchange
        deadLetterRoutingKey: this.dlqName,
      })

      // Bind queue to exchange with routing keys
      await this.channel.bindQueue(this.queueName, this.exchangeName, 'order.created')
      await this.channel.bindQueue(this.queueName, this.exchangeName, 'order.cancelled')

      this.isConnected = true
      console.log('RabbitMQ Consumer: Connected successfully', {
        exchange: this.exchangeName,
        queue: this.queueName,
        dlq: this.dlqName,
      })
    } catch (error) {
      console.error('RabbitMQ Consumer: Connection failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  }

  /**
   * Starts consuming messages from queue
   */
  async startConsuming(): Promise<void> {
    if (!this.isConnected || !this.channel) {
      throw new Error('RabbitMQ Consumer: Not connected')
    }

    try {
      console.log('RabbitMQ Consumer: Starting to consume messages...', {
        queue: this.queueName,
      })

      await this.channel.consume(
        this.queueName,
        async (msg) => {
          if (msg) {
            await this.handleMessage(msg)
          }
        },
        { noAck: false } // Manual acknowledgment
      )

      console.log('RabbitMQ Consumer: Consuming messages')
    } catch (error) {
      console.error('RabbitMQ Consumer: Failed to start consuming', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  }

  /**
   * Handles incoming message
   * Routes to appropriate handler based on event type
   */
  private async handleMessage(msg: ConsumeMessage): Promise<void> {
    if (!this.channel) return

    const retryCount = this.getRetryCount(msg)
    const correlationId = msg.properties.headers?.['x-correlation-id'] || 'unknown'

    try {
      // Parse message
      const content = msg.content.toString()
      const event: OrderEvent = JSON.parse(content)

      console.log('RabbitMQ Consumer: Message received', {
        eventType: event.eventType,
        correlationId,
        retryCount,
      })

      // Route to handler
      switch (event.eventType) {
        case 'order.created':
          await this.handleOrderCreated(event as OrderCreatedEvent)
          break
        case 'order.cancelled':
          await this.handleOrderCancelled(event as OrderCancelledEvent)
          break
        default:
          console.log('RabbitMQ Consumer: Unknown event type, skipping', {
            eventType: event.eventType,
          })
      }

      // Acknowledge message (success)
      this.channel.ack(msg)
      console.log('RabbitMQ Consumer: Message processed successfully', {
        eventType: event.eventType,
        correlationId,
      })
    } catch (error) {
      console.error('RabbitMQ Consumer: Message processing failed', {
        correlationId,
        retryCount,
        error: error instanceof Error ? error.message : 'Unknown error',
      })

      // Retry logic
      if (retryCount < this.maxRetries) {
        // Nack and requeue with delay
        this.channel.nack(msg, false, false) // Don't requeue immediately
        console.log('RabbitMQ Consumer: Message nacked, will retry', {
          correlationId,
          retryCount: retryCount + 1,
          maxRetries: this.maxRetries,
        })
      } else {
        // Max retries exceeded → send to DLQ
        this.channel.nack(msg, false, false) // Send to DLQ
        console.error('RabbitMQ Consumer: Max retries exceeded, sent to DLQ', {
          correlationId,
          retryCount,
        })
      }
    }
  }

  /**
   * Handles order.created event
   * Automatically initiates payment for new order
   */
  private async handleOrderCreated(event: OrderCreatedEvent): Promise<void> {
    console.log('RabbitMQ Consumer: Handling order.created', {
      orderId: event.orderId,
      userId: event.userId,
      totalAmount: event.totalAmount,
    })

    // Check if payment already initiated (idempotency)
    const existingPayments = await this.getPaymentsByOrderUseCase.execute(
      event.orderId,
      event.userId,
      true // Admin mode to bypass RBAC
    )

    if (existingPayments.length > 0) {
      console.log('RabbitMQ Consumer: Payment already exists for order, skipping', {
        orderId: event.orderId,
        paymentCount: existingPayments.length,
      })
      return
    }

    // Initiate payment
    await this.initiatePaymentUseCase.execute({
      orderId: event.orderId,
      userId: event.userId,
      amount: event.totalAmount,
      currency: 'USD', // Default currency (could be from order metadata)
      method: 'credit_card', // Default method (could be from user preference)
      correlationId: event.correlationId,
    })

    console.log('RabbitMQ Consumer: Payment initiated for order', {
      orderId: event.orderId,
    })
  }

  /**
   * Handles order.cancelled event
   * Cancels pending/processing payments for cancelled order
   */
  private async handleOrderCancelled(event: OrderCancelledEvent): Promise<void> {
    console.log('RabbitMQ Consumer: Handling order.cancelled', {
      orderId: event.orderId,
      userId: event.userId,
    })

    // Get all payments for order
    const payments = await this.paymentRepository.findByOrderId(event.orderId)

    if (payments.length === 0) {
      console.log('RabbitMQ Consumer: No payments found for cancelled order', {
        orderId: event.orderId,
      })
      return
    }

    // Cancel pending/processing payments
    let cancelledCount = 0
    for (const payment of payments) {
      if (payment.canBeModified()) {
        payment.cancel('Order cancelled')
        await this.paymentRepository.save(payment)
        cancelledCount++
      }
    }

    console.log('RabbitMQ Consumer: Payments cancelled for order', {
      orderId: event.orderId,
      totalPayments: payments.length,
      cancelledCount,
    })
  }

  /**
   * Gets retry count from message headers
   */
  private getRetryCount(msg: ConsumeMessage): number {
    return msg.properties.headers?.['x-retry-count'] || 0
  }

  /**
   * Closes channel and connection gracefully
   */
  async close(): Promise<void> {
    try {
      console.log('RabbitMQ Consumer: Closing...')

      if (this.channel) {
        await this.channel.close()
        this.channel = null
      }

      if (this.connection) {
        await this.connection.close()
        this.connection = null
      }

      this.isConnected = false
      console.log('RabbitMQ Consumer: Closed successfully')
    } catch (error) {
      console.error('RabbitMQ Consumer: Close failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }
}
