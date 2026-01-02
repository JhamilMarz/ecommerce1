"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const get_order_history_1 = require("@/application/use-cases/get-order-history");
const order_history_1 = require("@/domain/entities/order-history");
const order_status_1 = require("@/domain/entities/order-status");
describe('GetOrderHistoryUseCase', () => {
    let useCase;
    let mockHistoryRepo;
    beforeEach(() => {
        mockHistoryRepo = {
            save: jest.fn(),
            findByOrderId: jest.fn(),
            findById: jest.fn(),
        };
        useCase = new get_order_history_1.GetOrderHistoryUseCase(mockHistoryRepo);
    });
    it('should get order history successfully', async () => {
        const history1 = new order_history_1.OrderHistory('hist-1', 'order-1', order_status_1.OrderStatus.PENDING, order_status_1.OrderStatus.PAID, new Date(), 'user-1');
        const history2 = new order_history_1.OrderHistory('hist-2', 'order-1', order_status_1.OrderStatus.PAID, order_status_1.OrderStatus.SHIPPED, new Date(), 'admin-1');
        mockHistoryRepo.findByOrderId.mockResolvedValue([history1, history2]);
        const result = await useCase.execute('order-1');
        expect(result).toHaveLength(2);
        expect(result[0].oldStatus).toBe(order_status_1.OrderStatus.PENDING);
        expect(result[1].oldStatus).toBe(order_status_1.OrderStatus.PAID);
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
//# sourceMappingURL=get-order-history.test.js.map