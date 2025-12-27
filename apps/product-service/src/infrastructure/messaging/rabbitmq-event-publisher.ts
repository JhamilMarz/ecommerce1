import amqp, { Channel, Connection } from 'amqplib';
import { config } from '../config/config';
import { logger } from '../logger/logger';
import { DomainEvent, EventPublisher } from '../../application/interfaces/event-publisher';

export class RabbitMQEventPublisher implements EventPublisher {
  private connection?: Connection;
  private channel?: Channel;
  private isConnected = false;

  async connect(): Promise<void> {
    try {
      this.connection = await amqp.connect(config.rabbitmq.url);
      this.channel = await this.connection.createChannel();

      // Assert exchange
      await this.channel.assertExchange(config.rabbitmq.exchange, config.rabbitmq.exchangeType, {
        durable: true,
      });

      // Assert DLQ
      await this.channel.assertQueue(config.rabbitmq.queues.dlq, {
        durable: true,
      });

      // Assert product events queue with DLX
      await this.channel.assertQueue(config.rabbitmq.queues.productEvents, {
        durable: true,
        deadLetterExchange: '',
        deadLetterRoutingKey: config.rabbitmq.queues.dlq,
      });

      await this.channel.bindQueue(
        config.rabbitmq.queues.productEvents,
        config.rabbitmq.exchange,
        'product.*',
      );

      this.isConnected = true;
      logger.info('RabbitMQ connection established (publisher)');

      this.connection.on('error', (err) => {
        logger.error('RabbitMQ connection error:', err);
        this.isConnected = false;
      });

      this.connection.on('close', () => {
        logger.warn('RabbitMQ connection closed');
        this.isConnected = false;
      });
    } catch (error) {
      logger.error('Failed to connect to RabbitMQ:', error);
      throw error;
    }
  }

  async publish(event: DomainEvent): Promise<void> {
    if (!this.isConnected || !this.channel) {
      throw new Error('RabbitMQ not connected');
    }

    try {
      const routingKey = event.eventType;
      const message = JSON.stringify({
        ...event,
        occurredOn: event.occurredOn.toISOString(),
      });

      const published = this.channel.publish(config.rabbitmq.exchange, routingKey, Buffer.from(message), {
        persistent: true,
        contentType: 'application/json',
        correlationId: event.correlationId,
        timestamp: Date.now(),
      });

      if (!published) {
        throw new Error('Failed to publish message');
      }

      logger.info(`Event published: ${event.eventType}`, {
        aggregateId: event.aggregateId,
        correlationId: event.correlationId,
      });
    } catch (error) {
      logger.error('Failed to publish event:', error);
      throw error;
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
      this.isConnected = false;
      logger.info('RabbitMQ connection closed (publisher)');
    } catch (error) {
      logger.error('Error closing RabbitMQ connection:', error);
      throw error;
    }
  }
}
