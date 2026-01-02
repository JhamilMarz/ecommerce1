import { OrderStatus, isValidTransition } from '@/domain/entities/order-status';

describe('OrderStatus', () => {
  describe('isValidTransition', () => {
    it('should allow pending -> awaiting_payment', () => {
      expect(
        isValidTransition(OrderStatus.PENDING, OrderStatus.AWAITING_PAYMENT),
      ).toBe(true);
    });

    it('should allow awaiting_payment -> paid', () => {
      expect(
        isValidTransition(OrderStatus.AWAITING_PAYMENT, OrderStatus.PAID),
      ).toBe(true);
    });

    it('should allow paid -> shipped', () => {
      expect(isValidTransition(OrderStatus.PAID, OrderStatus.SHIPPED)).toBe(
        true,
      );
    });

    it('should allow shipped -> completed', () => {
      expect(isValidTransition(OrderStatus.SHIPPED, OrderStatus.COMPLETED)).toBe(
        true,
      );
    });

    it('should allow cancellation from any non-terminal status', () => {
      expect(isValidTransition(OrderStatus.PENDING, OrderStatus.CANCELLED)).toBe(
        true,
      );
      expect(
        isValidTransition(OrderStatus.AWAITING_PAYMENT, OrderStatus.CANCELLED),
      ).toBe(true);
      expect(isValidTransition(OrderStatus.PAID, OrderStatus.CANCELLED)).toBe(
        true,
      );
      expect(isValidTransition(OrderStatus.SHIPPED, OrderStatus.CANCELLED)).toBe(
        true,
      );
    });

    it('should not allow completed -> any', () => {
      expect(
        isValidTransition(OrderStatus.COMPLETED, OrderStatus.CANCELLED),
      ).toBe(false);
      expect(isValidTransition(OrderStatus.COMPLETED, OrderStatus.SHIPPED)).toBe(
        false,
      );
    });

    it('should not allow cancelled -> any', () => {
      expect(isValidTransition(OrderStatus.CANCELLED, OrderStatus.PAID)).toBe(
        false,
      );
    });

    it('should not allow pending -> completed', () => {
      expect(isValidTransition(OrderStatus.PENDING, OrderStatus.COMPLETED)).toBe(
        false,
      );
    });
  });
});
