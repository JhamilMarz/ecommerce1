import { Request, Response, NextFunction } from 'express'
import { correlationIdMiddleware } from '../../infrastructure/middleware/correlation-id'

describe('Correlation ID Middleware', () => {
  let mockRequest: Partial<Request>
  let mockResponse: Partial<Response>
  let nextFunction: NextFunction

  beforeEach(() => {
    mockRequest = {
      headers: {},
    }
    mockResponse = {
      setHeader: jest.fn(),
    }
    nextFunction = jest.fn()
  })

  it('should generate a new correlation ID if not provided', () => {
    correlationIdMiddleware(mockRequest as Request, mockResponse as Response, nextFunction)

    expect(mockRequest.correlationId).toBeDefined()
    expect(mockRequest.correlationId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
    expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Correlation-ID', mockRequest.correlationId)
    expect(nextFunction).toHaveBeenCalled()
  })

  it('should use existing correlation ID from header', () => {
    const existingId = '123e4567-e89b-12d3-a456-426614174000'
    mockRequest.headers = {
      'x-correlation-id': existingId,
    }

    correlationIdMiddleware(mockRequest as Request, mockResponse as Response, nextFunction)

    expect(mockRequest.correlationId).toBe(existingId)
    expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Correlation-ID', existingId)
    expect(nextFunction).toHaveBeenCalled()
  })

  it('should attach correlation ID to request object', () => {
    correlationIdMiddleware(mockRequest as Request, mockResponse as Response, nextFunction)

    expect(mockRequest.correlationId).toBeDefined()
    expect(typeof mockRequest.correlationId).toBe('string')
  })
})
