import amqp, { Connection, Channel } from 'amqplib';
import { EventPublisher } from '@/application/interfaces/event-publisher-interface';
import { DomainEvent } from '@/application/interfaces/event-publisher';
import { logger } from '@/infrastructure/observability/logger';

/**
 * RabbitMQ Event Publisher
 * 
 * Architecture: Infrastructure Layer - Messaging
 * Publishes domain events to RabbitMQ exchange
 */
export class RabbitMQEventPublisher implements EventPublisher {
  private connection: Connection | null = null;
  private channel: Channel | null = null;
  private readonly url: string;
  private readonly exchange: string;
  private readonly exchangeType: string;

  constructor(
    url: string,
    exchange: string = 'ecommerce.events',
    exchangeType: string = 'topic',
  ) {
    this.url = url;
    this.exchange = exchange;
    this.exchangeType = exchangeType;
  }

  /**
   * Connect to RabbitMQ
   */
  async connect(): Promise<void> {
    try {
      logger.info('Connecting to RabbitMQ...', { url: this.url });

      this.connection = await amqp.connect(this.url);
      this.channel = await this.connection.createChannel();

      // Declare exchange (idempotent)
      await this.channel.assertExchange(this.exchange, this.exchangeType, {
        durable: true,
      });

      // Handle connection events
      this.connection.on('error', (error) => {
        logger.error('RabbitMQ connection error', { error: error.message });
      });

      this.connection.on('close', () => {
        logger.warn('RabbitMQ connection closed');
      });

      logger.info('RabbitMQ publisher connected successfully', {
        exchange: this.exchange,
      });
    } catch (error) {
      logger.error('Failed to connect to RabbitMQ', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Publish domain event
   */
  async publish(event: DomainEvent): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized. Call connect() first.');
    }

    try {
      const routingKey = event.eventType; // e.g., 'order.created'
      const message = JSON.stringify(event);

      const published = this.channel.publish(
        this.exchange,
        routingKey,
        Buffer.from(message),
        {
          persistent: true, // Message survives broker restart
          contentType: 'application/json',
          timestamp: Date.now(),
          messageId: event.eventId,
          correlationId: event.correlationId,
        },
      );

      if (!published) {
        throw new Error('Failed to publish message to RabbitMQ');
      }

      logger.info('Event published to RabbitMQ', {
        eventType: event.eventType,
        eventId: event.eventId,
        correlationId: event.correlationId,
        routingKey,
      });
    } catch (error) {
      logger.error('Failed to publish event to RabbitMQ', {
        eventType: event.eventType,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Close connection
   */
  async close(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }

      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }

      logger.info('RabbitMQ publisher closed successfully');
    } catch (error) {
      logger.error('Failed to close RabbitMQ publisher', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}
