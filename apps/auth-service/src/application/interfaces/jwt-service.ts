/**
 * JWT Payload interface
 */
export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

/**
 * Token Pair interface
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
  refreshTokenExpiresIn: number;
}

/**
 * JWT Service Interface
 * Abstraction for JWT token operations
 */
export interface JwtService {
  /**
   * Generate access token
   */
  generateAccessToken(payload: JwtPayload): string;

  /**
   * Generate refresh token
   */
  generateRefreshToken(payload: JwtPayload): string;

  /**
   * Generate both access and refresh tokens
   */
  generateTokenPair(payload: JwtPayload): TokenPair;

  /**
   * Verify and decode access token
   */
  verifyAccessToken(token: string): JwtPayload;

  /**
   * Verify and decode refresh token
   */
  verifyRefreshToken(token: string): JwtPayload;

  /**
   * Decode token without verifying (for expired tokens)
   */
  decode(token: string): JwtPayload | null;
}
