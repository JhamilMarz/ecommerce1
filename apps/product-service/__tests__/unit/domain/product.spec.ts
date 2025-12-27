import { Product, ProductStatus } from '../../../src/domain/entities/product';

describe('Product Entity', () => {
  describe('create', () => {
    it('should create a product with valid data', () => {
      const product = Product.create({
        name: 'iPhone 15 Pro',
        description: 'Latest iPhone',
        price: 999.99,
        categoryId: 'cat-123',
        sellerId: 'seller-123',
        sku: 'IPHONE-15-PRO',
        status: ProductStatus.DRAFT,
        images: [],
      });

      expect(product.name).toBe('iPhone 15 Pro');
      expect(product.price).toBe(999.99);
      expect(product.status).toBe(ProductStatus.DRAFT);
    });
  });

  describe('updateDetails', () => {
    it('should update product details', () => {
      const product = Product.create({
        name: 'iPhone 15 Pro',
        description: 'Latest iPhone',
        price: 999.99,
        categoryId: 'cat-123',
        sellerId: 'seller-123',
        sku: 'IPHONE-15-PRO',
        status: ProductStatus.DRAFT,
        images: [],
      });

      product.updateDetails({
        name: 'iPhone 15 Pro Max',
        price: 1199.99,
      });

      expect(product.name).toBe('iPhone 15 Pro Max');
      expect(product.price).toBe(1199.99);
    });

    it('should throw error for negative price', () => {
      const product = Product.create({
        name: 'iPhone 15 Pro',
        description: 'Latest iPhone',
        price: 999.99,
        categoryId: 'cat-123',
        sellerId: 'seller-123',
        sku: 'IPHONE-15-PRO',
        status: ProductStatus.DRAFT,
        images: [],
      });

      expect(() => {
        product.updateDetails({ price: -100 });
      }).toThrow('Price cannot be negative');
    });
  });

  describe('activate', () => {
    it('should activate product', () => {
      const product = Product.create({
        name: 'iPhone 15 Pro',
        description: 'Latest iPhone',
        price: 999.99,
        categoryId: 'cat-123',
        sellerId: 'seller-123',
        sku: 'IPHONE-15-PRO',
        status: ProductStatus.DRAFT,
        images: [],
      });

      product.activate();

      expect(product.status).toBe(ProductStatus.ACTIVE);
    });
  });

  describe('markOutOfStock', () => {
    it('should mark product as out of stock', () => {
      const product = Product.create({
        name: 'iPhone 15 Pro',
        description: 'Latest iPhone',
        price: 999.99,
        categoryId: 'cat-123',
        sellerId: 'seller-123',
        sku: 'IPHONE-15-PRO',
        status: ProductStatus.ACTIVE,
        images: [],
      });

      product.markOutOfStock();

      expect(product.status).toBe(ProductStatus.OUT_OF_STOCK);
    });
  });
});
