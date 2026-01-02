import amqp, { Channel, Connection, Options } from 'amqplib'
import { EventPublisher } from '@/application/interfaces/event-publisher-interface'
import { DomainEvent, PaymentEvent } from '@/application/interfaces/event-publisher'

/**
 * RabbitMQ Event Publisher
 * 
 * Architecture: Clean Architecture - Infrastructure Layer (Messaging)
 * 
 * Publishes domain events to RabbitMQ exchange
 * 
 * Published Events:
 * - payment.succeeded - Payment processed successfully (consumed by order-service, notification-service)
 * - payment.failed - Payment failed (consumed by order-service, notification-service)
 * - payment.cancelled - Payment cancelled (consumed by order-service, notification-service)
 * 
 * Exchange: payment-events (topic exchange)
 * Routing Keys:
 * - payment.succeeded
 * - payment.failed
 * - payment.cancelled
 * 
 * Message Format: JSON
 * Durability: Messages persisted to disk
 * Delivery Mode: 2 (persistent)
 */

export class RabbitMQEventPublisher implements EventPublisher {
  private connection: Connection | null = null
  private channel: Channel | null = null
  private readonly exchangeName = 'payment-events'
  private readonly exchangeType = 'topic'
  private isConnected = false

  constructor(private readonly rabbitmqUrl: string) {}

  /**
   * Initializes RabbitMQ connection and channel
   * Creates exchange if not exists
   */
  async connect(): Promise<void> {
    try {
      console.log('RabbitMQ Publisher: Connecting...', {
        url: this.rabbitmqUrl.replace(/:[^:@]+@/, ':****@'), // Hide password in logs
      })

      // Create connection
      this.connection = await amqp.connect(this.rabbitmqUrl)

      // Handle connection errors
      this.connection.on('error', (error) => {
        console.error('RabbitMQ Publisher: Connection error', { error: error.message })
        this.isConnected = false
      })

      this.connection.on('close', () => {
        console.log('RabbitMQ Publisher: Connection closed')
        this.isConnected = false
      })

      // Create channel
      this.channel = await this.connection.createChannel()

      // Handle channel errors
      this.channel.on('error', (error) => {
        console.error('RabbitMQ Publisher: Channel error', { error: error.message })
      })

      this.channel.on('close', () => {
        console.log('RabbitMQ Publisher: Channel closed')
      })

      // Declare exchange (idempotent - creates if not exists)
      await this.channel.assertExchange(this.exchangeName, this.exchangeType, {
        durable: true, // Survives broker restart
      })

      this.isConnected = true
      console.log('RabbitMQ Publisher: Connected successfully', {
        exchange: this.exchangeName,
        type: this.exchangeType,
      })
    } catch (error) {
      console.error('RabbitMQ Publisher: Connection failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  }

  /**
   * Publishes domain event to RabbitMQ
   * 
   * @param event - Domain event to publish
   * @throws Error if not connected or publish fails
   */
  async publish(event: PaymentEvent): Promise<void> {
    if (!this.isConnected || !this.channel) {
      throw new Error('RabbitMQ Publisher: Not connected')
    }

    try {
      const routingKey = event.eventType
      const message = JSON.stringify(event)

      const publishOptions: Options.Publish = {
        persistent: true, // Persist message to disk
        contentType: 'application/json',
        timestamp: Date.now(),
        messageId: event.correlationId || undefined,
        headers: {
          'x-correlation-id': event.correlationId || '',
          'x-event-type': event.eventType,
        },
      }

      // Publish to exchange with routing key
      const published = this.channel.publish(
        this.exchangeName,
        routingKey,
        Buffer.from(message),
        publishOptions
      )

      if (!published) {
        throw new Error('Channel buffer full - message not sent')
      }

      console.log('RabbitMQ Publisher: Event published', {
        eventType: event.eventType,
        correlationId: event.correlationId,
        routingKey,
        paymentId: 'paymentId' in event ? event.paymentId : undefined,
        orderId: 'orderId' in event ? event.orderId : undefined,
      })
    } catch (error) {
      console.error('RabbitMQ Publisher: Publish failed', {
        eventType: event.eventType,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  }

  /**
   * Closes channel and connection gracefully
   */
  async close(): Promise<void> {
    try {
      console.log('RabbitMQ Publisher: Closing...')

      if (this.channel) {
        await this.channel.close()
        this.channel = null
      }

      if (this.connection) {
        await this.connection.close()
        this.connection = null
      }

      this.isConnected = false
      console.log('RabbitMQ Publisher: Closed successfully')
    } catch (error) {
      console.error('RabbitMQ Publisher: Close failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      // Don't throw - allow graceful shutdown
    }
  }

  /**
   * Returns connection status
   */
  getConnectionStatus(): boolean {
    return this.isConnected
  }
}
