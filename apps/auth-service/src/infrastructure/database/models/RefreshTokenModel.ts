import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../index';
import { RefreshToken as RefreshTokenEntity } from '../../../domain/entities/RefreshToken';
import { UserModel } from './UserModel';

interface RefreshTokenAttributes {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  isRevoked: boolean;
  createdAt: Date;
  revokedAt: Date | null;
}

interface RefreshTokenCreationAttributes
  extends Optional<RefreshTokenAttributes, 'id' | 'createdAt' | 'revokedAt'> {}

export class RefreshTokenModel
  extends Model<RefreshTokenAttributes, RefreshTokenCreationAttributes>
  implements RefreshTokenAttributes
{
  declare id: string;
  declare userId: string;
  declare token: string;
  declare expiresAt: Date;
  declare isRevoked: boolean;
  declare createdAt: Date;
  declare revokedAt: Date | null;

  /**
   * Convert Sequelize model to Domain Entity
   */
  toDomainEntity(): RefreshTokenEntity {
    return new RefreshTokenEntity(
      this.id,
      this.userId,
      this.token,
      this.expiresAt,
      this.isRevoked,
      this.createdAt,
      this.revokedAt
    );
  }
}

RefreshTokenModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: UserModel,
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    token: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    isRevoked: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    revokedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'refresh_tokens',
    timestamps: false,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['token'],
      },
      {
        fields: ['user_id'],
      },
      {
        fields: ['expires_at'],
      },
      {
        fields: ['is_revoked'],
      },
    ],
  }
);

// Define associations
UserModel.hasMany(RefreshTokenModel, {
  foreignKey: 'userId',
  as: 'refreshTokens',
});

RefreshTokenModel.belongsTo(UserModel, {
  foreignKey: 'userId',
  as: 'user',
});
