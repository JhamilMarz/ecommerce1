import { CreateProductUseCase } from '../../../src/application/use-cases/create-product';
import { ProductRepository } from '../../../src/domain/repositories/product-repository';
import { CategoryRepository } from '../../../src/domain/repositories/category-repository';
import { InventoryRepository } from '../../../src/domain/repositories/inventory-repository';
import { EventPublisher } from '../../../src/application/interfaces/event-publisher';
import { Product, ProductStatus } from '../../../src/domain/entities/product';
import { Category } from '../../../src/domain/entities/category';

describe('CreateProductUseCase', () => {
  let useCase: CreateProductUseCase;
  let productRepository: jest.Mocked<ProductRepository>;
  let categoryRepository: jest.Mocked<CategoryRepository>;
  let inventoryRepository: jest.Mocked<InventoryRepository>;
  let eventPublisher: jest.Mocked<EventPublisher>;

  beforeEach(() => {
    productRepository = {
      findBySku: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<ProductRepository>;

    categoryRepository = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<CategoryRepository>;

    inventoryRepository = {
      save: jest.fn(),
    } as unknown as jest.Mocked<InventoryRepository>;

    eventPublisher = {
      publish: jest.fn(),
    } as unknown as jest.Mocked<EventPublisher>;

    useCase = new CreateProductUseCase(
      productRepository,
      categoryRepository,
      inventoryRepository,
      eventPublisher,
    );
  });

  it('should create product successfully', async () => {
    const category = Category.reconstitute({
      id: 'cat-123',
      name: 'Electronics',
      description: 'Electronics category',
      parentId: null,
      slug: 'electronics',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const product = Product.reconstitute({
      id: 'prod-123',
      name: 'iPhone 15 Pro',
      description: 'Latest iPhone',
      price: 999.99,
      categoryId: 'cat-123',
      sellerId: 'seller-123',
      sku: 'IPHONE-15-PRO',
      status: ProductStatus.DRAFT,
      images: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    categoryRepository.findById.mockResolvedValue(category);
    productRepository.findBySku.mockResolvedValue(null);
    productRepository.save.mockResolvedValue(product);

    const result = await useCase.execute({
      name: 'iPhone 15 Pro',
      description: 'Latest iPhone',
      price: 999.99,
      categoryId: 'cat-123',
      sellerId: 'seller-123',
      sku: 'IPHONE-15-PRO',
    });

    expect(result.name).toBe('iPhone 15 Pro');
    expect(productRepository.save).toHaveBeenCalled();
    expect(inventoryRepository.save).toHaveBeenCalled();
    expect(eventPublisher.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'product.created',
        aggregateId: 'prod-123',
      }),
    );
  });

  it('should throw error when category not found', async () => {
    categoryRepository.findById.mockResolvedValue(null);
    productRepository.findBySku.mockResolvedValue(null);

    await expect(
      useCase.execute({
        name: 'iPhone 15 Pro',
        description: 'Latest iPhone',
        price: 999.99,
        categoryId: 'invalid-cat',
        sellerId: 'seller-123',
        sku: 'IPHONE-15-PRO',
      }),
    ).rejects.toThrow('Category invalid-cat not found');
  });

  it('should throw error when SKU already exists', async () => {
    const category = Category.reconstitute({
      id: 'cat-123',
      name: 'Electronics',
      description: 'Electronics category',
      parentId: null,
      slug: 'electronics',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const existingProduct = Product.reconstitute({
      id: 'prod-999',
      name: 'Existing Product',
      description: 'Existing',
      price: 100,
      categoryId: 'cat-123',
      sellerId: 'seller-123',
      sku: 'IPHONE-15-PRO',
      status: ProductStatus.ACTIVE,
      images: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    categoryRepository.findById.mockResolvedValue(category);
    productRepository.findBySku.mockResolvedValue(existingProduct);

    await expect(
      useCase.execute({
        name: 'iPhone 15 Pro',
        description: 'Latest iPhone',
        price: 999.99,
        categoryId: 'cat-123',
        sellerId: 'seller-123',
        sku: 'IPHONE-15-PRO',
      }),
    ).rejects.toThrow('Product with SKU IPHONE-15-PRO already exists');
  });
});
