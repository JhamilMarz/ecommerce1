import { Product, ProductStatus } from '../../domain/entities/product';
import { ProductRepository } from '../../domain/repositories/product-repository';
import { CategoryRepository } from '../../domain/repositories/category-repository';
import { InventoryRepository } from '../../domain/repositories/inventory-repository';
import { Inventory } from '../../domain/entities/inventory';
import { EventPublisher } from '../interfaces/event-publisher';
import { CreateProductDto } from '../dtos/create-product-dto';
import { v4 as uuidv4 } from 'uuid';

export class CreateProductUseCase {
  constructor(
    private productRepository: ProductRepository,
    private categoryRepository: CategoryRepository,
    private inventoryRepository: InventoryRepository,
    private eventPublisher: EventPublisher,
  ) {}

  async execute(dto: CreateProductDto, correlationId?: string): Promise<Product> {
    // Validate category exists
    const category = await this.categoryRepository.findById(dto.categoryId);
    if (!category) {
      throw new Error(`Category ${dto.categoryId} not found`);
    }

    // Check SKU uniqueness
    const existingProduct = await this.productRepository.findBySku(dto.sku);
    if (existingProduct) {
      throw new Error(`Product with SKU ${dto.sku} already exists`);
    }

    // Create product
    const product = Product.create({
      name: dto.name,
      description: dto.description,
      price: dto.price,
      categoryId: dto.categoryId,
      sellerId: dto.sellerId,
      sku: dto.sku,
      status: dto.status || ProductStatus.DRAFT,
      images: dto.images || [],
    });

    const savedProduct = await this.productRepository.save(product);

    // Create initial inventory
    const inventory = Inventory.create({
      productId: savedProduct.id,
      quantity: 0,
      reservedQuantity: 0,
    });

    await this.inventoryRepository.save(inventory);

    // Publish event
    await this.eventPublisher.publish({
      eventType: 'product.created',
      aggregateId: savedProduct.id,
      occurredOn: new Date(),
      correlationId,
      payload: savedProduct.toJSON(),
    });

    return savedProduct;
  }
}
