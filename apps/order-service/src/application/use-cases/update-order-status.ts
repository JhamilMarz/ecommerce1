import { v4 as uuidv4 } from 'uuid';
import { Order } from '@/domain/entities/order';
import { OrderItem } from '@/domain/entities/order-item';
import { OrderHistory } from '@/domain/entities/order-history';
import { OrderStatus } from '@/domain/entities/order-status';
import { OrderRepository } from '@/domain/repositories/order-repository';
import { OrderHistoryRepository } from '@/domain/repositories/order-history-repository';
import { EventPublisher } from '../interfaces/event-publisher-interface';
import {
  OrderPaidEvent,
  OrderCancelledEvent,
} from '../interfaces/event-publisher';
import {
  UpdateOrderStatusDto,
  OrderResponseDto,
  OrderItemResponseDto,
} from '../dtos/order-dto';

/**
 * Update Order Status Use Case
 * 
 * Architecture: Clean Architecture - Application Layer
 * 
 * Business flow:
 * 1. Validate input
 * 2. Retrieve order
 * 3. Change status (validates state machine)
 * 4. Save updated order
 * 5. Record history entry
 * 6. Publish domain event (if applicable: order.paid, order.cancelled)
 * 7. Return updated order DTO
 */
export class UpdateOrderStatusUseCase {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly historyRepository: OrderHistoryRepository,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(
    orderId: string,
    dto: UpdateOrderStatusDto,
    requestingUserId: string,
    isAdmin: boolean,
  ): Promise<OrderResponseDto> {
    // 1. Validate input
    this.validateInput(orderId, dto);

    // 2. Retrieve order
    const order = await this.orderRepository.findById(orderId);

    if (!order) {
      throw new Error('Order not found');
    }

    // 3. Validate permissions (only admin can change status)
    if (!isAdmin) {
      throw new Error('Forbidden: only admins can update order status');
    }

    // 4. Parse and validate new status
    const newStatus = this.parseStatus(dto.newStatus);
    const oldStatus = order.status;

    // 5. Change status (domain validates state machine)
    let updatedOrder: Order;

    try {
      if (newStatus === OrderStatus.PAID) {
        if (!dto.paymentReference) {
          throw new Error('paymentReference is required when marking order as paid');
        }
        updatedOrder = order.markPaid(dto.paymentReference);
      } else if (newStatus === OrderStatus.CANCELLED) {
        updatedOrder = order.cancel();
      } else {
        updatedOrder = order.changeStatus(newStatus, dto.paymentReference);
      }
    } catch (error) {
      throw new Error(
        `Failed to change order status: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }

    // 6. Save updated order
    const savedOrder = await this.orderRepository.save(updatedOrder);

    // 7. Record history entry
    const historyEntry = OrderHistory.create(
      uuidv4(),
      orderId,
      oldStatus,
      newStatus,
      requestingUserId,
      dto.reason,
      { paymentReference: dto.paymentReference },
    );

    await this.historyRepository.save(historyEntry);

    // 8. Publish domain events
    await this.publishEvents(savedOrder, oldStatus, newStatus);

    // 9. Return DTO
    return this.toDto(savedOrder);
  }

  private validateInput(orderId: string, dto: UpdateOrderStatusDto): void {
    if (!orderId || orderId.trim() === '') {
      throw new Error('UpdateOrderStatus: orderId is required');
    }

    if (!dto.newStatus || dto.newStatus.trim() === '') {
      throw new Error('UpdateOrderStatus: newStatus is required');
    }
  }

  private parseStatus(statusString: string): OrderStatus {
    const status = Object.values(OrderStatus).find((s) => s === statusString);

    if (!status) {
      throw new Error(`Invalid status: ${statusString}`);
    }

    return status;
  }

  private async publishEvents(
    order: Order,
    oldStatus: OrderStatus,
    newStatus: OrderStatus,
  ): Promise<void> {
    // Publish order.paid event
    if (newStatus === OrderStatus.PAID && oldStatus !== OrderStatus.PAID) {
      const event: OrderPaidEvent = {
        eventType: 'order.paid',
        eventId: uuidv4(),
        timestamp: new Date(),
        correlationId: order.correlationId,
        payload: {
          orderId: order.id,
          userId: order.userId,
          paymentReference: order.paymentReference!,
          totalAmount: order.calculateTotal(),
        },
      };

      await this.eventPublisher.publish(event);
    }

    // Publish order.cancelled event
    if (
      newStatus === OrderStatus.CANCELLED &&
      oldStatus !== OrderStatus.CANCELLED
    ) {
      const event: OrderCancelledEvent = {
        eventType: 'order.cancelled',
        eventId: uuidv4(),
        timestamp: new Date(),
        correlationId: order.correlationId,
        payload: {
          orderId: order.id,
          userId: order.userId,
          reason: 'Order cancelled by admin',
        },
      };

      await this.eventPublisher.publish(event);
    }
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
