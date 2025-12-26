import { RefreshToken } from '../entities/RefreshToken';

/**
 * RefreshToken Repository Interface
 * Defines the contract for refresh token persistence operations
 */
export interface IRefreshTokenRepository {
  /**
   * Find a refresh token by token string
   */
  findByToken(token: string): Promise<RefreshToken | null>;

  /**
   * Find all valid (non-revoked, non-expired) tokens for a user
   */
  findValidTokensByUserId(userId: string): Promise<RefreshToken[]>;

  /**
   * Create a new refresh token
   */
  create(refreshToken: Omit<RefreshToken, 'id' | 'createdAt' | 'revokedAt'>): Promise<RefreshToken>;

  /**
   * Revoke a refresh token
   */
  revoke(token: string): Promise<void>;

  /**
   * Revoke all tokens for a user (logout from all devices)
   */
  revokeAllByUserId(userId: string): Promise<void>;

  /**
   * Delete expired tokens (cleanup)
   */
  deleteExpired(): Promise<void>;
}
