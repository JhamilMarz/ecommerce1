import amqp, { Connection, Channel } from 'amqplib';
import { IEventPublisher } from '../../application/interfaces/IEventPublisher';
import { config } from '../config';
import { logger } from '../logger';

/**
 * RabbitMQ Event Publisher
 * Publishes domain events to RabbitMQ exchange
 */
export class RabbitMQEventPublisher implements IEventPublisher {
  private connection: Connection | null = null;
  private channel: Channel | null = null;
  private isConnecting = false;

  async connect(): Promise<void> {
    if (this.connection && this.channel) {
      return;
    }

    if (this.isConnecting) {
      // Wait for ongoing connection attempt
      await this.waitForConnection();
      return;
    }

    this.isConnecting = true;

    try {
      logger.info('Connecting to RabbitMQ...', { url: config.rabbitmq.url });

      this.connection = await amqp.connect(config.rabbitmq.url);
      this.channel = await this.connection.createChannel();

      // Assert exchange
      await this.channel.assertExchange(config.rabbitmq.exchange, 'topic', {
        durable: true,
      });

      logger.info('Connected to RabbitMQ', { exchange: config.rabbitmq.exchange });

      // Handle connection errors
      this.connection.on('error', (err) => {
        logger.error('RabbitMQ connection error:', err);
        this.connection = null;
        this.channel = null;
      });

      this.connection.on('close', () => {
        logger.warn('RabbitMQ connection closed, reconnecting...');
        this.connection = null;
        this.channel = null;
        setTimeout(() => this.connect(), config.rabbitmq.reconnectDelay);
      });
    } catch (error) {
      logger.error('Failed to connect to RabbitMQ:', error);
      this.connection = null;
      this.channel = null;
      // Retry connection
      setTimeout(() => this.connect(), config.rabbitmq.reconnectDelay);
    } finally {
      this.isConnecting = false;
    }
  }

  async publish(exchange: string, routingKey: string, data: unknown): Promise<void> {
    if (!this.channel) {
      await this.connect();
    }

    if (!this.channel) {
      logger.error('Cannot publish: RabbitMQ channel not available');
      return;
    }

    try {
      const message = JSON.stringify(data);
      const published = this.channel.publish(exchange, routingKey, Buffer.from(message), {
        persistent: true,
        contentType: 'application/json',
        timestamp: Date.now(),
      });

      if (!published) {
        logger.warn('Message not published (buffer full), retrying...', {
          exchange,
          routingKey,
        });
        // Wait for drain event
        await new Promise((resolve) => this.channel!.once('drain', resolve));
      }

      logger.debug('Event published', { exchange, routingKey, data });
    } catch (error) {
      logger.error('Failed to publish event:', { error, exchange, routingKey });
    }
  }

  async close(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      logger.info('RabbitMQ connection closed');
    } catch (error) {
      logger.error('Error closing RabbitMQ connection:', error);
    }
  }

  private async waitForConnection(): Promise<void> {
    const maxWaitTime = 10000; // 10 seconds
    const startTime = Date.now();

    while (this.isConnecting && Date.now() - startTime < maxWaitTime) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (!this.connection || !this.channel) {
      throw new Error('Failed to establish RabbitMQ connection');
    }
  }
}
