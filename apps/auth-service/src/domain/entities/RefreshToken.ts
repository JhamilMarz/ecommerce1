/**
 * RefreshToken Domain Entity
 * Represents a refresh token for JWT authentication
 */
export class RefreshToken {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly token: string,
    public readonly expiresAt: Date,
    public readonly isRevoked: boolean,
    public readonly createdAt: Date,
    public readonly revokedAt: Date | null
  ) {}

  /**
   * Factory method to create a new refresh token
   */
  static create(
    userId: string,
    token: string,
    expiresAt: Date
  ): Omit<RefreshToken, 'id' | 'createdAt' | 'revokedAt'> {
    return {
      userId,
      token,
      expiresAt,
      isRevoked: false,
    };
  }

  /**
   * Check if token is expired
   */
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  /**
   * Check if token is valid (not expired and not revoked)
   */
  isValid(): boolean {
    return !this.isExpired() && !this.isRevoked;
  }

  /**
   * Revoke the refresh token
   */
  revoke(): RefreshToken {
    return new RefreshToken(
      this.id,
      this.userId,
      this.token,
      this.expiresAt,
      true,
      this.createdAt,
      new Date()
    );
  }
}
