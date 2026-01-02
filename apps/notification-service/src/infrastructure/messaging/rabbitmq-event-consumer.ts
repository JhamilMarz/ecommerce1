import amqp, { Channel, Connection, ConsumeMessage } from 'amqplib'
import { SendNotificationUseCase } from '../../application'
import { EventHandlers } from './event-handlers'

/**
 * RabbitMQ Event Consumer
 *
 * Consumes events from other microservices and triggers notifications.
 *
 * Events consumed:
 * - user.created (from auth-service)
 * - order.created (from order-service)
 * - order.paid (from order-service)
 * - order.cancelled (from order-service)
 * - payment.failed (from payment-service)
 *
 * @remarks
 * - Queue: notification-service-events
 * - DLQ: notification-service-events-dlq
 * - Max 3 retry attempts
 * - Manual acknowledgment
 * - Idempotency through correlationId
 */
export class RabbitMQEventConsumer {
  private connection: Connection | null = null
  private channel: Channel | null = null
  private readonly queueName = 'notification-service-events'
  private readonly dlqName = 'notification-service-events-dlq'
  private readonly exchangeName = 'events'
  private readonly maxRetries = 3

  constructor(
    private readonly rabbitmqUrl: string,
    private readonly eventHandlers: EventHandlers
  ) {}

  /**
   * Connect to RabbitMQ and setup queues
   */
  async connect(): Promise<void> {
    try {
      // Connect
      this.connection = await amqp.connect(this.rabbitmqUrl)
      this.channel = await this.connection.createChannel()

      console.log('✅ Connected to RabbitMQ')

      // Setup DLQ (dead letter queue)
      await this.channel.assertQueue(this.dlqName, {
        durable: true,
      })

      // Setup main queue with DLQ
      await this.channel.assertQueue(this.queueName, {
        durable: true,
        deadLetterExchange: '',
        deadLetterRoutingKey: this.dlqName,
      })

      // Assert exchange (topic)
      await this.channel.assertExchange(this.exchangeName, 'topic', {
        durable: true,
      })

      // Bind queue to exchange for specific event patterns
      const eventPatterns = [
        'user.created',
        'order.created',
        'order.paid',
        'order.cancelled',
        'payment.failed',
      ]

      for (const pattern of eventPatterns) {
        await this.channel.bindQueue(this.queueName, this.exchangeName, pattern)
        console.log(`  📌 Bound queue to pattern: ${pattern}`)
      }

      // Set prefetch (process one message at a time)
      await this.channel.prefetch(1)

      console.log(`✅ Queue '${this.queueName}' ready`)
    } catch (error) {
      console.error('❌ Error connecting to RabbitMQ:', error)
      throw error
    }
  }

  /**
   * Start consuming messages
   */
  async startConsuming(): Promise<void> {
    if (!this.channel) {
      throw new Error('Channel not initialized. Call connect() first.')
    }

    console.log(`🎧 Started consuming from queue: ${this.queueName}`)

    await this.channel.consume(
      this.queueName,
      async (msg) => {
        if (msg) {
          await this.handleMessage(msg)
        }
      },
      { noAck: false } // Manual acknowledgment
    )
  }

  /**
   * Handle incoming message
   */
  private async handleMessage(msg: ConsumeMessage): Promise<void> {
    if (!this.channel) return

    const routingKey = msg.fields.routingKey
    const retryCount = this.getRetryCount(msg)
    const correlationId = msg.properties.correlationId || 'unknown'

    try {
      // Parse message
      const content = msg.content.toString()
      const payload = JSON.parse(content)

      console.log(`📥 Received event: ${routingKey} (retry: ${retryCount}/${this.maxRetries})`)

      // Route to appropriate handler
      await this.routeEvent(routingKey, payload, correlationId)

      // Acknowledge message
      this.channel.ack(msg)
      console.log(`✅ Processed event: ${routingKey}`)
    } catch (error) {
      console.error(`❌ Error processing event ${routingKey}:`, error)

      // Check retry count
      if (retryCount < this.maxRetries) {
        // Nack and requeue with incremented retry count
        const newRetryCount = retryCount + 1
        console.log(`🔄 Retrying event ${routingKey} (${newRetryCount}/${this.maxRetries})`)

        this.channel.nack(msg, false, true) // Requeue
      } else {
        // Max retries exceeded, send to DLQ
        console.error(
          `💀 Max retries exceeded for event ${routingKey}. Sending to DLQ: ${this.dlqName}`
        )
        this.channel.nack(msg, false, false) // Don't requeue (goes to DLQ)
      }
    }
  }

  /**
   * Route event to appropriate handler
   */
  private async routeEvent(
    eventType: string,
    payload: any,
    correlationId: string
  ): Promise<void> {
    switch (eventType) {
      case 'user.created':
        await this.eventHandlers.handleUserCreated(payload, correlationId)
        break

      case 'order.created':
        await this.eventHandlers.handleOrderCreated(payload, correlationId)
        break

      case 'order.paid':
        await this.eventHandlers.handleOrderPaid(payload, correlationId)
        break

      case 'order.cancelled':
        await this.eventHandlers.handleOrderCancelled(payload, correlationId)
        break

      case 'payment.failed':
        await this.eventHandlers.handlePaymentFailed(payload, correlationId)
        break

      default:
        console.warn(`⚠️  Unknown event type: ${eventType}`)
    }
  }

  /**
   * Get retry count from message headers
   */
  private getRetryCount(msg: ConsumeMessage): number {
    const headers = msg.properties.headers || {}
    return headers['x-retry-count'] || 0
  }

  /**
   * Close connection gracefully
   */
  async close(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close()
        console.log('✅ RabbitMQ channel closed')
      }

      if (this.connection) {
        await this.connection.close()
        console.log('✅ RabbitMQ connection closed')
      }
    } catch (error) {
      console.error('❌ Error closing RabbitMQ connection:', error)
      throw error
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): string {
    if (!this.connection) return 'disconnected'
    if (!this.channel) return 'connected (no channel)'
    return 'connected'
  }
}
