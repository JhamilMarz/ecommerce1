"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const create_order_1 = require("@/application/use-cases/create-order");
const order_1 = require("@/domain/entities/order");
const order_item_1 = require("@/domain/entities/order-item");
const order_status_1 = require("@/domain/entities/order-status");
describe('CreateOrderUseCase', () => {
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
        useCase = new create_order_1.CreateOrderUseCase(mockOrderRepo, mockHistoryRepo, mockEventPublisher);
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
        const orderItem = new order_item_1.OrderItem('prod-1', 'Product 1', 2, 10.0);
        mockOrderRepo.save.mockResolvedValue(order_1.Order.create('order-1', 'user-1', [orderItem]));
        mockHistoryRepo.save.mockResolvedValue({});
        mockEventPublisher.publish.mockResolvedValue();
        const result = await useCase.execute(dto);
        expect(result.userId).toBe('user-1');
        expect(result.status).toBe(order_status_1.OrderStatus.PENDING);
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
        await expect(useCase.execute(dto)).rejects.toThrow('items array cannot be empty');
    });
});
//# sourceMappingURL=create-order.test.js.map