import { UserRepository } from '../../domain/repositories/user-repository';
import { RefreshTokenRepository } from '../../domain/repositories/refresh-token-repository';
import { PasswordHashingService } from '../interfaces/password-hashing-service';
import { JwtService, JwtPayload } from '../interfaces/jwt-service';
import { EventPublisher } from '../interfaces/event-publisher';
import { RefreshToken } from '../../domain/entities/refresh-token';

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
    private readonly userRepository: UserRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly passwordHashingService: PasswordHashingService,
    private readonly jwtService: JwtService,
    private readonly eventPublisher: EventPublisher
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
