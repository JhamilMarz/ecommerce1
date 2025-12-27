import { UserRepository } from '../../domain/repositories/user-repository';
import { RefreshTokenRepository } from '../../domain/repositories/refresh-token-repository';
import { JwtService, JwtPayload } from '../interfaces/jwt-service';
import { RefreshToken } from '../../domain/entities/refresh-token';

export interface RefreshTokenInput {
  refreshToken: string;
}

export interface RefreshTokenOutput {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Refresh Token Use Case
 * Handles token refresh with rotation (old token is revoked, new one issued)
 */
export class RefreshTokenUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly jwtService: JwtService
  ) {}

  async execute(input: RefreshTokenInput): Promise<RefreshTokenOutput> {
    // Verify refresh token JWT signature
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verifyRefreshToken(input.refreshToken);
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }

    // Find refresh token in database
    const storedToken = await this.refreshTokenRepository.findByToken(input.refreshToken);
    if (!storedToken) {
      throw new Error('Refresh token not found');
    }

    // Check if token is valid (not revoked, not expired)
    if (!storedToken.isValid()) {
      throw new Error('Refresh token has been revoked or expired');
    }

    // Verify user still exists and is active
    const user = await this.userRepository.findById(payload.userId);
    if (!user || !user.isActive) {
      throw new Error('User not found or account deactivated');
    }

    // Revoke old refresh token (rotation)
    await this.refreshTokenRepository.revoke(input.refreshToken);

    // Generate new token pair
    const newPayload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const tokenPair = this.jwtService.generateTokenPair(newPayload);

    // Store new refresh token
    const expiresAt = new Date(Date.now() + tokenPair.refreshTokenExpiresIn * 1000);
    const newRefreshTokenData = RefreshToken.create(
      user.id,
      tokenPair.refreshToken,
      expiresAt
    );

    await this.refreshTokenRepository.create(newRefreshTokenData);

    return {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      expiresIn: tokenPair.accessTokenExpiresIn,
    };
  }
}
