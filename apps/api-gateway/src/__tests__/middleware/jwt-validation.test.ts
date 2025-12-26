import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { jwtValidationMiddleware, optionalJwtMiddleware } from '../../infrastructure/middleware/jwt-validation'

// Mock config
jest.mock('../../infrastructure/config', () => ({
  config: {
    jwtSecret: 'test-secret-key',
  },
}))

describe('JWT Validation Middleware', () => {
  let mockRequest: Partial<Request>
  let mockResponse: Partial<Response>
  let nextFunction: NextFunction
  let jsonMock: jest.Mock
  let statusMock: jest.Mock

  beforeEach(() => {
    jsonMock = jest.fn()
    statusMock = jest.fn().mockReturnValue({ json: jsonMock })

    mockRequest = {
      headers: {},
      correlationId: 'test-correlation-id',
    }
    mockResponse = {
      status: statusMock,
      json: jsonMock,
    }
    nextFunction = jest.fn()
  })

  describe('jwtValidationMiddleware', () => {
    it('should return 401 if Authorization header is missing', () => {
      jwtValidationMiddleware(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(statusMock).toHaveBeenCalledWith(401)
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Missing Authorization header',
        correlationId: 'test-correlation-id',
      })
      expect(nextFunction).not.toHaveBeenCalled()
    })

    it('should return 401 if Authorization header format is invalid', () => {
      mockRequest.headers = { authorization: 'InvalidFormat token123' }

      jwtValidationMiddleware(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(statusMock).toHaveBeenCalledWith(401)
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Invalid Authorization header format. Use: Bearer <token>',
        correlationId: 'test-correlation-id',
      })
    })

    it('should return 401 if token is missing', () => {
      mockRequest.headers = { authorization: 'Bearer ' }

      jwtValidationMiddleware(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(statusMock).toHaveBeenCalledWith(401)
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Missing token',
        correlationId: 'test-correlation-id',
      })
    })

    it('should return 401 if token is expired', () => {
      const expiredToken = jwt.sign({ userId: '123' }, 'test-secret-key', { expiresIn: '-1s' })
      mockRequest.headers = { authorization: `Bearer ${expiredToken}` }

      jwtValidationMiddleware(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(statusMock).toHaveBeenCalledWith(401)
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Token expired',
        correlationId: 'test-correlation-id',
      })
    })

    it('should return 401 if token signature is invalid', () => {
      const invalidToken = jwt.sign({ userId: '123' }, 'wrong-secret')
      mockRequest.headers = { authorization: `Bearer ${invalidToken}` }

      jwtValidationMiddleware(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(statusMock).toHaveBeenCalledWith(401)
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Invalid token',
        correlationId: 'test-correlation-id',
      })
    })

    it('should attach user to request if token is valid', () => {
      const payload = { userId: '123', email: 'test@example.com', role: 'customer' }
      const validToken = jwt.sign(payload, 'test-secret-key', { expiresIn: '1h' })
      mockRequest.headers = { authorization: `Bearer ${validToken}` }

      jwtValidationMiddleware(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(mockRequest.user).toBeDefined()
      expect(mockRequest.user?.userId).toBe('123')
      expect(mockRequest.user?.email).toBe('test@example.com')
      expect(mockRequest.user?.role).toBe('customer')
      expect(nextFunction).toHaveBeenCalled()
    })
  })

  describe('optionalJwtMiddleware', () => {
    it('should call next without error if no Authorization header', () => {
      optionalJwtMiddleware(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(nextFunction).toHaveBeenCalled()
      expect(mockRequest.user).toBeUndefined()
    })

    it('should attach user if valid token is provided', () => {
      const payload = { userId: '456', email: 'optional@example.com', role: 'seller' }
      const validToken = jwt.sign(payload, 'test-secret-key', { expiresIn: '1h' })
      mockRequest.headers = { authorization: `Bearer ${validToken}` }

      optionalJwtMiddleware(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(mockRequest.user).toBeDefined()
      expect(mockRequest.user?.userId).toBe('456')
      expect(nextFunction).toHaveBeenCalled()
    })

    it('should continue without user if token is invalid', () => {
      mockRequest.headers = { authorization: 'Bearer invalid-token' }

      optionalJwtMiddleware(mockRequest as Request, mockResponse as Response, nextFunction)

      expect(mockRequest.user).toBeUndefined()
      expect(nextFunction).toHaveBeenCalled()
    })
  })
})
