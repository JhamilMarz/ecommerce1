import { InitiatePaymentUseCase } from '@/application/use-cases/initiate-payment'
import { PaymentRepository } from '@/domain/repositories/payment-repository'
import { EventPublisher } from '@/application/interfaces/event-publisher-interface'
import { PaymentSimulator } from '@/application/interfaces/payment-simulator'
import { PaymentMethod } from '@/domain/entities/payment-method'
import { PaymentStatus } from '@/domain/entities/payment-status'
import { Payment } from '@/domain/entities/payment'

describe('InitiatePaymentUseCase', () => {
  let mockRepository: jest.Mocked<PaymentRepository>
  let mockEventPublisher: jest.Mocked<EventPublisher>
  let mockPaymentSimulator: jest.Mocked<PaymentSimulator>
  let useCase: InitiatePaymentUseCase

  beforeEach(() => {
    // Mock PaymentRepository
    mockRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByOrderId: jest.fn(),
      findByUserId: jest.fn(),
      findAll: jest.fn(),
      findByProviderTransactionId: jest.fn(),
      exists: jest.fn(),
      delete: jest.fn(),
    }

    // Mock EventPublisher
    mockEventPublisher = {
      publish: jest.fn(),
      close: jest.fn(),
    }

    // Mock PaymentSimulator
    mockPaymentSimulator = {
      processPayment: jest.fn(),
      isMethodSupported: jest.fn(),
      getEstimatedProcessingTime: jest.fn(),
    }

    useCase = new InitiatePaymentUseCase(
      mockRepository,
      mockEventPublisher,
      mockPaymentSimulator
    )
  })

  describe('execute', () => {
    const validDto = {
      orderId: 'order-123',
      userId: 'user-456',
      amount: 100.0,
      currency: 'USD',
      method: PaymentMethod.CREDIT_CARD,
      correlationId: 'corr-789',
    }

    it('should create and save a new payment', async () => {
      mockRepository.findByOrderId.mockResolvedValue([])
      mockRepository.save.mockImplementation(async (payment) => payment)

      const result = await useCase.execute(validDto)

      expect(mockRepository.save).toHaveBeenCalledTimes(1)
      expect(result.orderId).toBe(validDto.orderId)
      expect(result.userId).toBe(validDto.userId)
      expect(result.amount).toBe(validDto.amount)
      expect(result.status).toBe(PaymentStatus.PENDING)
    })

    it('should throw error if order already has successful payment', async () => {
      const existingPayment = Payment.create(
        validDto.orderId,
        validDto.userId,
        validDto.amount,
        validDto.currency,
        validDto.method,
        validDto.correlationId
      )
      existingPayment.markProcessing('provider-txn-123')
      existingPayment.markSucceeded({ authCode: 'AUTH123' })

      mockRepository.findByOrderId.mockResolvedValue([existingPayment])

      await expect(useCase.execute(validDto)).rejects.toThrow(
        'Order already has a successful payment'
      )
    })

    it('should throw error for invalid amount', async () => {
      const invalidDto = { ...validDto, amount: -50 }

      await expect(useCase.execute(invalidDto)).rejects.toThrow()
    })

    it('should throw error for missing orderId', async () => {
      const invalidDto = { ...validDto, orderId: '' }

      await expect(useCase.execute(invalidDto)).rejects.toThrow('Order ID is required')
    })

    it('should throw error for missing userId', async () => {
      const invalidDto = { ...validDto, userId: '' }

      await expect(useCase.execute(invalidDto)).rejects.toThrow('User ID is required')
    })

    it('should allow retry for failed payments', async () => {
      const failedPayment = Payment.create(
        validDto.orderId,
        validDto.userId,
        validDto.amount,
        validDto.currency,
        validDto.method,
        validDto.correlationId
      )
      failedPayment.markProcessing('provider-txn-123')
      failedPayment.markFailed('Insufficient funds')

      mockRepository.findByOrderId.mockResolvedValue([failedPayment])
      mockRepository.save.mockImplementation(async (payment) => payment)

      const result = await useCase.execute(validDto)

      expect(result.status).toBe(PaymentStatus.PENDING)
      expect(mockRepository.save).toHaveBeenCalled()
    })
  })

  describe('payment processing simulation', () => {
    const validDto = {
      orderId: 'order-123',
      userId: 'user-456',
      amount: 100.0,
      currency: 'USD',
      method: PaymentMethod.CREDIT_CARD,
      correlationId: 'corr-789',
    }

    it('should simulate successful payment processing', async () => {
      mockRepository.findByOrderId.mockResolvedValue([])
      mockRepository.save.mockImplementation(async (payment) => payment)
      mockPaymentSimulator.processPayment.mockResolvedValue({
        success: true,
        providerTransactionId: 'provider-txn-123',
        providerResponse: { authCode: 'AUTH123', cardLast4: '4242' },
        processingTime: 1000,
      })

      await useCase.execute(validDto)

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Verify payment simulator was called
      expect(mockPaymentSimulator.processPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: validDto.orderId,
          userId: validDto.userId,
          amount: validDto.amount,
          currency: validDto.currency,
          method: validDto.method,
        })
      )
    })

    it('should handle failed payment processing', async () => {
      mockRepository.findByOrderId.mockResolvedValue([])
      mockRepository.save.mockImplementation(async (payment) => payment)
      mockPaymentSimulator.processPayment.mockResolvedValue({
        success: false,
        providerTransactionId: 'provider-txn-123',
        failureReason: 'Card declined',
        processingTime: 1000,
      })

      await useCase.execute(validDto)

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(mockPaymentSimulator.processPayment).toHaveBeenCalled()
    })
  })
})
