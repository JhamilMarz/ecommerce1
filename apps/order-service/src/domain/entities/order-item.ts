/**
 * OrderItem Entity (within Order Aggregate)
 * 
 * Architecture note:
 * - OrderItem is an Entity WITHIN the Order Aggregate
 * - It is NOT a separate aggregate root
 * - It can only be accessed through the Order aggregate
 * - Stores price and product name as SNAPSHOTS (not references)
 */
export class OrderItem {
  constructor(
    public readonly productId: string,
    public readonly productName: string,
    public readonly quantity: number,
    public readonly priceSnapshot: number,
  ) {
    this.validate();
  }

  /**
   * Calculate subtotal for this line item
   */
  public calculateSubtotal(): number {
    return this.quantity * this.priceSnapshot;
  }

  /**
   * Domain validation
   */
  private validate(): void {
    if (!this.productId || this.productId.trim() === '') {
      throw new Error('OrderItem: productId is required');
    }

    if (!this.productName || this.productName.trim() === '') {
      throw new Error('OrderItem: productName is required');
    }

    if (this.quantity <= 0) {
      throw new Error('OrderItem: quantity must be greater than 0');
    }

    if (this.priceSnapshot < 0) {
      throw new Error('OrderItem: priceSnapshot cannot be negative');
    }
  }

  /**
   * Create a copy with new quantity
   */
  public withQuantity(newQuantity: number): OrderItem {
    return new OrderItem(
      this.productId,
      this.productName,
      newQuantity,
      this.priceSnapshot,
    );
  }
}
