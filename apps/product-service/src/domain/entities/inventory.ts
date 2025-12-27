export interface InventoryProps {
  id: string;
  productId: string;
  quantity: number;
  reservedQuantity: number;
  updatedAt: Date;
}

export class Inventory {
  private constructor(private props: InventoryProps) {}

  static create(data: Omit<InventoryProps, 'id' | 'updatedAt'>): Inventory {
    return new Inventory({
      ...data,
      id: '', // Will be set by repository
      updatedAt: new Date(),
    });
  }

  static reconstitute(props: InventoryProps): Inventory {
    return new Inventory(props);
  }

  // Getters
  get id(): string {
    return this.props.id;
  }

  get productId(): string {
    return this.props.productId;
  }

  get quantity(): number {
    return this.props.quantity;
  }

  get reservedQuantity(): number {
    return this.props.reservedQuantity;
  }

  get availableQuantity(): number {
    return this.props.quantity - this.props.reservedQuantity;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  // Business logic
  reserve(amount: number): void {
    if (amount <= 0) {
      throw new Error('Reserve amount must be positive');
    }
    if (this.availableQuantity < amount) {
      throw new Error('Insufficient inventory');
    }
    this.props.reservedQuantity += amount;
    this.props.updatedAt = new Date();
  }

  release(amount: number): void {
    if (amount <= 0) {
      throw new Error('Release amount must be positive');
    }
    if (this.props.reservedQuantity < amount) {
      throw new Error('Cannot release more than reserved');
    }
    this.props.reservedQuantity -= amount;
    this.props.updatedAt = new Date();
  }

  decrementStock(amount: number): void {
    if (amount <= 0) {
      throw new Error('Decrement amount must be positive');
    }
    if (this.props.quantity < amount) {
      throw new Error('Insufficient stock');
    }
    this.props.quantity -= amount;
    this.props.updatedAt = new Date();
  }

  incrementStock(amount: number): void {
    if (amount <= 0) {
      throw new Error('Increment amount must be positive');
    }
    this.props.quantity += amount;
    this.props.updatedAt = new Date();
  }

  toJSON(): InventoryProps {
    return { ...this.props };
  }
}
