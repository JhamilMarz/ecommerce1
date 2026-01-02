import { GetOrderUseCase } from '@/application/use-cases/get-order';
import { OrderRepository } from '@/domain/repositories/order-repository';
import { Order } from '@/domain/entities/order';
import { OrderItem } from '@/domain/entities/order-item';
import { OrderStatus } from '@/domain/entities/order-status';

describe('GetOrderUseCase', () => {
  let useCase: GetOrderUseCase;
  let mockOrderRepo: jest.Mocked<OrderRepository>;

  beforeEach(() => {
    mockOrderRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      findAll: jest.fn(),
      exists: jest.fn(),
      delete: jest.fn(),
    };

    useCase = new GetOrderUseCase(mockOrderRepo);
  });

  it('should return order when user is owner', async () => {
    const order = new Order(
      'order-1',
      'user-1',
      [new OrderItem('prod-1', 'Product', 1, 10)],
      OrderStatus.PENDING,
      new Date(),
      new Date(),
    );

    mockOrderRepo.findById.mockResolvedValue(order);

    const result = await useCase.execute('order-1', 'user-1', false);

    expect(result.id).toBe('order-1');
    expect(result.userId).toBe('user-1');
  });

  it('should return order when user is admin', async () => {
    const order = new Order(
      'order-1',
      'user-2',
      [new OrderItem('prod-1', 'Product', 1, 10)],
      OrderStatus.PENDING,
      new Date(),
      new Date(),
    );

    mockOrderRepo.findById.mockResolvedValue(order);

    const result = await useCase.execute('order-1', 'user-1', true);

    expect(result.id).toBe('order-1');
  });

  it('should throw error when order not found', async () => {
    mockOrderRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute('order-1', 'user-1', false)).rejects.toThrow(
      'Order not found',
    );
  });

  it('should throw error when user is not owner and not admin', async () => {
    const order = new Order(
      'order-1',
      'user-2',
      [new OrderItem('prod-1', 'Product', 1, 10)],
      OrderStatus.PENDING,
      new Date(),
      new Date(),
    );

    mockOrderRepo.findById.mockResolvedValue(order);

    await expect(useCase.execute('order-1', 'user-1', false)).rejects.toThrow(
      'Forbidden',
    );
  });
});
