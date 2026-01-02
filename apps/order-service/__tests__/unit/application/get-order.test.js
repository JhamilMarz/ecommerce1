"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const get_order_1 = require("@/application/use-cases/get-order");
const order_1 = require("@/domain/entities/order");
const order_item_1 = require("@/domain/entities/order-item");
const order_status_1 = require("@/domain/entities/order-status");
describe('GetOrderUseCase', () => {
    let useCase;
    let mockOrderRepo;
    beforeEach(() => {
        mockOrderRepo = {
            save: jest.fn(),
            findById: jest.fn(),
            findByUserId: jest.fn(),
            findAll: jest.fn(),
            exists: jest.fn(),
            delete: jest.fn(),
        };
        useCase = new get_order_1.GetOrderUseCase(mockOrderRepo);
    });
    it('should return order when user is owner', async () => {
        const order = new order_1.Order('order-1', 'user-1', [new order_item_1.OrderItem('prod-1', 'Product', 1, 10)], order_status_1.OrderStatus.PENDING, new Date(), new Date());
        mockOrderRepo.findById.mockResolvedValue(order);
        const result = await useCase.execute('order-1', 'user-1', false);
        expect(result.id).toBe('order-1');
        expect(result.userId).toBe('user-1');
    });
    it('should return order when user is admin', async () => {
        const order = new order_1.Order('order-1', 'user-2', [new order_item_1.OrderItem('prod-1', 'Product', 1, 10)], order_status_1.OrderStatus.PENDING, new Date(), new Date());
        mockOrderRepo.findById.mockResolvedValue(order);
        const result = await useCase.execute('order-1', 'user-1', true);
        expect(result.id).toBe('order-1');
    });
    it('should throw error when order not found', async () => {
        mockOrderRepo.findById.mockResolvedValue(null);
        await expect(useCase.execute('order-1', 'user-1', false)).rejects.toThrow('Order not found');
    });
    it('should throw error when user is not owner and not admin', async () => {
        const order = new order_1.Order('order-1', 'user-2', [new order_item_1.OrderItem('prod-1', 'Product', 1, 10)], order_status_1.OrderStatus.PENDING, new Date(), new Date());
        mockOrderRepo.findById.mockResolvedValue(order);
        await expect(useCase.execute('order-1', 'user-1', false)).rejects.toThrow('Forbidden');
    });
});
//# sourceMappingURL=get-order.test.js.map