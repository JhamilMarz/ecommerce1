"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const order_status_1 = require("@/domain/entities/order-status");
describe('OrderStatus', () => {
    describe('isValidTransition', () => {
        it('should allow pending -> awaiting_payment', () => {
            expect((0, order_status_1.isValidTransition)(order_status_1.OrderStatus.PENDING, order_status_1.OrderStatus.AWAITING_PAYMENT)).toBe(true);
        });
        it('should allow awaiting_payment -> paid', () => {
            expect((0, order_status_1.isValidTransition)(order_status_1.OrderStatus.AWAITING_PAYMENT, order_status_1.OrderStatus.PAID)).toBe(true);
        });
        it('should allow paid -> shipped', () => {
            expect((0, order_status_1.isValidTransition)(order_status_1.OrderStatus.PAID, order_status_1.OrderStatus.SHIPPED)).toBe(true);
        });
        it('should allow shipped -> completed', () => {
            expect((0, order_status_1.isValidTransition)(order_status_1.OrderStatus.SHIPPED, order_status_1.OrderStatus.COMPLETED)).toBe(true);
        });
        it('should allow cancellation from any non-terminal status', () => {
            expect((0, order_status_1.isValidTransition)(order_status_1.OrderStatus.PENDING, order_status_1.OrderStatus.CANCELLED)).toBe(true);
            expect((0, order_status_1.isValidTransition)(order_status_1.OrderStatus.AWAITING_PAYMENT, order_status_1.OrderStatus.CANCELLED)).toBe(true);
            expect((0, order_status_1.isValidTransition)(order_status_1.OrderStatus.PAID, order_status_1.OrderStatus.CANCELLED)).toBe(true);
            expect((0, order_status_1.isValidTransition)(order_status_1.OrderStatus.SHIPPED, order_status_1.OrderStatus.CANCELLED)).toBe(true);
        });
        it('should not allow completed -> any', () => {
            expect((0, order_status_1.isValidTransition)(order_status_1.OrderStatus.COMPLETED, order_status_1.OrderStatus.CANCELLED)).toBe(false);
            expect((0, order_status_1.isValidTransition)(order_status_1.OrderStatus.COMPLETED, order_status_1.OrderStatus.SHIPPED)).toBe(false);
        });
        it('should not allow cancelled -> any', () => {
            expect((0, order_status_1.isValidTransition)(order_status_1.OrderStatus.CANCELLED, order_status_1.OrderStatus.PAID)).toBe(false);
        });
        it('should not allow pending -> completed', () => {
            expect((0, order_status_1.isValidTransition)(order_status_1.OrderStatus.PENDING, order_status_1.OrderStatus.COMPLETED)).toBe(false);
        });
    });
});
//# sourceMappingURL=order-status.test.js.map