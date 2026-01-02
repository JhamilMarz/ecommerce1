import { CreateOrderUseCase } from '@/application/use-cases/create-order';
import { OrderRepository } from '@/domain/repositories/order-repository';
import { OrderHistoryRepository } from '@/domain/repositories/order-history-repository';
import { EventPublisher } from '@/application/interfaces/event-publisher-interface';
import { Order } from '@/domain/entities/order';
import { OrderItem } from '@/domain/entities/order-item';
import { OrderStatus } from '@/domain/entities/order-status';

describe('CreateOrderUseCase', () => {
  let useCase: CreateOrderUseCase;
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

    useCase = new CreateOrderUseCase(
      mockOrderRepo,
      mockHistoryRepo,
      mockEventPublisher,
    );
  });

  it('should create order successfully', async () => {
    const dto = {
      userId: 'user-1',
      items: [
        {
          productId: 'prod-1',
          productName: 'Product 1',
          quantity: 2,
          priceSnapshot: 10.0,
        },
      ],
    };

    const orderItem = new OrderItem('prod-1', 'Product 1', 2, 10.0);
    mockOrderRepo.save.mockResolvedValue(
      Order.create('order-1', 'user-1', [orderItem]) as any,
    );
    mockHistoryRepo.save.mockResolvedValue({} as any);
    mockEventPublisher.publish.mockResolvedValue();

    const result = await useCase.execute(dto);

    expect(result.userId).toBe('user-1');
    expect(result.status).toBe(OrderStatus.PENDING);
    expect(mockOrderRepo.save).toHaveBeenCalled();
    expect(mockHistoryRepo.save).toHaveBeenCalled();
    expect(mockEventPublisher.publish).toHaveBeenCalled();
  });

  it('should throw error if userId is empty', async () => {
    const dto = {
      userId: '',
      items: [
        {
          productId: 'prod-1',
          productName: 'Product',
          quantity: 1,
          priceSnapshot: 10,
        },
      ],
    };

    await expect(useCase.execute(dto)).rejects.toThrow('userId is required');
  });

  it('should throw error if items array is empty', async () => {
    const dto = {
      userId: 'user-1',
      items: [],
    };

    await expect(useCase.execute(dto)).rejects.toThrow(
      'items array cannot be empty',
    );
  });
});
