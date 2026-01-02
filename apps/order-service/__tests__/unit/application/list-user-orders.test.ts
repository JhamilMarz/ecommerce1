import { ListUserOrdersUseCase } from '@/application/use-cases/list-user-orders';
import { OrderRepository } from '@/domain/repositories/order-repository';
import { Order } from '@/domain/entities/order';
import { OrderItem } from '@/domain/entities/order-item';

describe('ListUserOrdersUseCase', () => {
  let useCase: ListUserOrdersUseCase;
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

    useCase = new ListUserOrdersUseCase(mockOrderRepo);
  });

  it('should list user orders successfully', async () => {
    const order1 = Order.create('order-1', 'user-1', [
      new OrderItem('prod-1', 'Product', 1, 10),
    ]);
    const order2 = Order.create('order-2', 'user-1', [
      new OrderItem('prod-2', 'Product 2', 2, 20),
    ]);

    mockOrderRepo.findByUserId.mockResolvedValue({
      orders: [order1, order2],
      total: 2,
    });

    const result = await useCase.execute('user-1', 1, 10);

    expect(result.orders).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
  });

  it('should return empty array if no orders found', async () => {
    mockOrderRepo.findByUserId.mockResolvedValue({
      orders: [],
      total: 0,
    });

    const result = await useCase.execute('user-1', 1, 10);

    expect(result.orders).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('should throw error for invalid userId', async () => {
    await expect(useCase.execute('', 1, 10)).rejects.toThrow(
      'userId is required',
    );
  });
});
