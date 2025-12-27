import { Product } from '../../domain/entities/product';
import { ProductRepository } from '../../domain/repositories/product-repository';
import { EventPublisher } from '../interfaces/event-publisher';
import { UpdateProductDto } from '../dtos/update-product-dto';

export class UpdateProductUseCase {
  constructor(
    private productRepository: ProductRepository,
    private eventPublisher: EventPublisher,
  ) {}

  async execute(id: string, dto: UpdateProductDto, correlationId?: string): Promise<Product> {
    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new Error(`Product ${id} not found`);
    }

    product.updateDetails({
      name: dto.name,
      description: dto.description,
      price: dto.price,
    });

    const updatedProduct = await this.productRepository.update(product);

    await this.eventPublisher.publish({
      eventType: 'product.updated',
      aggregateId: updatedProduct.id,
      occurredOn: new Date(),
      correlationId,
      payload: updatedProduct.toJSON(),
    });

    return updatedProduct;
  }
}
