/**
 * DTO for creating an order item
 */
export interface CreateOrderItemDto {
  productId: string;
  productName: string;
  quantity: number;
  priceSnapshot: number;
}

/**
 * DTO for creating a new order
 */
export interface CreateOrderDto {
  userId: string;
  items: CreateOrderItemDto[];
  correlationId?: string;
}

/**
 * DTO for updating order status
 */
export interface UpdateOrderStatusDto {
  newStatus: string;
  paymentReference?: string;
  reason?: string;
}

/**
 * DTO for order item response
 */
export interface OrderItemResponseDto {
  productId: string;
  productName: string;
  quantity: number;
  priceSnapshot: number;
  subtotal: number;
}

/**
 * DTO for order response
 */
export interface OrderResponseDto {
  id: string;
  userId: string;
  items: OrderItemResponseDto[];
  status: string;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  correlationId?: string;
  paymentReference?: string;
}

/**
 * DTO for paginated order list response
 */
export interface OrderListResponseDto {
  orders: OrderResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * DTO for order history entry response
 */
export interface OrderHistoryResponseDto {
  id: string;
  orderId: string;
  oldStatus: string;
  newStatus: string;
  changedAt: string;
  changedBy: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}
