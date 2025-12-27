export interface CategoryProps {
  id: string;
  name: string;
  description: string;
  parentId: string | null;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

export class Category {
  private constructor(private props: CategoryProps) {}

  static create(data: Omit<CategoryProps, 'id' | 'createdAt' | 'updatedAt'>): Category {
    const now = new Date();
    return new Category({
      ...data,
      id: '', // Will be set by repository
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstitute(props: CategoryProps): Category {
    return new Category(props);
  }

  // Getters
  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get description(): string {
    return this.props.description;
  }

  get parentId(): string | null {
    return this.props.parentId;
  }

  get slug(): string {
    return this.props.slug;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  // Business logic
  updateDetails(data: { name?: string; description?: string }): void {
    if (data.name) this.props.name = data.name;
    if (data.description) this.props.description = data.description;
    this.props.updatedAt = new Date();
  }

  toJSON(): CategoryProps {
    return { ...this.props };
  }
}
