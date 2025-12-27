import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../connection';

interface CategoryAttributes {
  id: string;
  name: string;
  description: string;
  parentId: string | null;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

interface CategoryCreationAttributes extends Optional<CategoryAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class CategoryModel extends Model<CategoryAttributes, CategoryCreationAttributes> implements CategoryAttributes {
  declare id: string;
  declare name: string;
  declare description: string;
  declare parentId: string | null;
  declare slug: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

CategoryModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    parentId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'parent_id',
    },
    slug: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true,
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
    tableName: 'categories',
    timestamps: true,
    indexes: [
      { fields: ['slug'] },
      { fields: ['parent_id'] },
    ],
  },
);
