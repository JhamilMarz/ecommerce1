import { Product } from '../../domain/entities/product';
import { ProductRepository } from '../../domain/repositories/product-repository';

export class GetProductUseCase {
  constructor(private productRepository: ProductRepository) {}

  async execute(id: string): Promise<Product> {
    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new Error(`Product ${id} not found`);
    }
    return product;
  }
}
