import { Request, Response, NextFunction } from 'express'
import { errorHandler } from '../../infrastructure/middleware/error-handler'
import { logger } from '../../infrastructure/logger'

// Mock logger
jest.mock('../../infrastructure/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}))

describe('Error Handler Middleware', () => {
  let mockRequest: Partial<Request>
  let mockResponse: any
  let nextFunction: NextFunction

  beforeEach(() => {
    jest.clearAllMocks()

    mockRequest = {
      correlationId: 'test-correlation-id',
      method: 'GET',
      path: '/api/v1/products',
    }

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    }

    nextFunction = jest.fn()
  })

  it('should handle standard error', () => {
    const error = new Error('Test error message')

    errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction)

    expect(logger.error).toHaveBeenCalledWith({
      message: error.message,
      stack: expect.any(String),
    })

    expect(mockResponse.status).toHaveBeenCalledWith(500)
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Test error message',
    })
  })

  it('should handle error without correlation ID', () => {
    const error = new Error('Test error')
    mockRequest.correlationId = undefined

    errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction)

    expect(logger.error).toHaveBeenCalledWith({
      message: error.message,
      stack: expect.any(String),
    })

    expect(mockResponse.status).toHaveBeenCalledWith(500)
  })
})
