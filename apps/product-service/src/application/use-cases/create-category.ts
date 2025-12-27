import { Category } from '../../domain/entities/category';
import { CategoryRepository } from '../../domain/repositories/category-repository';
import { CreateCategoryDto } from '../dtos/create-category-dto';

export class CreateCategoryUseCase {
  constructor(private categoryRepository: CategoryRepository) {}

  async execute(dto: CreateCategoryDto): Promise<Category> {
    // Validate parent exists if provided
    if (dto.parentId) {
      const parent = await this.categoryRepository.findById(dto.parentId);
      if (!parent) {
        throw new Error(`Parent category ${dto.parentId} not found`);
      }
    }

    // Check slug uniqueness
    const existing = await this.categoryRepository.findBySlug(dto.slug);
    if (existing) {
      throw new Error(`Category with slug ${dto.slug} already exists`);
    }

    const category = Category.create({
      name: dto.name,
      description: dto.description,
      parentId: dto.parentId || null,
      slug: dto.slug,
    });

    return this.categoryRepository.save(category);
  }
}
