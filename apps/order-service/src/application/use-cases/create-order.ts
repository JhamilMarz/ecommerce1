import { v4 as uuidv4 } from 'uuid';
import { Order } from '@/domain/entities/order';
import { OrderItem } from '@/domain/entities/order-item';
import { OrderHistory } from '@/domain/entities/order-history';
import { OrderStatus } from '@/domain/entities/order-status';
import { OrderRepository } from '@/domain/repositories/order-repository';
import { OrderHistoryRepository } from '@/domain/repositories/order-history-repository';
import { EventPublisher } from '../interfaces/event-publisher-interface';
import { OrderCreatedEvent } from '../interfaces/event-publisher';
import {
  CreateOrderDto,
  OrderResponseDto,
  OrderItemResponseDto,
} from '../dtos/order-dto';

/**
 * Create Order Use Case
 * 
 * Architecture: Clean Architecture - Application Layer
 * 
 * Business flow:
 * 1. Validate input
 * 2. Create Order entity (aggregate root)
 * 3. Save order to database
 * 4. Record initial history entry (pending)
 * 5. Publish order.created event to RabbitMQ
 * 6. Return order DTO
 */
export class CreateOrderUseCase {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly historyRepository: OrderHistoryRepository,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(dto: CreateOrderDto): Promise<OrderResponseDto> {
    // 1. Validate input
    this.validateInput(dto);

    // 2. Create OrderItem entities
    const orderItems = dto.items.map(
      (item) =>
        new OrderItem(
          item.productId,
          item.productName,
          item.quantity,
          item.priceSnapshot,
        ),
    );

    // 3. Create Order entity (aggregate root)
    const orderId = uuidv4();
    const order = Order.create(
      orderId,
      dto.userId,
      orderItems,
      dto.correlationId,
    );

    // 4. Save order
    const savedOrder = await this.orderRepository.save(order);

    // 5. Record initial history entry
    const historyEntry = OrderHistory.create(
      uuidv4(),
      orderId,
      OrderStatus.PENDING, // oldStatus (same as newStatus for initial entry)
      OrderStatus.PENDING, // newStatus
      dto.userId,
      'Order created',
      { correlationId: dto.correlationId },
    );

    await this.historyRepository.save(historyEntry);

    // 6. Publish domain event
    const event: OrderCreatedEvent = {
      eventType: 'order.created',
      eventId: uuidv4(),
      timestamp: new Date(),
      correlationId: dto.correlationId,
      payload: {
        orderId: savedOrder.id,
        userId: savedOrder.userId,
        items: savedOrder.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          priceSnapshot: item.priceSnapshot,
        })),
        totalAmount: savedOrder.calculateTotal(),
        status: savedOrder.status,
      },
    };

    await this.eventPublisher.publish(event);

    // 7. Return DTO
    return this.toDto(savedOrder);
  }

  private validateInput(dto: CreateOrderDto): void {
    if (!dto.userId || dto.userId.trim() === '') {
      throw new Error('CreateOrder: userId is required');
    }

    if (!dto.items || dto.items.length === 0) {
      throw new Error('CreateOrder: items array cannot be empty');
    }

    dto.items.forEach((item, index) => {
      if (!item.productId || item.productId.trim() === '') {
        throw new Error(`CreateOrder: item[${index}].productId is required`);
      }

      if (!item.productName || item.productName.trim() === '') {
        throw new Error(`CreateOrder: item[${index}].productName is required`);
      }

      if (item.quantity <= 0) {
        throw new Error(
          `CreateOrder: item[${index}].quantity must be greater than 0`,
        );
      }

      if (item.priceSnapshot < 0) {
        throw new Error(
          `CreateOrder: item[${index}].priceSnapshot cannot be negative`,
        );
      }
    });
  }

  private toDto(order: Order): OrderResponseDto {
    return {
      id: order.id,
      userId: order.userId,
      items: order.items.map((item) => this.itemToDto(item)),
      status: order.status,
      totalAmount: order.calculateTotal(),
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      correlationId: order.correlationId,
      paymentReference: order.paymentReference,
    };
  }

  private itemToDto(item: OrderItem): OrderItemResponseDto {
    return {
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      priceSnapshot: item.priceSnapshot,
      subtotal: item.calculateSubtotal(),
    };
  }
}
