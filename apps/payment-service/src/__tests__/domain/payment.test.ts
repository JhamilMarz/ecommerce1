import { Payment } from '@/domain/entities/payment'
import { PaymentStatus } from '@/domain/entities/payment-status'
import { PaymentMethod } from '@/domain/entities/payment-method'

describe('Payment Entity', () => {
  const validPaymentData = {
    id: 'payment-123',
    orderId: 'order-456',
    userId: 'user-789',
    amount: 100.0,
    currency: 'USD',
    method: PaymentMethod.CREDIT_CARD,
    status: PaymentStatus.PENDING,
    createdAt: new Date(),
    updatedAt: new Date(),
    correlationId: 'corr-123',
    retryCount: 0,
  }

  describe('create', () => {
    it('should create a payment with pending status', () => {
      const payment = Payment.create(
        validPaymentData.orderId,
        validPaymentData.userId,
        validPaymentData.amount,
        validPaymentData.currency,
        validPaymentData.method,
        validPaymentData.correlationId
      )

      expect(payment.status).toBe(PaymentStatus.PENDING)
      expect(payment.amount).toBe(100.0)
      expect(payment.orderId).toBe('order-456')
      expect(payment.retryCount).toBe(0)
    })
  })

  describe('validate', () => {
    it('should pass validation for valid payment', () => {
      const payment = new Payment(
        validPaymentData.id,
        validPaymentData.orderId,
        validPaymentData.userId,
        validPaymentData.amount,
        validPaymentData.currency,
        validPaymentData.method,
        validPaymentData.status,
        validPaymentData.createdAt,
        validPaymentData.updatedAt,
        validPaymentData.correlationId,
        undefined,
        undefined,
        undefined,
        validPaymentData.retryCount
      )

      expect(() => payment.validate()).not.toThrow()
    })

    it('should throw error for negative amount', () => {
      const payment = new Payment(
        validPaymentData.id,
        validPaymentData.orderId,
        validPaymentData.userId,
        -50,
        validPaymentData.currency,
        validPaymentData.method,
        validPaymentData.status,
        validPaymentData.createdAt,
        validPaymentData.updatedAt,
        validPaymentData.correlationId,
        undefined,
        undefined,
        undefined,
        validPaymentData.retryCount
      )

      expect(() => payment.validate()).toThrow('Amount must be greater than 0')
    })

    it('should throw error for missing orderId', () => {
      const payment = new Payment(
        validPaymentData.id,
        '',
        validPaymentData.userId,
        validPaymentData.amount,
        validPaymentData.currency,
        validPaymentData.method,
        validPaymentData.status,
        validPaymentData.createdAt,
        validPaymentData.updatedAt,
        validPaymentData.correlationId,
        undefined,
        undefined,
        undefined,
        validPaymentData.retryCount
      )

      expect(() => payment.validate()).toThrow('Order ID is required')
    })
  })

  describe('changeStatus', () => {
    it('should allow valid status transition from pending to processing', () => {
      const payment = Payment.create(
        validPaymentData.orderId,
        validPaymentData.userId,
        validPaymentData.amount,
        validPaymentData.currency,
        validPaymentData.method,
        validPaymentData.correlationId
      )

      payment.changeStatus(PaymentStatus.PROCESSING)

      expect(payment.status).toBe(PaymentStatus.PROCESSING)
    })

    it('should throw error for invalid status transition', () => {
      const payment = Payment.create(
        validPaymentData.orderId,
        validPaymentData.userId,
        validPaymentData.amount,
        validPaymentData.currency,
        validPaymentData.method,
        validPaymentData.correlationId
      )

      expect(() => payment.changeStatus(PaymentStatus.SUCCEEDED)).toThrow(
        'Invalid status transition'
      )
    })
  })

  describe('markProcessing', () => {
    it('should transition to processing with provider transaction ID', () => {
      const payment = Payment.create(
        validPaymentData.orderId,
        validPaymentData.userId,
        validPaymentData.amount,
        validPaymentData.currency,
        validPaymentData.method,
        validPaymentData.correlationId
      )

      payment.markProcessing('provider-txn-123')

      expect(payment.status).toBe(PaymentStatus.PROCESSING)
      expect(payment.providerTransactionId).toBe('provider-txn-123')
    })
  })

  describe('markSucceeded', () => {
    it('should transition to succeeded with provider response', () => {
      const payment = Payment.create(
        validPaymentData.orderId,
        validPaymentData.userId,
        validPaymentData.amount,
        validPaymentData.currency,
        validPaymentData.method,
        validPaymentData.correlationId
      )

      payment.markProcessing('provider-txn-123')

      const providerResponse = { authCode: 'AUTH123', cardLast4: '4242' }
      payment.markSucceeded(providerResponse)

      expect(payment.status).toBe(PaymentStatus.SUCCEEDED)
      expect(payment.providerResponse).toEqual(providerResponse)
    })
  })

  describe('markFailed', () => {
    it('should transition to failed with failure reason', () => {
      const payment = Payment.create(
        validPaymentData.orderId,
        validPaymentData.userId,
        validPaymentData.amount,
        validPaymentData.currency,
        validPaymentData.method,
        validPaymentData.correlationId
      )

      payment.markProcessing('provider-txn-123')
      payment.markFailed('Insufficient funds')

      expect(payment.status).toBe(PaymentStatus.FAILED)
      expect(payment.failureReason).toBe('Insufficient funds')
    })
  })

  describe('cancel', () => {
    it('should cancel pending payment', () => {
      const payment = Payment.create(
        validPaymentData.orderId,
        validPaymentData.userId,
        validPaymentData.amount,
        validPaymentData.currency,
        validPaymentData.method,
        validPaymentData.correlationId
      )

      payment.cancel('Order cancelled')

      expect(payment.status).toBe(PaymentStatus.CANCELLED)
      expect(payment.failureReason).toBe('Order cancelled')
    })
  })

  describe('canBeModified', () => {
    it('should return true for pending payment', () => {
      const payment = Payment.create(
        validPaymentData.orderId,
        validPaymentData.userId,
        validPaymentData.amount,
        validPaymentData.currency,
        validPaymentData.method,
        validPaymentData.correlationId
      )

      expect(payment.canBeModified()).toBe(true)
    })

    it('should return false for succeeded payment', () => {
      const payment = new Payment(
        validPaymentData.id,
        validPaymentData.orderId,
        validPaymentData.userId,
        validPaymentData.amount,
        validPaymentData.currency,
        validPaymentData.method,
        PaymentStatus.SUCCEEDED,
        validPaymentData.createdAt,
        validPaymentData.updatedAt,
        validPaymentData.correlationId,
        'provider-txn-123',
        { authCode: 'AUTH123' },
        undefined,
        validPaymentData.retryCount
      )

      expect(payment.canBeModified()).toBe(false)
    })
  })

  describe('canBeRetried', () => {
    it('should return true for failed payment', () => {
      const payment = new Payment(
        validPaymentData.id,
        validPaymentData.orderId,
        validPaymentData.userId,
        validPaymentData.amount,
        validPaymentData.currency,
        validPaymentData.method,
        PaymentStatus.FAILED,
        validPaymentData.createdAt,
        validPaymentData.updatedAt,
        validPaymentData.correlationId,
        'provider-txn-123',
        undefined,
        'Insufficient funds',
        1
      )

      expect(payment.canBeRetried()).toBe(true)
    })

    it('should return false for succeeded payment', () => {
      const payment = new Payment(
        validPaymentData.id,
        validPaymentData.orderId,
        validPaymentData.userId,
        validPaymentData.amount,
        validPaymentData.currency,
        validPaymentData.method,
        PaymentStatus.SUCCEEDED,
        validPaymentData.createdAt,
        validPaymentData.updatedAt,
        validPaymentData.correlationId,
        'provider-txn-123',
        { authCode: 'AUTH123' },
        undefined,
        validPaymentData.retryCount
      )

      expect(payment.canBeRetried()).toBe(false)
    })
  })

  describe('incrementRetry', () => {
    it('should increment retry count', () => {
      const payment = Payment.create(
        validPaymentData.orderId,
        validPaymentData.userId,
        validPaymentData.amount,
        validPaymentData.currency,
        validPaymentData.method,
        validPaymentData.correlationId
      )

      expect(payment.retryCount).toBe(0)
      payment.incrementRetry()
      expect(payment.retryCount).toBe(1)
      payment.incrementRetry()
      expect(payment.retryCount).toBe(2)
    })
  })

  describe('isTerminal', () => {
    it('should return true for succeeded status', () => {
      const payment = new Payment(
        validPaymentData.id,
        validPaymentData.orderId,
        validPaymentData.userId,
        validPaymentData.amount,
        validPaymentData.currency,
        validPaymentData.method,
        PaymentStatus.SUCCEEDED,
        validPaymentData.createdAt,
        validPaymentData.updatedAt,
        validPaymentData.correlationId,
        'provider-txn-123',
        { authCode: 'AUTH123' },
        undefined,
        validPaymentData.retryCount
      )

      expect(payment.isTerminal()).toBe(true)
    })

    it('should return false for pending status', () => {
      const payment = Payment.create(
        validPaymentData.orderId,
        validPaymentData.userId,
        validPaymentData.amount,
        validPaymentData.currency,
        validPaymentData.method,
        validPaymentData.correlationId
      )

      expect(payment.isTerminal()).toBe(false)
    })
  })
})
