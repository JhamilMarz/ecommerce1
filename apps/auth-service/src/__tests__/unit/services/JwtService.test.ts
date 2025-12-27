import { JoseJwtService } from '../../../infrastructure/services/jose-jwt-service';
import { JwtPayload } from '../../../application/interfaces/jwt-service';
import jwt from 'jsonwebtoken';

// Mock config
jest.mock('../../../infrastructure/config', () => ({
  config: {
    jwt: {
      accessTokenSecret: 'test-access-secret',
      refreshTokenSecret: 'test-refresh-secret',
      accessTokenExpiresIn: 900,
      refreshTokenExpiresIn: 604800,
    },
  },
}));

describe('JwtService', () => {
  let jwtService: JoseJwtService;

  beforeEach(() => {
    jwtService = new JoseJwtService();
  });

  describe('generateAccessToken', () => {
    it('should generate a valid access token', () => {
      const payload: JwtPayload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'customer',
      };

      const token = jwtService.generateAccessToken(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const decoded = jwt.verify(token, 'test-access-secret') as any;
      expect(decoded.userId).toBe('user-123');
      expect(decoded.email).toBe('test@example.com');
      expect(decoded.role).toBe('customer');
      expect(decoded.iss).toBe('auth-service');
      expect(decoded.aud).toBe('api-gateway');
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const payload: JwtPayload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'customer',
      };

      const token = jwtService.generateRefreshToken(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const decoded = jwt.verify(token, 'test-refresh-secret') as any;
      expect(decoded.userId).toBe('user-123');
      expect(decoded.iss).toBe('auth-service');
      expect(decoded.aud).toBe('auth-service');
    });
  });

  describe('generateTokenPair', () => {
    it('should generate both access and refresh tokens', () => {
      const payload: JwtPayload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'customer',
      };

      const tokenPair = jwtService.generateTokenPair(payload);

      expect(tokenPair.accessToken).toBeDefined();
      expect(tokenPair.refreshToken).toBeDefined();
      expect(tokenPair.accessTokenExpiresIn).toBe(900);
      expect(tokenPair.refreshTokenExpiresIn).toBe(604800);
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify a valid access token', () => {
      const payload: JwtPayload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'customer',
      };

      const token = jwtService.generateAccessToken(payload);
      const decoded = jwtService.verifyAccessToken(token);

      expect(decoded.userId).toBe('user-123');
      expect(decoded.email).toBe('test@example.com');
      expect(decoded.role).toBe('customer');
    });

    it('should throw error for invalid access token', () => {
      expect(() => jwtService.verifyAccessToken('invalid_token')).toThrow();
    });

    it('should throw error for expired access token', () => {
      const expiredToken = jwt.sign(
        { userId: 'user-123' },
        'test-access-secret',
        { expiresIn: -1 }
      );

      expect(() => jwtService.verifyAccessToken(expiredToken)).toThrow();
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify a valid refresh token', () => {
      const payload: JwtPayload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'customer',
      };

      const token = jwtService.generateRefreshToken(payload);
      const decoded = jwtService.verifyRefreshToken(token);

      expect(decoded.userId).toBe('user-123');
    });

    it('should throw error for invalid refresh token', () => {
      expect(() => jwtService.verifyRefreshToken('invalid_token')).toThrow();
    });
  });

  describe('decode', () => {
    it('should decode token without verification', () => {
      const payload: JwtPayload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'customer',
      };

      const token = jwtService.generateAccessToken(payload);
      const decoded = jwtService.decode(token);

      expect(decoded).not.toBeNull();
      if (decoded) {
        expect(decoded.userId).toBe('user-123');
        expect(decoded.email).toBe('test@example.com');
      }
    });
  });
});
