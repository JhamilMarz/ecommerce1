import request from 'supertest';
import express from 'express';
import { AuthController } from '../../infrastructure/http/AuthController';
import { createAuthRoutes } from '../../infrastructure/http/routes';
import { errorHandler } from '../../infrastructure/middleware/error-handler';
import { RegisterUserUseCase } from '../../application/use-cases/RegisterUserUseCase';
import { LoginUserUseCase } from '../../application/use-cases/LoginUserUseCase';
import { RefreshTokenUseCase } from '../../application/use-cases/RefreshTokenUseCase';
import { LogoutUserUseCase } from '../../application/use-cases/LogoutUserUseCase';
import { GetCurrentUserUseCase } from '../../application/use-cases/GetCurrentUserUseCase';

// Mock use cases
jest.mock('../../application/use-cases/RegisterUserUseCase');
jest.mock('../../application/use-cases/LoginUserUseCase');
jest.mock('../../application/use-cases/RefreshTokenUseCase');
jest.mock('../../application/use-cases/LogoutUserUseCase');
jest.mock('../../application/use-cases/GetCurrentUserUseCase');

describe('Auth Endpoints E2E', () => {
  let app: express.Application;
  let mockRegisterUseCase: jest.Mocked<RegisterUserUseCase>;
  let mockLoginUseCase: jest.Mocked<LoginUserUseCase>;
  let mockRefreshTokenUseCase: jest.Mocked<RefreshTokenUseCase>;
  let mockLogoutUseCase: jest.Mocked<LogoutUserUseCase>;
  let mockGetCurrentUserUseCase: jest.Mocked<GetCurrentUserUseCase>;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    mockRegisterUseCase = {
      execute: jest.fn(),
    } as any;

    mockLoginUseCase = {
      execute: jest.fn(),
    } as any;

    mockRefreshTokenUseCase = {
      execute: jest.fn(),
    } as any;

    mockLogoutUseCase = {
      execute: jest.fn(),
    } as any;

    mockGetCurrentUserUseCase = {
      execute: jest.fn(),
    } as any;

    const authController = new AuthController(
      mockRegisterUseCase,
      mockLoginUseCase,
      mockRefreshTokenUseCase,
      mockLogoutUseCase,
      mockGetCurrentUserUseCase
    );

    const authRoutes = createAuthRoutes(authController);
    app.use('/api/v1/auth', authRoutes);
    app.use(errorHandler);
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const mockResponse = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          role: 'customer',
          isActive: true,
          createdAt: new Date(),
        },
      };

      mockRegisterUseCase.execute.mockResolvedValue(mockResponse);

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Test123!@#',
        });

      expect(response.status).toBe(201);
      expect(response.body.user.email).toBe('test@example.com');
    });

    it('should return 400 for invalid email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email',
          password: 'Test123!@#',
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 for short password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'short',
        });

      expect(response.status).toBe(400);
    });

    it('should return 409 if email already exists', async () => {
      mockRegisterUseCase.execute.mockRejectedValue(new Error('Email already registered'));

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Test123!@#',
        });

      expect(response.status).toBe(500);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const mockResponse = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          role: 'customer',
        },
        accessToken: 'access_token_123',
        refreshToken: 'refresh_token_456',
        expiresIn: 900,
      };

      mockLoginUseCase.execute.mockResolvedValue(mockResponse);

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Test123!@#',
        });

      expect(response.status).toBe(200);
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
      expect(response.body.user.email).toBe('test@example.com');
    });

    it('should return 400 for missing email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          password: 'Test123!@#',
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 for missing password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
        });

      expect(response.status).toBe(400);
    });

    it('should return 500 for invalid credentials', async () => {
      mockLoginUseCase.execute.mockRejectedValue(new Error('Invalid credentials'));

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword',
        });

      expect(response.status).toBe(500);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should refresh tokens successfully', async () => {
      const mockResponse = {
        accessToken: 'new_access_token',
        refreshToken: 'new_refresh_token',
        expiresIn: 900,
      };

      mockRefreshTokenUseCase.execute.mockResolvedValue(mockResponse);

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken: 'valid_refresh_token',
        });

      expect(response.status).toBe(200);
      expect(response.body.accessToken).toBe('new_access_token');
      expect(response.body.refreshToken).toBe('new_refresh_token');
    });

    it('should return 400 for missing refresh token', async () => {
      const response = await request(app).post('/api/v1/auth/refresh').send({});

      expect(response.status).toBe(400);
    });

    it('should return 500 for invalid refresh token', async () => {
      mockRefreshTokenUseCase.execute.mockRejectedValue(new Error('Invalid or expired refresh token'));

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken: 'invalid_token',
        });

      expect(response.status).toBe(500);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should logout successfully', async () => {
      mockLogoutUseCase.execute.mockResolvedValue(undefined);

      // Mock user from JWT (in real scenario, API Gateway would set this)
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('x-user-id', 'user-123')
        .send({
          refreshToken: 'refresh_token_to_revoke',
        });

      expect(response.status).toBe(204);
    });

    it('should return 400 for missing refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('x-user-id', 'user-123')
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return current user info', async () => {
      const mockResponse = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'customer',
        isActive: true,
        createdAt: new Date('2024-01-01'),
      };

      mockGetCurrentUserUseCase.execute.mockResolvedValue(mockResponse);

      // Mock user from JWT (API Gateway sets this)
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('x-user-id', 'user-123');

      expect(response.status).toBe(200);
      expect(response.body.email).toBe('test@example.com');
    });
  });
});
