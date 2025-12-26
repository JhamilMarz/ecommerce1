import { Request, Response, NextFunction } from 'express'
import { requestLoggerMiddleware } from '../../infrastructure/middleware/request-logger'
import { logger } from '../../infrastructure/logger'

// Mock logger
jest.mock('../../infrastructure/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}))

describe('Request Logger Middleware', () => {
  let mockRequest: Partial<Request>
  let mockResponse: any
  let nextFunction: NextFunction
  let onFinishCallback: () => void

  beforeEach(() => {
    jest.clearAllMocks()

    mockRequest = {
      correlationId: 'test-correlation-id',
      method: 'GET',
      path: '/api/v1/products',
      query: { limit: '10' },
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('Mozilla/5.0'),
    }

    mockResponse = {
      statusCode: 200,
      get: jest.fn().mockReturnValue('1234'),
      on: jest.fn((event, callback) => {
        if (event === 'finish') {
          onFinishCallback = callback
        }
        return mockResponse
      }),
    }

    nextFunction = jest.fn()
  })

  it('should log incoming request', () => {
    requestLoggerMiddleware(mockRequest as Request, mockResponse as Response, nextFunction)

    expect(logger.info).toHaveBeenCalledWith('Incoming request', {
      correlationId: 'test-correlation-id',
      method: 'GET',
      path: '/api/v1/products',
      query: { limit: '10' },
      ip: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
    })
    expect(nextFunction).toHaveBeenCalled()
  })

  it('should log successful request completion (2xx)', () => {
    mockResponse.statusCode = 200
    requestLoggerMiddleware(mockRequest as Request, mockResponse as Response, nextFunction)

    // Trigger finish event
    onFinishCallback()

    expect(logger.info).toHaveBeenCalledWith(
      'Request completed successfully',
      expect.objectContaining({
        correlationId: 'test-correlation-id',
        method: 'GET',
        path: '/api/v1/products',
        statusCode: 200,
        contentLength: '1234',
      })
    )
  })

  it('should log client error (4xx)', () => {
    mockResponse.statusCode = 404
    requestLoggerMiddleware(mockRequest as Request, mockResponse as Response, nextFunction)

    onFinishCallback()

    expect(logger.warn).toHaveBeenCalledWith(
      'Request completed with client error',
      expect.objectContaining({
        statusCode: 404,
      })
    )
  })

  it('should log server error (5xx)', () => {
    mockResponse.statusCode = 503
    requestLoggerMiddleware(mockRequest as Request, mockResponse as Response, nextFunction)

    onFinishCallback()

    expect(logger.error).toHaveBeenCalledWith(
      'Request completed with server error',
      expect.objectContaining({
        statusCode: 503,
      })
    )
  })

  it('should include duration in log', () => {
    requestLoggerMiddleware(mockRequest as Request, mockResponse as Response, nextFunction)

    onFinishCallback()

    expect(logger.info).toHaveBeenCalledWith(
      'Request completed successfully',
      expect.objectContaining({
        duration: expect.stringMatching(/^\d+ms$/),
      })
    )
  })
})
