import { Category } from '../../domain/entities/category';
import { CategoryRepository } from '../../domain/repositories/category-repository';

export class ListCategoriesUseCase {
  constructor(private categoryRepository: CategoryRepository) {}

  async execute(): Promise<Category[]> {
    return this.categoryRepository.findAll();
  }
}
