"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const update_order_status_1 = require("@/application/use-cases/update-order-status");
const order_1 = require("@/domain/entities/order");
const order_item_1 = require("@/domain/entities/order-item");
const order_status_1 = require("@/domain/entities/order-status");
describe('UpdateOrderStatusUseCase', () => {
    let useCase;
    let mockOrderRepo;
    let mockHistoryRepo;
    let mockEventPublisher;
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
        useCase = new update_order_status_1.UpdateOrderStatusUseCase(mockOrderRepo, mockHistoryRepo, mockEventPublisher);
    });
    it('should update order status successfully', async () => {
        const order = order_1.Order.create('order-1', 'user-1', [
            new order_item_1.OrderItem('prod-1', 'Product', 1, 10),
        ]).markAwaitingPayment();
        mockOrderRepo.findById.mockResolvedValue(order);
        mockOrderRepo.save.mockResolvedValue(order.markPaid('pay-123'));
        mockHistoryRepo.save.mockResolvedValue({});
        mockEventPublisher.publish.mockResolvedValue();
        const result = await useCase.execute('order-1', { newStatus: 'paid', paymentReference: 'pay-123' }, 'admin-1', true);
        expect(result.status).toBe(order_status_1.OrderStatus.PAID);
        expect(mockEventPublisher.publish).toHaveBeenCalled();
    });
    it('should throw error if user is not admin', async () => {
        const order = order_1.Order.create('order-1', 'user-1', [
            new order_item_1.OrderItem('prod-1', 'Product', 1, 10),
        ]);
        mockOrderRepo.findById.mockResolvedValue(order);
        await expect(useCase.execute('order-1', { newStatus: 'paid', paymentReference: 'pay-123' }, 'user-1', false)).rejects.toThrow('only admins can update order status');
    });
    it('should throw error for invalid status transition', async () => {
        const order = order_1.Order.create('order-1', 'user-1', [
            new order_item_1.OrderItem('prod-1', 'Product', 1, 10),
        ]);
        mockOrderRepo.findById.mockResolvedValue(order);
        await expect(useCase.execute('order-1', { newStatus: 'completed' }, 'admin-1', true)).rejects.toThrow('Failed to change order status');
    });
});
//# sourceMappingURL=update-order-status.test.js.map