export enum ProductStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  OUT_OF_STOCK = 'out_of_stock',
}

export interface ProductProps {
  id: string;
  name: string;
  description: string;
  price: number;
  categoryId: string;
  sellerId: string;
  sku: string;
  status: ProductStatus;
  images: string[];
  createdAt: Date;
  updatedAt: Date;
}

export class Product {
  private constructor(private props: ProductProps) {}

  static create(data: Omit<ProductProps, 'id' | 'createdAt' | 'updatedAt'>): Product {
    const now = new Date();
    return new Product({
      ...data,
      id: '', // Will be set by repository
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstitute(props: ProductProps): Product {
    return new Product(props);
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

  get price(): number {
    return this.props.price;
  }

  get categoryId(): string {
    return this.props.categoryId;
  }

  get sellerId(): string {
    return this.props.sellerId;
  }

  get sku(): string {
    return this.props.sku;
  }

  get status(): ProductStatus {
    return this.props.status;
  }

  get images(): string[] {
    return [...this.props.images];
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  // Business logic
  updateDetails(data: { name?: string; description?: string; price?: number }): void {
    if (data.name) this.props.name = data.name;
    if (data.description) this.props.description = data.description;
    if (data.price !== undefined) {
      if (data.price < 0) {
        throw new Error('Price cannot be negative');
      }
      this.props.price = data.price;
    }
    this.props.updatedAt = new Date();
  }

  activate(): void {
    this.props.status = ProductStatus.ACTIVE;
    this.props.updatedAt = new Date();
  }

  deactivate(): void {
    this.props.status = ProductStatus.INACTIVE;
    this.props.updatedAt = new Date();
  }

  markOutOfStock(): void {
    this.props.status = ProductStatus.OUT_OF_STOCK;
    this.props.updatedAt = new Date();
  }

  toJSON(): ProductProps {
    return { ...this.props };
  }
}
