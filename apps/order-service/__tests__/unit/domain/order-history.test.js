"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const order_history_1 = require("@/domain/entities/order-history");
const order_status_1 = require("@/domain/entities/order-status");
describe('OrderHistory Entity', () => {
    describe('constructor', () => {
        it('should create valid order history entry', () => {
            const history = new order_history_1.OrderHistory('hist-1', 'order-1', order_status_1.OrderStatus.PENDING, order_status_1.OrderStatus.PAID, new Date(), 'user-1', 'Payment confirmed');
            expect(history.id).toBe('hist-1');
            expect(history.orderId).toBe('order-1');
            expect(history.oldStatus).toBe(order_status_1.OrderStatus.PENDING);
            expect(history.newStatus).toBe(order_status_1.OrderStatus.PAID);
            expect(history.changedBy).toBe('user-1');
        });
        it('should throw error for empty orderId', () => {
            expect(() => new order_history_1.OrderHistory('hist-1', '', order_status_1.OrderStatus.PENDING, order_status_1.OrderStatus.PAID, new Date(), 'user-1')).toThrow('orderId is required');
        });
        it('should throw error for invalid oldStatus', () => {
            expect(() => new order_history_1.OrderHistory('hist-1', 'order-1', 'invalid', order_status_1.OrderStatus.PAID, new Date(), 'user-1')).toThrow('invalid oldStatus');
        });
    });
    describe('create', () => {
        it('should create history entry with factory method', () => {
            const history = order_history_1.OrderHistory.create('hist-1', 'order-1', order_status_1.OrderStatus.PENDING, order_status_1.OrderStatus.PAID, 'user-1', 'Payment confirmed', { paymentId: 'pay-123' });
            expect(history.id).toBe('hist-1');
            expect(history.reason).toBe('Payment confirmed');
            expect(history.metadata).toEqual({ paymentId: 'pay-123' });
        });
    });
});
//# sourceMappingURL=order-history.test.js.map