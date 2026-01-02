import { Payment } from '@/domain/entities/payment'
import { PaymentStatus } from '@/domain/entities/payment-status'
import { PaymentRepository } from '@/domain/repositories/payment-repository'
import { PaymentDocument, PaymentModel } from '../schemas/payment-schema'

/**
 * MongoDB Payment Repository Implementation
 * 
 * Architecture: Clean Architecture - Infrastructure Layer
 * Implements PaymentRepository interface using MongoDB/Mongoose
 * 
 * Responsibilities:
 * - Maps between Payment domain entity and PaymentDocument (MongoDB)
 * - Performs CRUD operations
 * - Executes queries with pagination
 */
export class MongoPaymentRepository implements PaymentRepository {
  /**
   * Saves payment (create or update)
   */
  async save(payment: Payment): Promise<Payment> {
    try {
      const document = this.toDocument(payment)

      const saved = await PaymentModel.findByIdAndUpdate(
        document._id,
        document,
        {
          upsert: true,
          new: true,
          runValidators: true,
        },
      )

      if (!saved) {
        throw new Error(`Failed to save payment '${payment.id}'`)
      }

      return this.toDomain(saved)
    } catch (error) {
      console.error('MongoPaymentRepository: Save failed', {
        paymentId: payment.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  }

  /**
   * Finds payment by ID
   */
  async findById(id: string): Promise<Payment | null> {
    try {
      const document = await PaymentModel.findById(id)
      return document ? this.toDomain(document) : null
    } catch (error) {
      console.error('MongoPaymentRepository: FindById failed', {
        id,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  }

  /**
   * Finds all payments for a specific order
   */
  async findByOrderId(orderId: string): Promise<Payment[]> {
    try {
      const documents = await PaymentModel.find({ orderId }).sort({
        createdAt: -1,
      })
      return documents.map((doc) => this.toDomain(doc))
    } catch (error) {
      console.error('MongoPaymentRepository: FindByOrderId failed', {
        orderId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  }

  /**
   * Finds all payments for a specific user (paginated)
   */
  async findByUserId(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ payments: Payment[]; total: number }> {
    try {
      const skip = (page - 1) * limit

      const [documents, total] = await Promise.all([
        PaymentModel.find({ userId })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        PaymentModel.countDocuments({ userId }),
      ])

      return {
        payments: documents.map((doc) => this.toDomain(doc)),
        total,
      }
    } catch (error) {
      console.error('MongoPaymentRepository: FindByUserId failed', {
        userId,
        page,
        limit,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  }

  /**
   * Finds all payments (paginated, optional status filter)
   */
  async findAll(
    page: number = 1,
    limit: number = 20,
    status?: PaymentStatus,
  ): Promise<{ payments: Payment[]; total: number }> {
    try {
      const skip = (page - 1) * limit
      const filter = status ? { status } : {}

      const [documents, total] = await Promise.all([
        PaymentModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
        PaymentModel.countDocuments(filter),
      ])

      return {
        payments: documents.map((doc) => this.toDomain(doc)),
        total,
      }
    } catch (error) {
      console.error('MongoPaymentRepository: FindAll failed', {
        page,
        limit,
        status,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  }

  /**
   * Finds payment by provider transaction ID
   */
  async findByProviderTransactionId(
    providerTransactionId: string,
  ): Promise<Payment | null> {
    try {
      const document = await PaymentModel.findOne({ providerTransactionId })
      return document ? this.toDomain(document) : null
    } catch (error) {
      console.error(
        'MongoPaymentRepository: FindByProviderTransactionId failed',
        {
          providerTransactionId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      )
      throw error
    }
  }

  /**
   * Checks if payment exists
   */
  async exists(id: string): Promise<boolean> {
    try {
      const count = await PaymentModel.countDocuments({ _id: id })
      return count > 0
    } catch (error) {
      console.error('MongoPaymentRepository: Exists failed', {
        id,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  }

  /**
   * Deletes payment (for testing only)
   */
  async delete(id: string): Promise<boolean> {
    try {
      const result = await PaymentModel.deleteOne({ _id: id })
      return result.deletedCount > 0
    } catch (error) {
      console.error('MongoPaymentRepository: Delete failed', {
        id,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  }

  /**
   * Converts Payment domain entity to MongoDB document
   */
  private toDocument(payment: Payment): Partial<PaymentDocument> {
    return {
      _id: payment.id,
      orderId: payment.orderId,
      userId: payment.userId,
      amount: payment.amount,
      currency: payment.currency,
      method: payment.method,
      status: payment.status,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
      correlationId: payment.correlationId,
      providerTransactionId: payment.providerTransactionId,
      providerResponse: payment.providerResponse,
      failureReason: payment.failureReason,
      retryCount: payment.retryCount,
    }
  }

  /**
   * Converts MongoDB document to Payment domain entity
   */
  private toDomain(document: PaymentDocument): Payment {
    return new Payment(
      document._id,
      document.orderId,
      document.userId,
      document.amount,
      document.currency,
      document.method,
      document.status,
      document.createdAt,
      document.updatedAt,
      document.correlationId,
      document.providerTransactionId,
      document.providerResponse,
      document.failureReason,
      document.retryCount,
    )
  }
}
