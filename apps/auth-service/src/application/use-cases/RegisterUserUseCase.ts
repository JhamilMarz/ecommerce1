import { User, UserRole } from '../../domain/entities/User';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { IPasswordHashingService } from '../interfaces/IPasswordHashingService';
import { IEventPublisher } from '../interfaces/IEventPublisher';

export interface RegisterUserInput {
  email: string;
  password: string;
  role?: UserRole;
}

export interface RegisterUserOutput {
  user: {
    id: string;
    email: string;
    role: string;
    isActive: boolean;
    createdAt: Date;
  };
}

/**
 * Register User Use Case
 * Handles user registration with validation and security
 */
export class RegisterUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordHashingService: IPasswordHashingService,
    private readonly eventPublisher: IEventPublisher
  ) {}

  async execute(input: RegisterUserInput): Promise<RegisterUserOutput> {
    // Validate email format
    if (!this.isValidEmail(input.email)) {
      throw new Error('Invalid email format');
    }

    // Validate password strength
    if (!this.isValidPassword(input.password)) {
      throw new Error(
        'Password must be at least 8 characters long and contain uppercase, lowercase, number and special character'
      );
    }

    // Check if email already exists
    const emailExists = await this.userRepository.emailExists(input.email);
    if (emailExists) {
      throw new Error('Email already registered');
    }

    // Hash password
    const passwordHash = await this.passwordHashingService.hash(input.password);

    // Create user
    const userData = User.create(
      input.email.toLowerCase(),
      passwordHash,
      input.role || UserRole.CUSTOMER
    );

    const user = await this.userRepository.create(userData);

    // Publish user.registered event
    await this.eventPublisher.publish('auth.events', 'user.registered', {
      userId: user.id,
      email: user.email,
      role: user.role,
      timestamp: new Date().toISOString(),
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
    };
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidPassword(password: string): boolean {
    // At least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
    const minLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return minLength && hasUppercase && hasLowercase && hasNumber && hasSpecial;
  }
}
