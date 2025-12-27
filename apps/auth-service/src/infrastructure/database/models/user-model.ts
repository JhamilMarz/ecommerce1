import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../index';
import { User as UserEntity, UserRole } from '../../../domain/entities/user';

interface UserAttributes {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class UserModel extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  declare id: string;
  declare email: string;
  declare passwordHash: string;
  declare role: UserRole;
  declare isActive: boolean;
  declare createdAt: Date;
  declare updatedAt: Date;

  /**
   * Convert Sequelize model to Domain Entity
   */
  toDomainEntity(): UserEntity {
    return new UserEntity(
      this.id,
      this.email,
      this.passwordHash,
      this.role,
      this.isActive,
      this.createdAt,
      this.updatedAt
    );
  }
}

UserModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM(...Object.values(UserRole)),
      allowNull: false,
      defaultValue: UserRole.CUSTOMER,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'users',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['email'],
      },
    ],
  }
);
