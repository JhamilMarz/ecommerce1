import { PaymentMethod } from '@/domain/entities/payment-method'
import { PaymentStatus } from '@/domain/entities/payment-status'

/**
 * DTOs - Application Layer
 * Data Transfer Objects for payment operations
 * 
 * Architecture: Clean Architecture - Application Layer
 * Used for API input/output and use case communication
 */

/**
 * DTO for initiating a payment
 * Input for POST /api/v1/payments/init
 */
export interface InitiatePaymentDto {
  orderId: string
  userId: string
  amount: number
  currency: string
  method: PaymentMethod
  correlationId?: string
}

/**
 * DTO for payment response
 * Output for all payment endpoints
 */
export interface PaymentResponseDto {
  id: string
  orderId: string
  userId: string
  amount: number
  currency: string
  method: PaymentMethod
  status: PaymentStatus
  createdAt: string
  updatedAt: string
  correlationId?: string
  providerTransactionId?: string
  providerResponse?: Record<string, unknown>
  failureReason?: string
  retryCount: number
}

/**
 * DTO for payment list response with pagination
 * Output for GET /api/v1/payments/order/:orderId
 * Output for GET /api/v1/payments/user/:userId
 */
export interface PaymentListResponseDto {
  payments: PaymentResponseDto[]
  total: number
  page: number
  limit: number
  totalPages: number
}

/**
 * DTO for payment callback from simulator
 * Internal use for processing payment results
 */
export interface PaymentCallbackDto {
  paymentId: string
  providerTransactionId: string
  status: 'success' | 'failure'
  providerResponse?: Record<string, unknown>
  failureReason?: string
}

/**
 * DTO for payment statistics (future use)
 */
export interface PaymentStatsDto {
  totalPayments: number
  succeededPayments: number
  failedPayments: number
  totalAmount: number
  averageAmount: number
  successRate: number
}
