import amqp, { Channel, Connection, ConsumeMessage } from 'amqplib';
import { config } from '../config/config';
import { logger } from '../logger/logger';
import { InventoryRepository } from '../../domain/repositories/inventory-repository';

interface InventoryUpdatedEvent {
  eventType: string;
  aggregateId: string;
  occurredOn: string;
  correlationId?: string;
  payload: {
    productId: string;
    quantity: number;
    operation: 'increment' | 'decrement' | 'set';
  };
}

export class RabbitMQEventConsumer {
  private connection?: Connection;
  private channel?: Channel;
  private isConnected = false;

  constructor(private inventoryRepository: InventoryRepository) {}

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

      // Assert inventory updates queue with DLX
      await this.channel.assertQueue(config.rabbitmq.queues.inventoryUpdates, {
        durable: true,
        deadLetterExchange: '',
        deadLetterRoutingKey: config.rabbitmq.queues.dlq,
      });

      await this.channel.bindQueue(
        config.rabbitmq.queues.inventoryUpdates,
        config.rabbitmq.exchange,
        'inventory.updated',
      );

      this.isConnected = true;
      logger.info('RabbitMQ connection established (consumer)');

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

  async startConsuming(): Promise<void> {
    if (!this.isConnected || !this.channel) {
      throw new Error('RabbitMQ not connected');
    }

    await this.channel.prefetch(1);

    await this.channel.consume(
      config.rabbitmq.queues.inventoryUpdates,
      async (msg) => {
        if (!msg) return;

        try {
          await this.handleMessage(msg);
          this.channel!.ack(msg);
        } catch (error) {
          logger.error('Error processing message:', error);
          
          const retryCount = (msg.properties.headers?.['x-retry-count'] || 0) + 1;
          const maxRetries = 3;

          if (retryCount < maxRetries) {
            logger.info(`Retrying message (attempt ${retryCount}/${maxRetries})`);
            this.channel!.nack(msg, false, true);
          } else {
            logger.error('Max retries reached, sending to DLQ');
            this.channel!.nack(msg, false, false);
          }
        }
      },
      { noAck: false },
    );

    logger.info('Started consuming inventory updates');
  }

  private async handleMessage(msg: ConsumeMessage): Promise<void> {
    const content = msg.content.toString();
    const event: InventoryUpdatedEvent = JSON.parse(content);

    logger.info(`Processing event: ${event.eventType}`, {
      aggregateId: event.aggregateId,
      correlationId: event.correlationId,
    });

    const inventory = await this.inventoryRepository.findByProductId(event.payload.productId);
    if (!inventory) {
      logger.warn(`Inventory not found for product ${event.payload.productId}`);
      return;
    }

    switch (event.payload.operation) {
      case 'increment':
        inventory.incrementStock(event.payload.quantity);
        break;
      case 'decrement':
        inventory.decrementStock(event.payload.quantity);
        break;
      case 'set':
        // For set operation, we need to calculate the difference
        const diff = event.payload.quantity - inventory.quantity;
        if (diff > 0) {
          inventory.incrementStock(diff);
        } else if (diff < 0) {
          inventory.decrementStock(Math.abs(diff));
        }
        break;
    }

    await this.inventoryRepository.update(inventory);
    logger.info(`Inventory updated for product ${event.payload.productId}`);
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
      logger.info('RabbitMQ connection closed (consumer)');
    } catch (error) {
      logger.error('Error closing RabbitMQ connection:', error);
      throw error;
    }
  }
}
