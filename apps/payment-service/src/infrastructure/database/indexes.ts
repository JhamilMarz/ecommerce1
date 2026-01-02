import { PaymentModel } from './schemas/payment-schema'

/**
 * Database Indexes Management
 * 
 * Architecture: Clean Architecture - Infrastructure Layer
 * Ensures MongoDB indexes are created for optimal query performance
 * 
 * Indexes Strategy:
 * - Single field indexes for primary queries
 * - Compound indexes for common query patterns
 * - Sparse indexes for optional fields
 * 
 * Called during application startup
 */

/**
 * Creates all required indexes
 * Should be called after database connection is established
 */
export async function createIndexes(): Promise<void> {
  try {
    console.log('MongoDB: Creating indexes...')

    // Create indexes defined in schema
    await PaymentModel.createIndexes()

    console.log('MongoDB: Indexes created successfully')
  } catch (error) {
    console.error('MongoDB: Index creation failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    throw error
  }
}

/**
 * Lists all indexes on payments collection
 * Useful for debugging and verification
 */
export async function listIndexes(): Promise<any[]> {
  try {
    const indexes = await PaymentModel.collection.getIndexes()
    console.log('MongoDB: Current indexes', { indexes })
    return indexes
  } catch (error) {
    console.error('MongoDB: Failed to list indexes', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    throw error
  }
}

/**
 * Index definitions for reference
 * 
 * Defined in payment-schema.ts:
 * 
 * 1. _id (default)
 *    - Unique identifier
 * 
 * 2. orderId (single field index)
 *    - Used by: findByOrderId()
 *    - Query: Find all payments for specific order
 * 
 * 3. userId (single field index)
 *    - Used by: findByUserId()
 *    - Query: Find all payments for specific user
 * 
 * 4. status (single field index)
 *    - Used by: findAll() with status filter
 *    - Query: Find payments by status (pending, succeeded, etc.)
 * 
 * 5. providerTransactionId (unique, sparse)
 *    - Used by: findByProviderTransactionId()
 *    - Query: Find payment by external provider ID
 *    - Sparse: Only indexed if field exists
 * 
 * 6. correlationId (single field, sparse)
 *    - Used by: Distributed tracing
 *    - Query: Find all payments in same transaction
 * 
 * 7. { orderId: 1, createdAt: -1 } (compound)
 *    - Used by: findByOrderId() with sorting
 *    - Query: Latest payments for specific order
 * 
 * 8. { userId: 1, createdAt: -1 } (compound)
 *    - Used by: findByUserId() with sorting
 *    - Query: Latest payments for specific user
 * 
 * 9. { status: 1, createdAt: -1 } (compound)
 *    - Used by: findAll() with status filter and sorting
 *    - Query: Latest payments by status
 */
