import jwt from 'jsonwebtoken';
import { IJwtService, JwtPayload, TokenPair } from '../../application/interfaces/IJwtService';
import { config } from '../config';

/**
 * JWT Service Implementation
 * Handles JWT token generation and verification using jsonwebtoken
 */
export class JwtService implements IJwtService {
  generateAccessToken(payload: JwtPayload): string {
    return jwt.sign(payload, config.jwt.accessTokenSecret, {
      expiresIn: config.jwt.accessTokenExpiresIn,
      issuer: 'auth-service',
      audience: 'api-gateway',
    });
  }

  generateRefreshToken(payload: JwtPayload): string {
    return jwt.sign(payload, config.jwt.refreshTokenSecret, {
      expiresIn: config.jwt.refreshTokenExpiresIn,
      issuer: 'auth-service',
      audience: 'auth-service',
    });
  }

  generateTokenPair(payload: JwtPayload): TokenPair {
    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload),
      accessTokenExpiresIn: config.jwt.accessTokenExpiresIn,
      refreshTokenExpiresIn: config.jwt.refreshTokenExpiresIn,
    };
  }

  verifyAccessToken(token: string): JwtPayload {
    try {
      const decoded = jwt.verify(token, config.jwt.accessTokenSecret, {
        issuer: 'auth-service',
        audience: 'api-gateway',
      }) as JwtPayload;

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Access token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid access token');
      }
      throw error;
    }
  }

  verifyRefreshToken(token: string): JwtPayload {
    try {
      const decoded = jwt.verify(token, config.jwt.refreshTokenSecret, {
        issuer: 'auth-service',
        audience: 'auth-service',
      }) as JwtPayload;

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Refresh token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid refresh token');
      }
      throw error;
    }
  }

  decode(token: string): JwtPayload | null {
    try {
      const decoded = jwt.decode(token) as JwtPayload;
      return decoded;
    } catch {
      return null;
    }
  }
}
