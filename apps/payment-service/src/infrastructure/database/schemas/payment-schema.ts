import mongoose, { Schema, Document } from 'mongoose'
import { PaymentStatus } from '@/domain/entities/payment-status'
import { PaymentMethod } from '@/domain/entities/payment-method'

/**
 * Payment Document Interface
 * Represents payment data structure in MongoDB
 * 
 * Architecture: Clean Architecture - Infrastructure Layer
 * Maps domain Payment entity to MongoDB document
 */
export interface PaymentDocument extends Document {
  _id: string
  orderId: string
  userId: string
  amount: number
  currency: string
  method: PaymentMethod
  status: PaymentStatus
  createdAt: Date
  updatedAt: Date
  correlationId?: string
  providerTransactionId?: string
  providerResponse?: Record<string, unknown>
  failureReason?: string
  retryCount: number
}

/**
 * Payment Schema Definition
 * Defines structure, validation, and indexes for payments collection
 */
const PaymentSchema = new Schema<PaymentDocument>(
  {
    _id: {
      type: String,
      required: true,
    },
    orderId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    currency: {
      type: String,
      required: true,
      uppercase: true,
      default: 'USD',
      maxlength: 3,
    },
    method: {
      type: String,
      required: true,
      enum: Object.values(PaymentMethod),
    },
    status: {
      type: String,
      required: true,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.PENDING,
      index: true,
    },
    correlationId: {
      type: String,
      index: true,
      sparse: true,
    },
    providerTransactionId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    providerResponse: {
      type: Schema.Types.Mixed,
    },
    failureReason: {
      type: String,
    },
    retryCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    collection: 'payments',
    versionKey: false,
  },
)

/**
 * Indexes for optimized queries
 * Compound indexes for common query patterns
 */
PaymentSchema.index({ orderId: 1, createdAt: -1 })
PaymentSchema.index({ userId: 1, createdAt: -1 })
PaymentSchema.index({ status: 1, createdAt: -1 })
PaymentSchema.index({ correlationId: 1 }, { sparse: true })

/**
 * Virtual field: formattedAmount
 * Returns amount with currency symbol
 */
PaymentSchema.virtual('formattedAmount').get(function () {
  const symbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    MXN: '$',
  }
  const symbol = symbols[this.currency] || this.currency
  return `${symbol}${this.amount.toFixed(2)}`
})

/**
 * Pre-save middleware
 * Validates business rules before saving
 */
PaymentSchema.pre('save', function (next) {
  // Ensure amount is positive
  if (this.amount <= 0) {
    next(new Error('Payment amount must be greater than 0'))
    return
  }

  // Ensure currency is uppercase
  if (this.currency) {
    this.currency = this.currency.toUpperCase()
  }

  next()
})

/**
 * Payment Model
 * Mongoose model for payments collection
 */
export const PaymentModel = mongoose.model<PaymentDocument>(
  'Payment',
  PaymentSchema,
)
