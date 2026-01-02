import { Payment } from '../entities/payment'
import { PaymentStatus } from '../entities/payment-status'

/**
 * Payment Repository Interface - Domain Layer
 * 
 * Architecture: Clean Architecture - Domain Layer
 * Defines persistence operations without infrastructure details
 * Implementation will be in Infrastructure Layer (MongoDB)
 * 
 * Following Repository Pattern:
 * - Aggregate-oriented (Payment is aggregate root)
 * - Infrastructure-agnostic (no MongoDB/SQL details)
 * - Domain-focused operations
 */
export interface PaymentRepository {
  /**
   * Saves a payment (create or update)
   * 
   * @param payment - Payment entity to save
   * @returns Saved payment with generated ID if new
   */
  save(payment: Payment): Promise<Payment>

  /**
   * Finds payment by ID
   * 
   * @param id - Payment unique identifier
   * @returns Payment if found, null otherwise
   */
  findById(id: string): Promise<Payment | null>

  /**
   * Finds all payments for a specific order
   * Supports multiple payment attempts for same order
   * 
   * @param orderId - Order unique identifier
   * @returns Array of payments (empty if none found)
   */
  findByOrderId(orderId: string): Promise<Payment[]>

  /**
   * Finds all payments for a specific user
   * Paginated for large result sets
   * 
   * @param userId - User unique identifier
   * @param page - Page number (1-based)
   * @param limit - Items per page
   * @returns Payments and total count
   */
  findByUserId(
    userId: string,
    page?: number,
    limit?: number,
  ): Promise<{ payments: Payment[]; total: number }>

  /**
   * Finds all payments (admin only)
   * Paginated with optional status filter
   * 
   * @param page - Page number (1-based)
   * @param limit - Items per page
   * @param status - Optional status filter
   * @returns Payments and total count
   */
  findAll(
    page?: number,
    limit?: number,
    status?: PaymentStatus,
  ): Promise<{ payments: Payment[]; total: number }>

  /**
   * Finds payment by provider transaction ID
   * Used for webhook callbacks from payment providers
   * 
   * @param providerTransactionId - External provider's transaction ID
   * @returns Payment if found, null otherwise
   */
  findByProviderTransactionId(
    providerTransactionId: string,
  ): Promise<Payment | null>

  /**
   * Checks if payment exists
   * 
   * @param id - Payment unique identifier
   * @returns true if exists, false otherwise
   */
  exists(id: string): Promise<boolean>

  /**
   * Deletes payment (for testing/cleanup only)
   * Should NOT be used in production
   * 
   * @param id - Payment unique identifier
   * @returns true if deleted, false if not found
   */
  delete(id: string): Promise<boolean>
}
