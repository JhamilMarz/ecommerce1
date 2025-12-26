import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { IRefreshTokenRepository } from '../../domain/repositories/IRefreshTokenRepository';
import { IPasswordHashingService } from '../interfaces/IPasswordHashingService';
import { IJwtService, JwtPayload } from '../interfaces/IJwtService';
import { IEventPublisher } from '../interfaces/IEventPublisher';
import { RefreshToken } from '../../domain/entities/RefreshToken';

export interface LoginUserInput {
  email: string;
  password: string;
}

export interface LoginUserOutput {
  user: {
    id: string;
    email: string;
    role: string;
  };
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Login User Use Case
 * Handles user authentication with JWT token generation
 */
export class LoginUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly passwordHashingService: IPasswordHashingService,
    private readonly jwtService: IJwtService,
    private readonly eventPublisher: IEventPublisher
  ) {}

  async execute(input: LoginUserInput): Promise<LoginUserOutput> {
    // Find user by email
    const user = await this.userRepository.findByEmail(input.email.toLowerCase());
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new Error('Account is deactivated');
    }

    // Verify password
    const isPasswordValid = await this.passwordHashingService.verify(
      user.passwordHash,
      input.password
    );
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Generate JWT tokens
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const tokenPair = this.jwtService.generateTokenPair(payload);

    // Store refresh token in database
    const expiresAt = new Date(Date.now() + tokenPair.refreshTokenExpiresIn * 1000);
    const refreshTokenData = RefreshToken.create(
      user.id,
      tokenPair.refreshToken,
      expiresAt
    );

    await this.refreshTokenRepository.create(refreshTokenData);

    // Publish user.logged_in event
    await this.eventPublisher.publish('auth.events', 'user.logged_in', {
      userId: user.id,
      email: user.email,
      timestamp: new Date().toISOString(),
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      expiresIn: tokenPair.accessTokenExpiresIn,
    };
  }
}
