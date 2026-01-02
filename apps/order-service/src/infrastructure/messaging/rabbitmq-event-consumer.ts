import amqp, { Connection, Channel, ConsumeMessage } from 'amqplib';
import { OrderRepository } from '@/domain/repositories/order-repository';
import { OrderHistoryRepository } from '@/domain/repositories/order-history-repository';
import {
  PaymentSucceededEvent,
  PaymentFailedEvent,
} from '@/application/interfaces/event-publisher';
import { OrderStatus } from '@/domain/entities/order-status';
import { OrderHistory } from '@/domain/entities/order-history';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/infrastructure/observability/logger';

/**
 * RabbitMQ Event Consumer
 * 
 * Architecture: Infrastructure Layer - Messaging
 * Consumes payment events from RabbitMQ and updates order status
 * Implements DLQ (Dead Letter Queue) and retry logic
 */
export class RabbitMQEventConsumer {
  private connection: Connection | null = null;
  private channel: Channel | null = null;
  private readonly url: string;
  private readonly exchange: string;
  private readonly queueName: string;
  private readonly dlqName: string;
  private readonly maxRetries: number;

  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly historyRepository: OrderHistoryRepository,
    url: string,
    exchange: string = 'ecommerce.events',
    queueName: string = 'order.payment-events',
    dlqName: string = 'order.payment-events.dlq',
    maxRetries: number = 3,
  ) {
    this.url = url;
    this.exchange = exchange;
    this.queueName = queueName;
    this.dlqName = dlqName;
    this.maxRetries = maxRetries;
  }

  /**
   * Connect to RabbitMQ and start consuming
   */
  async connect(): Promise<void> {
    try {
      logger.info('Connecting RabbitMQ consumer...', { url: this.url });

      this.connection = await amqp.connect(this.url);
      this.channel = await this.connection.createChannel();

      // Declare exchange
      await this.channel.assertExchange(this.exchange, 'topic', {
        durable: true,
      });

      // Declare DLQ (Dead Letter Queue)
      await this.channel.assertQueue(this.dlqName, {
        durable: true,
      });

      // Declare main queue with DLQ configuration
      await this.channel.assertQueue(this.queueName, {
        durable: true,
        deadLetterExchange: '',
        deadLetterRoutingKey: this.dlqName,
      });

      // Bind queue to exchange with routing keys for payment events
      await this.channel.bindQueue(
        this.queueName,
        this.exchange,
        'payment.succeeded',
      );
      await this.channel.bindQueue(
        this.queueName,
        this.exchange,
        'payment.failed',
      );

      // Set prefetch to 1 for fair dispatch
      await this.channel.prefetch(1);

      // Start consuming
      await this.channel.consume(
        this.queueName,
        (msg) => this.handleMessage(msg),
        { noAck: false }, // Manual acknowledgment
      );

      logger.info('RabbitMQ consumer started successfully', {
        queue: this.queueName,
        bindings: ['payment.succeeded', 'payment.failed'],
      });

      // Handle connection events
      this.connection.on('error', (error) => {
        logger.error('RabbitMQ consumer connection error', {
          error: error.message,
        });
      });

      this.connection.on('close', () => {
        logger.warn('RabbitMQ consumer connection closed');
      });
    } catch (error) {
      logger.error('Failed to connect RabbitMQ consumer', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Handle incoming message
   */
  private async handleMessage(msg: ConsumeMessage | null): Promise<void> {
    if (!msg || !this.channel) {
      return;
    }

    try {
      const content = msg.content.toString();
      const event = JSON.parse(content);
      const retryCount = this.getRetryCount(msg);

      logger.info('Received payment event', {
        eventType: event.eventType,
        eventId: event.eventId,
        orderId: event.payload?.orderId,
        retryCount,
      });

      // Process event based on type
      if (event.eventType === 'payment.succeeded') {
        await this.handlePaymentSucceeded(event as PaymentSucceededEvent);
      } else if (event.eventType === 'payment.failed') {
        await this.handlePaymentFailed(event as PaymentFailedEvent);
      } else {
        logger.warn('Unknown event type', { eventType: event.eventType });
      }

      // Acknowledge message (success)
      this.channel.ack(msg);

      logger.info('Payment event processed successfully', {
        eventType: event.eventType,
        eventId: event.eventId,
      });
    } catch (error) {
      logger.error('Failed to process payment event', {
        error: error instanceof Error ? error.message : 'Unknown error',
        messageId: msg.properties.messageId,
      });

      // Retry logic
      await this.handleFailure(msg, error as Error);
    }
  }

  /**
   * Handle payment.succeeded event
   */
  private async handlePaymentSucceeded(
    event: PaymentSucceededEvent,
  ): Promise<void> {
    const { orderId, paymentId } = event.payload;

    // Find order
    const order = await this.orderRepository.findById(orderId);

    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    // Update order status to PAID
    const updatedOrder = order.markPaid(paymentId);
    await this.orderRepository.save(updatedOrder);

    // Record history
    const historyEntry = OrderHistory.create(
      uuidv4(),
      orderId,
      order.status,
      OrderStatus.PAID,
      'system',
      'Payment succeeded',
      { paymentId, eventId: event.eventId },
    );

    await this.historyRepository.save(historyEntry);

    logger.info('Order marked as paid', {
      orderId,
      paymentId,
      eventId: event.eventId,
    });
  }

  /**
   * Handle payment.failed event
   */
  private async handlePaymentFailed(event: PaymentFailedEvent): Promise<void> {
    const { orderId, reason } = event.payload;

    // Find order
    const order = await this.orderRepository.findById(orderId);

    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    // Cancel order
    const updatedOrder = order.cancel();
    await this.orderRepository.save(updatedOrder);

    // Record history
    const historyEntry = OrderHistory.create(
      uuidv4(),
      orderId,
      order.status,
      OrderStatus.CANCELLED,
      'system',
      `Payment failed: ${reason}`,
      { eventId: event.eventId },
    );

    await this.historyRepository.save(historyEntry);

    logger.info('Order cancelled due to payment failure', {
      orderId,
      reason,
      eventId: event.eventId,
    });
  }

  /**
   * Get retry count from message headers
   */
  private getRetryCount(msg: ConsumeMessage): number {
    const headers = msg.properties.headers || {};
    return (headers['x-retry-count'] as number) || 0;
  }

  /**
   * Handle message failure with retry logic
   */
  private async handleFailure(msg: ConsumeMessage, error: Error): Promise<void> {
    if (!this.channel) {
      return;
    }

    const retryCount = this.getRetryCount(msg);

    if (retryCount < this.maxRetries) {
      // Retry: Nack and requeue
      logger.info('Retrying message', {
        messageId: msg.properties.messageId,
        retryCount: retryCount + 1,
        maxRetries: this.maxRetries,
      });

      // Update retry count in headers
      const headers = msg.properties.headers || {};
      headers['x-retry-count'] = retryCount + 1;

      // Republish with updated headers
      this.channel.publish(
        '',
        this.queueName,
        msg.content,
        {
          ...msg.properties,
          headers,
        },
      );

      // Ack original message
      this.channel.ack(msg);
    } else {
      // Max retries exceeded: Send to DLQ
      logger.error('Max retries exceeded, sending to DLQ', {
        messageId: msg.properties.messageId,
        retryCount,
        error: error.message,
      });

      // Nack without requeue (goes to DLQ)
      this.channel.nack(msg, false, false);
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

      logger.info('RabbitMQ consumer closed successfully');
    } catch (error) {
      logger.error('Failed to close RabbitMQ consumer', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}
