import { Order } from '@/domain/entities/order';
import { OrderItem } from '@/domain/entities/order-item';
import { OrderRepository } from '@/domain/repositories/order-repository';
import { OrderResponseDto, OrderItemResponseDto } from '../dtos/order-dto';

/**
 * Get Order By ID Use Case
 * 
 * Architecture: Clean Architecture - Application Layer
 * 
 * Business flow:
 * 1. Validate orderId
 * 2. Retrieve order from repository
 * 3. Validate ownership (users can only see their own orders, admins can see all)
 * 4. Return order DTO
 */
export class GetOrderUseCase {
  constructor(private readonly orderRepository: OrderRepository) {}

  async execute(
    orderId: string,
    requestingUserId: string,
    isAdmin: boolean,
  ): Promise<OrderResponseDto> {
    // 1. Validate orderId
    if (!orderId || orderId.trim() === '') {
      throw new Error('GetOrder: orderId is required');
    }

    if (!requestingUserId || requestingUserId.trim() === '') {
      throw new Error('GetOrder: requestingUserId is required');
    }

    // 2. Retrieve order
    const order = await this.orderRepository.findById(orderId);

    if (!order) {
      throw new Error('Order not found');
    }

    // 3. Validate ownership (RBAC)
    if (!isAdmin && order.userId !== requestingUserId) {
      throw new Error('Forbidden: you can only view your own orders');
    }

    // 4. Return DTO
    return this.toDto(order);
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
