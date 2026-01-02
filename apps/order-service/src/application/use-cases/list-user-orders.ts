import { Order } from '@/domain/entities/order';
import { OrderItem } from '@/domain/entities/order-item';
import { OrderRepository } from '@/domain/repositories/order-repository';
import {
  OrderListResponseDto,
  OrderResponseDto,
  OrderItemResponseDto,
} from '../dtos/order-dto';

/**
 * List User Orders Use Case
 * 
 * Architecture: Clean Architecture - Application Layer
 * 
 * Business flow:
 * 1. Validate userId and pagination params
 * 2. Retrieve orders for user from repository (paginated)
 * 3. Convert to DTOs
 * 4. Return paginated response
 */
export class ListUserOrdersUseCase {
  constructor(private readonly orderRepository: OrderRepository) {}

  async execute(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<OrderListResponseDto> {
    // 1. Validate input
    if (!userId || userId.trim() === '') {
      throw new Error('ListUserOrders: userId is required');
    }

    if (page < 1) {
      throw new Error('ListUserOrders: page must be >= 1');
    }

    if (limit < 1 || limit > 100) {
      throw new Error('ListUserOrders: limit must be between 1 and 100');
    }

    // 2. Retrieve orders
    const { orders, total } = await this.orderRepository.findByUserId(
      userId,
      page,
      limit,
    );

    // 3. Convert to DTOs
    const orderDtos = orders.map((order) => this.toDto(order));

    // 4. Return paginated response
    return {
      orders: orderDtos,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
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
