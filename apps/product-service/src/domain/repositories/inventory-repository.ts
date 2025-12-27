import { Inventory } from '../entities/inventory';

export interface InventoryRepository {
  findById(id: string): Promise<Inventory | null>;
  findByProductId(productId: string): Promise<Inventory | null>;
  save(inventory: Inventory): Promise<Inventory>;
  update(inventory: Inventory): Promise<Inventory>;
  delete(id: string): Promise<void>;
}
