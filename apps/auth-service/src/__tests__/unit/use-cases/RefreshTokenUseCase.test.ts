import { RefreshTokenUseCase, RefreshTokenInput } from '../../../application/use-cases/RefreshTokenUseCase';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { IRefreshTokenRepository } from '../../../domain/repositories/IRefreshTokenRepository';
import { IJwtService } from '../../../application/interfaces/IJwtService';
import { User, UserRole } from '../../../domain/entities/User';
import { RefreshToken } from '../../../domain/entities/RefreshToken';

describe('RefreshTokenUseCase', () => {
  let refreshTokenUseCase: RefreshTokenUseCase;
  let mockUserRepository: jest.Mocked<IUserRepository>;
  let mockRefreshTokenRepository: jest.Mocked<IRefreshTokenRepository>;
  let mockJwtService: jest.Mocked<IJwtService>;

  beforeEach(() => {
    mockUserRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      emailExists: jest.fn(),
    };

    mockRefreshTokenRepository = {
      findByToken: jest.fn(),
      findValidTokensByUserId: jest.fn(),
      create: jest.fn(),
      revoke: jest.fn(),
      revokeAllByUserId: jest.fn(),
      deleteExpired: jest.fn(),
    };

    mockJwtService = {
      generateAccessToken: jest.fn(),
      generateRefreshToken: jest.fn(),
      generateTokenPair: jest.fn(),
      verifyAccessToken: jest.fn(),
      verifyRefreshToken: jest.fn(),
      decode: jest.fn(),
    };

    refreshTokenUseCase = new RefreshTokenUseCase(
      mockUserRepository,
      mockRefreshTokenRepository,
      mockJwtService
    );
  });

  describe('execute', () => {
    const validInput: RefreshTokenInput = {
      refreshToken: 'valid_refresh_token',
    };

    const mockUser = new User(
      'user-123',
      'test@example.com',
      'hashed_password',
      UserRole.CUSTOMER,
      true,
      new Date(),
      new Date()
    );

    const mockRefreshToken = new RefreshToken(
      'token-123',
      'user-123',
      'valid_refresh_token',
      new Date(Date.now() + 604800000), // 7 days
      false,
      new Date(),
      null
    );

    it('should refresh tokens successfully', async () => {
      mockJwtService.verifyRefreshToken.mockReturnValue({
        userId: 'user-123',
        email: 'test@example.com',
        role: 'customer',
      });
      mockRefreshTokenRepository.findByToken.mockResolvedValue(mockRefreshToken);
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockRefreshTokenRepository.revoke.mockResolvedValue(undefined);
      mockJwtService.generateTokenPair.mockReturnValue({
        accessToken: 'new_access_token',
        refreshToken: 'new_refresh_token',
        accessTokenExpiresIn: 900,
        refreshTokenExpiresIn: 604800,
      });
      mockRefreshTokenRepository.create.mockResolvedValue({} as RefreshToken);

      const result = await refreshTokenUseCase.execute(validInput);

      expect(result.accessToken).toBe('new_access_token');
      expect(result.refreshToken).toBe('new_refresh_token');
      expect(result.expiresIn).toBe(900);
      expect(mockRefreshTokenRepository.revoke).toHaveBeenCalledWith('valid_refresh_token');
      expect(mockRefreshTokenRepository.create).toHaveBeenCalled();
    });

    it('should throw error if JWT verification fails', async () => {
      mockJwtService.verifyRefreshToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(refreshTokenUseCase.execute(validInput)).rejects.toThrow(
        'Invalid or expired refresh token'
      );
      expect(mockRefreshTokenRepository.findByToken).not.toHaveBeenCalled();
    });

    it('should throw error if token not found in database', async () => {
      mockJwtService.verifyRefreshToken.mockReturnValue({
        userId: 'user-123',
        email: 'test@example.com',
        role: 'customer',
      });
      mockRefreshTokenRepository.findByToken.mockResolvedValue(null);

      await expect(refreshTokenUseCase.execute(validInput)).rejects.toThrow('Refresh token not found');
    });

    it('should throw error if token is revoked', async () => {
      const revokedToken = new RefreshToken(
        'token-123',
        'user-123',
        'valid_refresh_token',
        new Date(Date.now() + 604800000),
        true, // revoked
        new Date(),
        new Date()
      );

      mockJwtService.verifyRefreshToken.mockReturnValue({
        userId: 'user-123',
        email: 'test@example.com',
        role: 'customer',
      });
      mockRefreshTokenRepository.findByToken.mockResolvedValue(revokedToken);

      await expect(refreshTokenUseCase.execute(validInput)).rejects.toThrow(
        'Refresh token has been revoked or expired'
      );
    });

    it('should throw error if token is expired', async () => {
      const expiredToken = new RefreshToken(
        'token-123',
        'user-123',
        'valid_refresh_token',
        new Date(Date.now() - 1000), // expired
        false,
        new Date(),
        null
      );

      mockJwtService.verifyRefreshToken.mockReturnValue({
        userId: 'user-123',
        email: 'test@example.com',
        role: 'customer',
      });
      mockRefreshTokenRepository.findByToken.mockResolvedValue(expiredToken);

      await expect(refreshTokenUseCase.execute(validInput)).rejects.toThrow(
        'Refresh token has been revoked or expired'
      );
    });

    it('should throw error if user not found', async () => {
      mockJwtService.verifyRefreshToken.mockReturnValue({
        userId: 'user-123',
        email: 'test@example.com',
        role: 'customer',
      });
      mockRefreshTokenRepository.findByToken.mockResolvedValue(mockRefreshToken);
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(refreshTokenUseCase.execute(validInput)).rejects.toThrow(
        'User not found or account deactivated'
      );
    });

    it('should throw error if user is deactivated', async () => {
      const inactiveUser = new User(
        'user-123',
        'test@example.com',
        'hashed_password',
        UserRole.CUSTOMER,
        false, // inactive
        new Date(),
        new Date()
      );

      mockJwtService.verifyRefreshToken.mockReturnValue({
        userId: 'user-123',
        email: 'test@example.com',
        role: 'customer',
      });
      mockRefreshTokenRepository.findByToken.mockResolvedValue(mockRefreshToken);
      mockUserRepository.findById.mockResolvedValue(inactiveUser);

      await expect(refreshTokenUseCase.execute(validInput)).rejects.toThrow(
        'User not found or account deactivated'
      );
    });
  });
});
