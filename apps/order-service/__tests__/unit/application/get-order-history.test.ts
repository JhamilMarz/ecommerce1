import { GetOrderHistoryUseCase } from '@/application/use-cases/get-order-history';
import { OrderHistoryRepository } from '@/domain/repositories/order-history-repository';
import { OrderHistory } from '@/domain/entities/order-history';
import { OrderStatus } from '@/domain/entities/order-status';

describe('GetOrderHistoryUseCase', () => {
  let useCase: GetOrderHistoryUseCase;
  let mockHistoryRepo: jest.Mocked<OrderHistoryRepository>;

  beforeEach(() => {
    mockHistoryRepo = {
      save: jest.fn(),
      findByOrderId: jest.fn(),
      findById: jest.fn(),
    };

    useCase = new GetOrderHistoryUseCase(mockHistoryRepo);
  });

  it('should get order history successfully', async () => {
    const history1 = new OrderHistory(
      'hist-1',
      'order-1',
      OrderStatus.PENDING,
      OrderStatus.PAID,
      new Date(),
      'user-1',
    );
    const history2 = new OrderHistory(
      'hist-2',
      'order-1',
      OrderStatus.PAID,
      OrderStatus.SHIPPED,
      new Date(),
      'admin-1',
    );

    mockHistoryRepo.findByOrderId.mockResolvedValue([history1, history2]);

    const result = await useCase.execute('order-1');

    expect(result).toHaveLength(2);
    expect(result[0].oldStatus).toBe(OrderStatus.PENDING);
    expect(result[1].oldStatus).toBe(OrderStatus.PAID);
  });

  it('should return empty array if no history found', async () => {
    mockHistoryRepo.findByOrderId.mockResolvedValue([]);

    const result = await useCase.execute('order-1');

    expect(result).toHaveLength(0);
  });

  it('should throw error for invalid orderId', async () => {
    await expect(useCase.execute('')).rejects.toThrow('orderId is required');
  });
});
