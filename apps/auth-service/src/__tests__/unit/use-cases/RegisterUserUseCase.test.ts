import { RegisterUserUseCase, RegisterUserInput } from '../../../application/use-cases/register-user';
import { UserRepository } from '../../../domain/repositories/user-repository';
import { PasswordHashingService } from '../../../application/interfaces/password-hashing-service';
import { EventPublisher } from '../../../application/interfaces/event-publisher';
import { User, UserRole } from '../../../domain/entities/user';

describe('RegisterUserUseCase', () => {
  let registerUserUseCase: RegisterUserUseCase;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let mockPasswordHashingService: jest.Mocked<PasswordHashingService>;
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

    mockPasswordHashingService = {
      hash: jest.fn(),
      verify: jest.fn(),
    };

    mockEventPublisher = {
      publish: jest.fn(),
      close: jest.fn(),
    };

    registerUserUseCase = new RegisterUserUseCase(
      mockUserRepository,
      mockPasswordHashingService,
      mockEventPublisher
    );
  });

  describe('execute', () => {
    const validInput: RegisterUserInput = {
      email: 'test@example.com',
      password: 'Test123!@#',
      role: UserRole.CUSTOMER,
    };

    it('should register a new user successfully', async () => {
      const hashedPassword = 'hashed_password_123';
      const createdUser = new User(
        'user-123',
        'test@example.com',
        hashedPassword,
        UserRole.CUSTOMER,
        true,
        new Date(),
        new Date()
      );

      mockUserRepository.emailExists.mockResolvedValue(false);
      mockPasswordHashingService.hash.mockResolvedValue(hashedPassword);
      mockUserRepository.create.mockResolvedValue(createdUser);
      mockEventPublisher.publish.mockResolvedValue(undefined);

      const result = await registerUserUseCase.execute(validInput);

      expect(result.user.id).toBe('user-123');
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.role).toBe('customer');
      expect(result.user.isActive).toBe(true);
      expect(mockUserRepository.emailExists).toHaveBeenCalledWith('test@example.com');
      expect(mockPasswordHashingService.hash).toHaveBeenCalledWith('Test123!@#');
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'auth.events',
        'user.registered',
        expect.objectContaining({
          userId: 'user-123',
          email: 'test@example.com',
        })
      );
    });

    it('should throw error if email format is invalid', async () => {
      const invalidInput: RegisterUserInput = {
        email: 'invalid-email',
        password: 'Test123!@#',
      };

      await expect(registerUserUseCase.execute(invalidInput)).rejects.toThrow('Invalid email format');
      expect(mockUserRepository.emailExists).not.toHaveBeenCalled();
    });

    it('should throw error if password is too short', async () => {
      const invalidInput: RegisterUserInput = {
        email: 'test@example.com',
        password: 'Test1!',
      };

      await expect(registerUserUseCase.execute(invalidInput)).rejects.toThrow(
        'Password must be at least 8 characters'
      );
      expect(mockUserRepository.emailExists).not.toHaveBeenCalled();
    });

    it('should throw error if password lacks uppercase letter', async () => {
      const invalidInput: RegisterUserInput = {
        email: 'test@example.com',
        password: 'test123!@#',
      };

      await expect(registerUserUseCase.execute(invalidInput)).rejects.toThrow(
        'Password must be at least 8 characters long and contain uppercase, lowercase, number and special character'
      );
    });

    it('should throw error if password lacks lowercase letter', async () => {
      const invalidInput: RegisterUserInput = {
        email: 'test@example.com',
        password: 'TEST123!@#',
      };

      await expect(registerUserUseCase.execute(invalidInput)).rejects.toThrow(
        'Password must be at least 8 characters long and contain uppercase, lowercase, number and special character'
      );
    });

    it('should throw error if password lacks number', async () => {
      const invalidInput: RegisterUserInput = {
        email: 'test@example.com',
        password: 'TestTest!@#',
      };

      await expect(registerUserUseCase.execute(invalidInput)).rejects.toThrow(
        'Password must be at least 8 characters long and contain uppercase, lowercase, number and special character'
      );
    });

    it('should throw error if password lacks special character', async () => {
      const invalidInput: RegisterUserInput = {
        email: 'test@example.com',
        password: 'Test1234567',
      };

      await expect(registerUserUseCase.execute(invalidInput)).rejects.toThrow(
        'Password must be at least 8 characters long and contain uppercase, lowercase, number and special character'
      );
    });

    it('should throw error if email already exists', async () => {
      mockUserRepository.emailExists.mockResolvedValue(true);

      await expect(registerUserUseCase.execute(validInput)).rejects.toThrow('Email already registered');
      expect(mockPasswordHashingService.hash).not.toHaveBeenCalled();
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it('should default to CUSTOMER role if not provided', async () => {
      const inputWithoutRole: RegisterUserInput = {
        email: 'test@example.com',
        password: 'Test123!@#',
      };

      const hashedPassword = 'hashed_password_123';
      const createdUser = new User(
        'user-123',
        'test@example.com',
        hashedPassword,
        UserRole.CUSTOMER,
        true,
        new Date(),
        new Date()
      );

      mockUserRepository.emailExists.mockResolvedValue(false);
      mockPasswordHashingService.hash.mockResolvedValue(hashedPassword);
      mockUserRepository.create.mockResolvedValue(createdUser);
      mockEventPublisher.publish.mockResolvedValue(undefined);

      const result = await registerUserUseCase.execute(inputWithoutRole);

      expect(result.user.role).toBe('customer');
    });

    it('should convert email to lowercase', async () => {
      const inputWithUppercaseEmail: RegisterUserInput = {
        email: 'Test@Example.COM',
        password: 'Test123!@#',
      };

      mockUserRepository.emailExists.mockResolvedValue(false);
      mockPasswordHashingService.hash.mockResolvedValue('hashed');
      mockUserRepository.create.mockResolvedValue(
        new User('user-123', 'test@example.com', 'hashed', UserRole.CUSTOMER, true, new Date(), new Date())
      );
      mockEventPublisher.publish.mockResolvedValue(undefined);

      const result = await registerUserUseCase.execute(inputWithUppercaseEmail);

      expect(result.user.email).toBe('test@example.com');
    });
  });
});
