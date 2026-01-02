import { OrderItem } from '@/domain/entities/order-item';

describe('OrderItem Entity', () => {
  describe('constructor', () => {
    it('should create valid order item', () => {
      const item = new OrderItem('prod-1', 'Product 1', 2, 10.0);

      expect(item.productId).toBe('prod-1');
      expect(item.productName).toBe('Product 1');
      expect(item.quantity).toBe(2);
      expect(item.priceSnapshot).toBe(10.0);
    });

    it('should throw error for empty productId', () => {
      expect(() => new OrderItem('', 'Product', 1, 10.0)).toThrow(
        'productId is required',
      );
    });

    it('should throw error for empty productName', () => {
      expect(() => new OrderItem('prod-1', '', 1, 10.0)).toThrow(
        'productName is required',
      );
    });

    it('should throw error for zero quantity', () => {
      expect(() => new OrderItem('prod-1', 'Product', 0, 10.0)).toThrow(
        'quantity must be greater than 0',
      );
    });

    it('should throw error for negative price', () => {
      expect(() => new OrderItem('prod-1', 'Product', 1, -5.0)).toThrow(
        'priceSnapshot cannot be negative',
      );
    });
  });

  describe('calculateSubtotal', () => {
    it('should calculate correct subtotal', () => {
      const item = new OrderItem('prod-1', 'Product', 3, 15.0);
      expect(item.calculateSubtotal()).toBe(45.0);
    });

    it('should handle zero price', () => {
      const item = new OrderItem('prod-1', 'Product', 2, 0);
      expect(item.calculateSubtotal()).toBe(0);
    });
  });

  describe('withQuantity', () => {
    it('should create new item with updated quantity', () => {
      const item = new OrderItem('prod-1', 'Product', 2, 10.0);
      const updated = item.withQuantity(5);

      expect(updated.quantity).toBe(5);
      expect(updated.productId).toBe('prod-1');
      expect(item.quantity).toBe(2); // Original unchanged
    });
  });
});
