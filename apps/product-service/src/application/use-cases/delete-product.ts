import { ProductRepository } from '../../domain/repositories/product-repository';
import { EventPublisher } from '../interfaces/event-publisher';

export class DeleteProductUseCase {
  constructor(
    private productRepository: ProductRepository,
    private eventPublisher: EventPublisher,
  ) {}

  async execute(id: string, correlationId?: string): Promise<void> {
    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new Error(`Product ${id} not found`);
    }

    await this.productRepository.delete(id);

    await this.eventPublisher.publish({
      eventType: 'product.deleted',
      aggregateId: id,
      occurredOn: new Date(),
      correlationId,
      payload: { id },
    });
  }
}
