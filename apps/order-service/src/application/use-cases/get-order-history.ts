import { OrderHistoryRepository } from '@/domain/repositories/order-history-repository';
import { OrderHistoryResponseDto } from '../dtos/order-dto';

/**
 * Get Order History Use Case
 * 
 * Architecture: Clean Architecture - Application Layer
 * 
 * Business flow:
 * 1. Validate orderId
 * 2. Retrieve history entries from repository
 * 3. Convert to DTOs
 * 4. Return history list (ordered by changedAt)
 */
export class GetOrderHistoryUseCase {
  constructor(
    private readonly historyRepository: OrderHistoryRepository,
  ) {}

  async execute(orderId: string): Promise<OrderHistoryResponseDto[]> {
    // 1. Validate orderId
    if (!orderId || orderId.trim() === '') {
      throw new Error('GetOrderHistory: orderId is required');
    }

    // 2. Retrieve history entries
    const historyEntries = await this.historyRepository.findByOrderId(orderId);

    // 3. Convert to DTOs (already ordered by changedAt in repository)
    return historyEntries.map((entry) => ({
      id: entry.id,
      orderId: entry.orderId,
      oldStatus: entry.oldStatus,
      newStatus: entry.newStatus,
      changedAt: entry.changedAt.toISOString(),
      changedBy: entry.changedBy,
      reason: entry.reason,
      metadata: entry.metadata,
    }));
  }
}
