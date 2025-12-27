import { Product } from '../../domain/entities/product';
import { ProductRepository } from '../../domain/repositories/product-repository';

export interface ListProductsFilters {
  status?: string;
  minPrice?: number;
  maxPrice?: number;
  categoryId?: string;
  sellerId?: string;
}

export class ListProductsUseCase {
  constructor(private productRepository: ProductRepository) {}

  async execute(filters?: ListProductsFilters): Promise<Product[]> {
    if (filters?.categoryId) {
      return this.productRepository.findByCategory(filters.categoryId);
    }

    if (filters?.sellerId) {
      return this.productRepository.findBySellerId(filters.sellerId);
    }

    return this.productRepository.findAll({
      status: filters?.status,
      minPrice: filters?.minPrice,
      maxPrice: filters?.maxPrice,
    });
  }
}
