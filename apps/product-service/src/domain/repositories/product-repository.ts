import { Product } from '../entities/product';

export interface ProductRepository {
  findById(id: string): Promise<Product | null>;
  findBySku(sku: string): Promise<Product | null>;
  findBySellerId(sellerId: string): Promise<Product[]>;
  findByCategory(categoryId: string): Promise<Product[]>;
  findAll(filters?: { status?: string; minPrice?: number; maxPrice?: number }): Promise<Product[]>;
  save(product: Product): Promise<Product>;
  update(product: Product): Promise<Product>;
  delete(id: string): Promise<void>;
}
