import { ProductStatus } from '../../domain/entities/product';

export interface CreateProductDto {
  name: string;
  description: string;
  price: number;
  categoryId: string;
  sellerId: string;
  sku: string;
  status?: ProductStatus;
  images?: string[];
}
