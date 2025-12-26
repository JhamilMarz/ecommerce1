import { Op } from 'sequelize';
import { RefreshToken } from '../../../domain/entities/RefreshToken';
import { IRefreshTokenRepository, CreateRefreshTokenData } from '../../../domain/repositories/IRefreshTokenRepository';
import { RefreshTokenModel } from '../models/RefreshTokenModel';

/**
 * RefreshToken Repository Implementation using Sequelize
 */
export class RefreshTokenRepository implements IRefreshTokenRepository {
  async findByToken(token: string): Promise<RefreshToken | null> {
    const tokenModel = await RefreshTokenModel.findOne({
      where: { token },
    });
    return tokenModel ? tokenModel.toDomainEntity() : null;
  }

  async findValidTokensByUserId(userId: string): Promise<RefreshToken[]> {
    const tokenModels = await RefreshTokenModel.findAll({
      where: {
        userId,
        isRevoked: false,
        expiresAt: {
          [Op.gt]: new Date(),
        },
      },
      order: [['createdAt', 'DESC']],
    });

    return tokenModels.map((model) => model.toDomainEntity());
  }

  async create(
    refreshToken: CreateRefreshTokenData
  ): Promise<RefreshToken> {
    const tokenModel = await RefreshTokenModel.create({
      userId: refreshToken.userId,
      token: refreshToken.token,
      expiresAt: refreshToken.expiresAt,
      isRevoked: refreshToken.isRevoked,
    });

    return tokenModel.toDomainEntity();
  }

  async revoke(token: string): Promise<void> {
    await RefreshTokenModel.update(
      {
        isRevoked: true,
        revokedAt: new Date(),
      },
      {
        where: { token },
      }
    );
  }

  async revokeAllByUserId(userId: string): Promise<void> {
    await RefreshTokenModel.update(
      {
        isRevoked: true,
        revokedAt: new Date(),
      },
      {
        where: {
          userId,
          isRevoked: false,
        },
      }
    );
  }

  async deleteExpired(): Promise<void> {
    await RefreshTokenModel.destroy({
      where: {
        expiresAt: {
          [Op.lt]: new Date(),
        },
      },
    });
  }
}
