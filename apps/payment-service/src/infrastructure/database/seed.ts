import { v4 as uuidv4 } from 'uuid'
import { PaymentModel } from './schemas/payment-schema'
import { PaymentStatus } from '@/domain/entities/payment-status'
import { PaymentMethod } from '@/domain/entities/payment-method'

/**
 * Database Seed Data
 * 
 * Architecture: Clean Architecture - Infrastructure Layer
 * Populates database with sample payments for development/testing
 * 
 * IMPORTANT: Only for development/testing. DO NOT run in production.
 * 
 * Sample data includes:
 * - 4 payments with different statuses
 * - Various payment methods
 * - Different users and orders
 */

/**
 * Seeds database with sample payments
 */
export async function seedDatabase(): Promise<void> {
  try {
    console.log('MongoDB: Seeding payments...')

    // Check if payments already exist
    const count = await PaymentModel.countDocuments()
    if (count > 0) {
      console.log('MongoDB: Database already seeded, skipping...')
      return
    }

    // Sample payment data
    const payments = [
      {
        _id: uuidv4(),
        orderId: 'order-' + uuidv4(),
        userId: 'user-' + uuidv4(),
        amount: 99.99,
        currency: 'USD',
        method: PaymentMethod.CREDIT_CARD,
        status: PaymentStatus.SUCCEEDED,
        createdAt: new Date('2025-01-01T10:00:00Z'),
        updatedAt: new Date('2025-01-01T10:05:00Z'),
        correlationId: 'corr-' + uuidv4(),
        providerTransactionId: 'provider-txn-' + uuidv4(),
        providerResponse: {
          authCode: 'AUTH123456',
          cardLast4: '4242',
          cardBrand: 'Visa',
        },
        retryCount: 0,
      },
      {
        _id: uuidv4(),
        orderId: 'order-' + uuidv4(),
        userId: 'user-' + uuidv4(),
        amount: 249.5,
        currency: 'USD',
        method: PaymentMethod.PAYPAL,
        status: PaymentStatus.PROCESSING,
        createdAt: new Date('2025-01-02T14:30:00Z'),
        updatedAt: new Date('2025-01-02T14:30:00Z'),
        correlationId: 'corr-' + uuidv4(),
        providerTransactionId: 'provider-txn-' + uuidv4(),
        retryCount: 0,
      },
      {
        _id: uuidv4(),
        orderId: 'order-' + uuidv4(),
        userId: 'user-' + uuidv4(),
        amount: 150.0,
        currency: 'EUR',
        method: PaymentMethod.STRIPE,
        status: PaymentStatus.FAILED,
        createdAt: new Date('2025-01-02T16:00:00Z'),
        updatedAt: new Date('2025-01-02T16:05:00Z'),
        correlationId: 'corr-' + uuidv4(),
        providerTransactionId: 'provider-txn-' + uuidv4(),
        failureReason: 'Insufficient funds',
        providerResponse: {
          errorCode: 'INSUFFICIENT_FUNDS',
          errorMessage: 'Card has insufficient funds',
        },
        retryCount: 1,
      },
      {
        _id: uuidv4(),
        orderId: 'order-' + uuidv4(),
        userId: 'user-' + uuidv4(),
        amount: 75.25,
        currency: 'USD',
        method: PaymentMethod.DEBIT_CARD,
        status: PaymentStatus.PENDING,
        createdAt: new Date('2025-01-02T18:00:00Z'),
        updatedAt: new Date('2025-01-02T18:00:00Z'),
        correlationId: 'corr-' + uuidv4(),
        retryCount: 0,
      },
    ]

    // Insert sample payments
    await PaymentModel.insertMany(payments)

    console.log(`MongoDB: Seeded ${payments.length} sample payments`)
  } catch (error) {
    console.error('MongoDB: Seed failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    throw error
  }
}

/**
 * Clears all payments from database
 * DANGEROUS: Only for testing/development
 */
export async function clearDatabase(): Promise<void> {
  try {
    console.log('MongoDB: Clearing payments...')

    const result = await PaymentModel.deleteMany({})

    console.log(`MongoDB: Deleted ${result.deletedCount} payments`)
  } catch (error) {
    console.error('MongoDB: Clear database failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    throw error
  }
}
