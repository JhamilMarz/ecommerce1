import { Category } from '../../../domain/entities/category';
import { CategoryRepository } from '../../../domain/repositories/category-repository';
import { CategoryModel } from '../models/category-model';

export class PostgresCategoryRepository implements CategoryRepository {
  async findById(id: string): Promise<Category | null> {
    const model = await CategoryModel.findByPk(id);
    return model ? this.toDomain(model) : null;
  }

  async findBySlug(slug: string): Promise<Category | null> {
    const model = await CategoryModel.findOne({ where: { slug } });
    return model ? this.toDomain(model) : null;
  }

  async findByParentId(parentId: string | null): Promise<Category[]> {
    const models = await CategoryModel.findAll({ where: { parentId } });
    return models.map((m) => this.toDomain(m));
  }

  async findAll(): Promise<Category[]> {
    const models = await CategoryModel.findAll();
    return models.map((m) => this.toDomain(m));
  }

  async save(category: Category): Promise<Category> {
    const model = await CategoryModel.create({
      name: category.name,
      description: category.description,
      parentId: category.parentId,
      slug: category.slug,
    });

    return this.toDomain(model);
  }

  async update(category: Category): Promise<Category> {
    const model = await CategoryModel.findByPk(category.id);
    if (!model) {
      throw new Error(`Category ${category.id} not found`);
    }

    await model.update({
      name: category.name,
      description: category.description,
      updatedAt: category.updatedAt,
    });

    return this.toDomain(model);
  }

  async delete(id: string): Promise<void> {
    await CategoryModel.destroy({ where: { id } });
  }

  private toDomain(model: CategoryModel): Category {
    return Category.reconstitute({
      id: model.id,
      name: model.name,
      description: model.description,
      parentId: model.parentId,
      slug: model.slug,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    });
  }
}
