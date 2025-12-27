import { Inventory } from '../../../domain/entities/inventory';
import { InventoryRepository } from '../../../domain/repositories/inventory-repository';
import { InventoryModel } from '../models/inventory-model';

export class PostgresInventoryRepository implements InventoryRepository {
  async findById(id: string): Promise<Inventory | null> {
    const model = await InventoryModel.findByPk(id);
    return model ? this.toDomain(model) : null;
  }

  async findByProductId(productId: string): Promise<Inventory | null> {
    const model = await InventoryModel.findOne({ where: { productId } });
    return model ? this.toDomain(model) : null;
  }

  async save(inventory: Inventory): Promise<Inventory> {
    const model = await InventoryModel.create({
      productId: inventory.productId,
      quantity: inventory.quantity,
      reservedQuantity: inventory.reservedQuantity,
    });

    return this.toDomain(model);
  }

  async update(inventory: Inventory): Promise<Inventory> {
    const model = await InventoryModel.findByPk(inventory.id);
    if (!model) {
      throw new Error(`Inventory ${inventory.id} not found`);
    }

    await model.update({
      quantity: inventory.quantity,
      reservedQuantity: inventory.reservedQuantity,
      updatedAt: inventory.updatedAt,
    });

    return this.toDomain(model);
  }

  async delete(id: string): Promise<void> {
    await InventoryModel.destroy({ where: { id } });
  }

  private toDomain(model: InventoryModel): Inventory {
    return Inventory.reconstitute({
      id: model.id,
      productId: model.productId,
      quantity: model.quantity,
      reservedQuantity: model.reservedQuantity,
      updatedAt: model.updatedAt,
    });
  }
}
