import { UpdateOrderStatusUseCase } from '@/application/use-cases/update-order-status';
import { OrderRepository } from '@/domain/repositories/order-repository';
import { OrderHistoryRepository } from '@/domain/repositories/order-history-repository';
import { EventPublisher } from '@/application/interfaces/event-publisher-interface';
import { Order } from '@/domain/entities/order';
import { OrderItem } from '@/domain/entities/order-item';
import { OrderStatus } from '@/domain/entities/order-status';

describe('UpdateOrderStatusUseCase', () => {
  let useCase: UpdateOrderStatusUseCase;
  let mockOrderRepo: jest.Mocked<OrderRepository>;
  let mockHistoryRepo: jest.Mocked<OrderHistoryRepository>;
  let mockEventPublisher: jest.Mocked<EventPublisher>;

  beforeEach(() => {
    mockOrderRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      findAll: jest.fn(),
      exists: jest.fn(),
      delete: jest.fn(),
    };

    mockHistoryRepo = {
      save: jest.fn(),
      findByOrderId: jest.fn(),
      findById: jest.fn(),
    };

    mockEventPublisher = {
      publish: jest.fn(),
      close: jest.fn(),
    };

    useCase = new UpdateOrderStatusUseCase(
      mockOrderRepo,
      mockHistoryRepo,
      mockEventPublisher,
    );
  });

  it('should update order status successfully', async () => {
    const order = Order.create('order-1', 'user-1', [
      new OrderItem('prod-1', 'Product', 1, 10),
    ]).markAwaitingPayment();

    mockOrderRepo.findById.mockResolvedValue(order);
    mockOrderRepo.save.mockResolvedValue(
      order.markPaid('pay-123') as any,
    );
    mockHistoryRepo.save.mockResolvedValue({} as any);
    mockEventPublisher.publish.mockResolvedValue();

    const result = await useCase.execute(
      'order-1',
      { newStatus: 'paid', paymentReference: 'pay-123' },
      'admin-1',
      true,
    );

    expect(result.status).toBe(OrderStatus.PAID);
    expect(mockEventPublisher.publish).toHaveBeenCalled();
  });

  it('should throw error if user is not admin', async () => {
    const order = Order.create('order-1', 'user-1', [
      new OrderItem('prod-1', 'Product', 1, 10),
    ]);

    mockOrderRepo.findById.mockResolvedValue(order);

    await expect(
      useCase.execute(
        'order-1',
        { newStatus: 'paid', paymentReference: 'pay-123' },
        'user-1',
        false,
      ),
    ).rejects.toThrow('only admins can update order status');
  });

  it('should throw error for invalid status transition', async () => {
    const order = Order.create('order-1', 'user-1', [
      new OrderItem('prod-1', 'Product', 1, 10),
    ]);

    mockOrderRepo.findById.mockResolvedValue(order);

    await expect(
      useCase.execute(
        'order-1',
        { newStatus: 'completed' },
        'admin-1',
        true,
      ),
    ).rejects.toThrow('Failed to change order status');
  });
});
