export interface UpdateProductDto {
  name?: string;
  description?: string;
  price?: number;
  categoryId?: string;
  status?: string;
  images?: string[];
}
