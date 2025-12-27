import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../connection';

interface ProductAttributes {
  id: string;
  name: string;
  description: string;
  price: number;
  categoryId: string;
  sellerId: string;
  sku: string;
  status: string;
  images: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface ProductCreationAttributes extends Optional<ProductAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class ProductModel extends Model<ProductAttributes, ProductCreationAttributes> implements ProductAttributes {
  declare id: string;
  declare name: string;
  declare description: string;
  declare price: number;
  declare categoryId: string;
  declare sellerId: string;
  declare sku: string;
  declare status: string;
  declare images: string[];
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

ProductModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    categoryId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'category_id',
    },
    sellerId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'seller_id',
    },
    sku: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'draft',
    },
    images: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: false,
      defaultValue: [],
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'updated_at',
    },
  },
  {
    sequelize,
    tableName: 'products',
    timestamps: true,
    indexes: [
      { fields: ['sku'] },
      { fields: ['category_id'] },
      { fields: ['seller_id'] },
      { fields: ['status'] },
    ],
  },
);
