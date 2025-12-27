import { Category } from '../entities/category';

export interface CategoryRepository {
  findById(id: string): Promise<Category | null>;
  findBySlug(slug: string): Promise<Category | null>;
  findByParentId(parentId: string | null): Promise<Category[]>;
  findAll(): Promise<Category[]>;
  save(category: Category): Promise<Category>;
  update(category: Category): Promise<Category>;
  delete(id: string): Promise<void>;
}
