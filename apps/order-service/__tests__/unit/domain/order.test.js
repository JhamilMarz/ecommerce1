"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const order_1 = require("@/domain/entities/order");
const order_item_1 = require("@/domain/entities/order-item");
const order_status_1 = require("@/domain/entities/order-status");
describe('Order Entity', () => {
    const validItems = [
        new order_item_1.OrderItem('prod-1', 'Product 1', 2, 10.0),
        new order_item_1.OrderItem('prod-2', 'Product 2', 1, 20.0),
    ];
    describe('create', () => {
        it('should create a new order with pending status', () => {
            const order = order_1.Order.create('order-1', 'user-1', validItems);
            expect(order.id).toBe('order-1');
            expect(order.userId).toBe('user-1');
            expect(order.items).toHaveLength(2);
            expect(order.status).toBe(order_status_1.OrderStatus.PENDING);
            expect(order.calculateTotal()).toBe(40.0);
        });
        it('should throw error if no items provided', () => {
            expect(() => order_1.Order.create('order-1', 'user-1', [])).toThrow('Order: must have at least one item');
        });
    });
    describe('calculateTotal', () => {
        it('should calculate correct total from items', () => {
            const order = order_1.Order.create('order-1', 'user-1', validItems);
            expect(order.calculateTotal()).toBe(40.0);
        });
    });
    describe('changeStatus', () => {
        it('should change status if transition is valid', () => {
            const order = order_1.Order.create('order-1', 'user-1', validItems);
            const updated = order.changeStatus(order_status_1.OrderStatus.AWAITING_PAYMENT);
            expect(updated.status).toBe(order_status_1.OrderStatus.AWAITING_PAYMENT);
        });
        it('should throw error for invalid transition', () => {
            const order = order_1.Order.create('order-1', 'user-1', validItems);
            expect(() => order.changeStatus(order_status_1.OrderStatus.COMPLETED)).toThrow('invalid state transition');
        });
    });
    describe('markPaid', () => {
        it('should mark order as paid with payment reference', () => {
            const order = order_1.Order.create('order-1', 'user-1', validItems)
                .markAwaitingPayment();
            const updated = order.markPaid('pay-123');
            expect(updated.status).toBe(order_status_1.OrderStatus.PAID);
            expect(updated.paymentReference).toBe('pay-123');
        });
        it('should throw error if no payment reference', () => {
            const order = order_1.Order.create('order-1', 'user-1', validItems)
                .markAwaitingPayment();
            expect(() => order.markPaid('')).toThrow('paymentReference is required');
        });
    });
    describe('cancel', () => {
        it('should cancel order from any non-terminal status', () => {
            const order = order_1.Order.create('order-1', 'user-1', validItems);
            const cancelled = order.cancel();
            expect(cancelled.status).toBe(order_status_1.OrderStatus.CANCELLED);
        });
        it('should throw error when cancelling completed order', () => {
            const order = order_1.Order.create('order-1', 'user-1', validItems)
                .markAwaitingPayment()
                .markPaid('pay-123')
                .markShipped()
                .markCompleted();
            expect(() => order.cancel()).toThrow('invalid state transition');
        });
    });
    describe('addItem', () => {
        it('should add item to pending order', () => {
            const order = order_1.Order.create('order-1', 'user-1', validItems);
            const newItem = new order_item_1.OrderItem('prod-3', 'Product 3', 1, 15.0);
            const updated = order.addItem(newItem);
            expect(updated.items).toHaveLength(3);
            expect(updated.calculateTotal()).toBe(55.0);
        });
        it('should throw error when adding to non-pending order', () => {
            const order = order_1.Order.create('order-1', 'user-1', validItems)
                .markAwaitingPayment();
            const newItem = new order_item_1.OrderItem('prod-3', 'Product 3', 1, 15.0);
            expect(() => order.addItem(newItem)).toThrow('cannot add items to non-pending order');
        });
    });
    describe('removeItem', () => {
        it('should remove item from pending order', () => {
            const order = order_1.Order.create('order-1', 'user-1', validItems);
            const updated = order.removeItem('prod-1');
            expect(updated.items).toHaveLength(1);
            expect(updated.calculateTotal()).toBe(20.0);
        });
        it('should throw error when removing last item', () => {
            const singleItem = [new order_item_1.OrderItem('prod-1', 'Product 1', 1, 10.0)];
            const order = order_1.Order.create('order-1', 'user-1', singleItem);
            expect(() => order.removeItem('prod-1')).toThrow('must have at least one item');
        });
    });
});
//# sourceMappingURL=order.test.js.map