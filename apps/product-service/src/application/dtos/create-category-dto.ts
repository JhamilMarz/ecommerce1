export interface CreateCategoryDto {
  name: string;
  description: string;
  parentId?: string | null;
  slug: string;
}
