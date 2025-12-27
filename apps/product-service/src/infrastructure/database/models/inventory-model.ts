import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../connection';

interface InventoryAttributes {
  id: string;
  productId: string;
  quantity: number;
  reservedQuantity: number;
  updatedAt: Date;
}

interface InventoryCreationAttributes extends Optional<InventoryAttributes, 'id' | 'updatedAt'> {}

export class InventoryModel extends Model<InventoryAttributes, InventoryCreationAttributes> implements InventoryAttributes {
  declare id: string;
  declare productId: string;
  declare quantity: number;
  declare reservedQuantity: number;
  declare readonly updatedAt: Date;
}

InventoryModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      field: 'product_id',
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    reservedQuantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'reserved_quantity',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'updated_at',
    },
  },
  {
    sequelize,
    tableName: 'inventory',
    timestamps: true,
    createdAt: false,
    indexes: [{ fields: ['product_id'] }],
  },
);
