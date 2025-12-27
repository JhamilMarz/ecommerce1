import { LoginUserUseCase, LoginUserInput } from '../../../application/use-cases/login-user';
import { UserRepository } from '../../../domain/repositories/user-repository';
import { RefreshTokenRepository } from '../../../domain/repositories/refresh-token-repository';
import { PasswordHashingService } from '../../../application/interfaces/password-hashing-service';
import { JwtService } from '../../../application/interfaces/jwt-service';
import { EventPublisher } from '../../../application/interfaces/event-publisher';
import { User, UserRole } from '../../../domain/entities/user';
import { RefreshToken } from '../../../domain/entities/refresh-token';

describe('LoginUserUseCase', () => {
  let loginUserUseCase: LoginUserUseCase;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let mockRefreshTokenRepository: jest.Mocked<RefreshTokenRepository>;
  let mockPasswordHashingService: jest.Mocked<PasswordHashingService>;
  let mockJwtService: jest.Mocked<JwtService>;
  let mockEventPublisher: jest.Mocked<EventPublisher>;

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

    mockPasswordHashingService = {
      hash: jest.fn(),
      verify: jest.fn(),
    };

    mockJwtService = {
      generateAccessToken: jest.fn(),
      generateRefreshToken: jest.fn(),
      generateTokenPair: jest.fn(),
      verifyAccessToken: jest.fn(),
      verifyRefreshToken: jest.fn(),
      decode: jest.fn(),
    };

    mockEventPublisher = {
      publish: jest.fn(),
      close: jest.fn(),
    };

    loginUserUseCase = new LoginUserUseCase(
      mockUserRepository,
      mockRefreshTokenRepository,
      mockPasswordHashingService,
      mockJwtService,
      mockEventPublisher
    );
  });

  describe('execute', () => {
    const validInput: LoginUserInput = {
      email: 'test@example.com',
      password: 'Test123!@#',
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

    it('should login successfully with valid credentials', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockPasswordHashingService.verify.mockResolvedValue(true);
      mockJwtService.generateTokenPair.mockReturnValue({
        accessToken: 'access_token_123',
        refreshToken: 'refresh_token_456',
        accessTokenExpiresIn: 900,
        refreshTokenExpiresIn: 604800,
      });
      mockRefreshTokenRepository.create.mockResolvedValue({} as RefreshToken);
      mockEventPublisher.publish.mockResolvedValue(undefined);

      const result = await loginUserUseCase.execute(validInput);

      expect(result.user.id).toBe('user-123');
      expect(result.user.email).toBe('test@example.com');
      expect(result.accessToken).toBe('access_token_123');
      expect(result.refreshToken).toBe('refresh_token_456');
      expect(result.expiresIn).toBe(900);
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockPasswordHashingService.verify).toHaveBeenCalledWith('hashed_password', 'Test123!@#');
      expect(mockRefreshTokenRepository.create).toHaveBeenCalled();
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'auth.events',
        'user.logged_in',
        expect.objectContaining({
          userId: 'user-123',
          email: 'test@example.com',
        })
      );
    });

    it('should throw error if user not found', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      await expect(loginUserUseCase.execute(validInput)).rejects.toThrow('Invalid credentials');
      expect(mockPasswordHashingService.verify).not.toHaveBeenCalled();
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
      mockUserRepository.findByEmail.mockResolvedValue(inactiveUser);

      await expect(loginUserUseCase.execute(validInput)).rejects.toThrow('Account is deactivated');
      expect(mockPasswordHashingService.verify).not.toHaveBeenCalled();
    });

    it('should throw error if password is invalid', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockPasswordHashingService.verify.mockResolvedValue(false);

      await expect(loginUserUseCase.execute(validInput)).rejects.toThrow('Invalid credentials');
      expect(mockJwtService.generateTokenPair).not.toHaveBeenCalled();
    });

    it('should convert email to lowercase before lookup', async () => {
      const upperCaseInput: LoginUserInput = {
        email: 'Test@Example.COM',
        password: 'Test123!@#',
      };

      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockPasswordHashingService.verify.mockResolvedValue(true);
      mockJwtService.generateTokenPair.mockReturnValue({
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
        accessTokenExpiresIn: 900,
        refreshTokenExpiresIn: 604800,
      });
      mockRefreshTokenRepository.create.mockResolvedValue({} as RefreshToken);
      mockEventPublisher.publish.mockResolvedValue(undefined);

      await loginUserUseCase.execute(upperCaseInput);

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
    });

    it('should store refresh token in database', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockPasswordHashingService.verify.mockResolvedValue(true);
      mockJwtService.generateTokenPair.mockReturnValue({
        accessToken: 'access_token',
        refreshToken: 'refresh_token_789',
        accessTokenExpiresIn: 900,
        refreshTokenExpiresIn: 604800,
      });
      mockRefreshTokenRepository.create.mockResolvedValue({} as RefreshToken);
      mockEventPublisher.publish.mockResolvedValue(undefined);

      await loginUserUseCase.execute(validInput);

      expect(mockRefreshTokenRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          token: 'refresh_token_789',
          isRevoked: false,
        })
      );
    });
  });
});
