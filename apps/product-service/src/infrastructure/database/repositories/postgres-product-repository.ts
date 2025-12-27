import { Product, ProductStatus } from '../../../domain/entities/product';
import { ProductRepository } from '../../../domain/repositories/product-repository';
import { ProductModel } from '../models/product-model';

export class PostgresProductRepository implements ProductRepository {
  async findById(id: string): Promise<Product | null> {
    const model = await ProductModel.findByPk(id);
    return model ? this.toDomain(model) : null;
  }

  async findBySku(sku: string): Promise<Product | null> {
    const model = await ProductModel.findOne({ where: { sku } });
    return model ? this.toDomain(model) : null;
  }

  async findBySellerId(sellerId: string): Promise<Product[]> {
    const models = await ProductModel.findAll({ where: { sellerId } });
    return models.map((m) => this.toDomain(m));
  }

  async findByCategory(categoryId: string): Promise<Product[]> {
    const models = await ProductModel.findAll({ where: { categoryId } });
    return models.map((m) => this.toDomain(m));
  }

  async findAll(filters?: { status?: string; minPrice?: number; maxPrice?: number }): Promise<Product[]> {
    const where: Record<string, unknown> = {};
    
    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.minPrice !== undefined || filters?.maxPrice !== undefined) {
      where.price = {};
      if (filters.minPrice !== undefined) {
        (where.price as Record<string, unknown>).gte = filters.minPrice;
      }
      if (filters.maxPrice !== undefined) {
        (where.price as Record<string, unknown>).lte = filters.maxPrice;
      }
    }

    const models = await ProductModel.findAll({ where });
    return models.map((m) => this.toDomain(m));
  }

  async save(product: Product): Promise<Product> {
    const model = await ProductModel.create({
      name: product.name,
      description: product.description,
      price: product.price,
      categoryId: product.categoryId,
      sellerId: product.sellerId,
      sku: product.sku,
      status: product.status,
      images: product.images,
    });

    return this.toDomain(model);
  }

  async update(product: Product): Promise<Product> {
    const model = await ProductModel.findByPk(product.id);
    if (!model) {
      throw new Error(`Product ${product.id} not found`);
    }

    await model.update({
      name: product.name,
      description: product.description,
      price: product.price,
      categoryId: product.categoryId,
      status: product.status,
      images: product.images,
      updatedAt: product.updatedAt,
    });

    return this.toDomain(model);
  }

  async delete(id: string): Promise<void> {
    await ProductModel.destroy({ where: { id } });
  }

  private toDomain(model: ProductModel): Product {
    return Product.reconstitute({
      id: model.id,
      name: model.name,
      description: model.description,
      price: parseFloat(model.price.toString()),
      categoryId: model.categoryId,
      sellerId: model.sellerId,
      sku: model.sku,
      status: model.status as ProductStatus,
      images: model.images,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    });
  }
}
