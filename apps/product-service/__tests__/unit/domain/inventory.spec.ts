import { Inventory } from '../../../src/domain/entities/inventory';

describe('Inventory Entity', () => {
  describe('reserve', () => {
    it('should reserve inventory successfully', () => {
      const inventory = Inventory.create({
        productId: 'prod-123',
        quantity: 100,
        reservedQuantity: 0,
      });

      inventory.reserve(10);

      expect(inventory.reservedQuantity).toBe(10);
      expect(inventory.availableQuantity).toBe(90);
    });

    it('should throw error when insufficient inventory', () => {
      const inventory = Inventory.create({
        productId: 'prod-123',
        quantity: 5,
        reservedQuantity: 0,
      });

      expect(() => {
        inventory.reserve(10);
      }).toThrow('Insufficient inventory');
    });
  });

  describe('release', () => {
    it('should release reserved inventory', () => {
      const inventory = Inventory.create({
        productId: 'prod-123',
        quantity: 100,
        reservedQuantity: 20,
      });

      inventory.release(10);

      expect(inventory.reservedQuantity).toBe(10);
      expect(inventory.availableQuantity).toBe(90);
    });

    it('should throw error when releasing more than reserved', () => {
      const inventory = Inventory.create({
        productId: 'prod-123',
        quantity: 100,
        reservedQuantity: 5,
      });

      expect(() => {
        inventory.release(10);
      }).toThrow('Cannot release more than reserved');
    });
  });

  describe('incrementStock', () => {
    it('should increment stock', () => {
      const inventory = Inventory.create({
        productId: 'prod-123',
        quantity: 100,
        reservedQuantity: 0,
      });

      inventory.incrementStock(50);

      expect(inventory.quantity).toBe(150);
    });
  });

  describe('decrementStock', () => {
    it('should decrement stock', () => {
      const inventory = Inventory.create({
        productId: 'prod-123',
        quantity: 100,
        reservedQuantity: 0,
      });

      inventory.decrementStock(30);

      expect(inventory.quantity).toBe(70);
    });

    it('should throw error when insufficient stock', () => {
      const inventory = Inventory.create({
        productId: 'prod-123',
        quantity: 10,
        reservedQuantity: 0,
      });

      expect(() => {
        inventory.decrementStock(20);
      }).toThrow('Insufficient stock');
    });
  });
});
