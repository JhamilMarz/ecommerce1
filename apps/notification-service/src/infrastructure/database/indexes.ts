import { QueryInterface } from 'sequelize'
import { sequelize } from './database'

/**
 * Database Indexes for Notifications Table
 *
 * Creates optimized indexes for common query patterns.
 *
 * Indexes:
 * 1. idx_notifications_event_type - Filter by event type
 * 2. idx_notifications_status - Filter by status
 * 3. idx_notifications_correlation_id - Idempotency checks
 * 4. idx_notifications_recipient_id - Recipient queries
 * 5. idx_notifications_created_at - Time-based queries
 * 6. idx_notifications_status_retries - Retry job queries (compound)
 * 7. idx_notifications_event_type_channel - Event + channel queries (compound)
 *
 * @remarks
 * - Should be run after table creation
 * - Idempotent (drops existing indexes first)
 */

export async function createIndexes(): Promise<void> {
  const queryInterface: QueryInterface = sequelize.getQueryInterface()

  console.log('📊 Creating indexes for notifications table...')

  try {
    // Drop existing indexes if they exist (for idempotency)
    await dropIndexesIfExist(queryInterface)

    // 1. Event type index
    await queryInterface.addIndex('notifications', ['event_type'], {
      name: 'idx_notifications_event_type',
      using: 'BTREE',
    })
    console.log('  ✅ Created index: idx_notifications_event_type')

    // 2. Status index
    await queryInterface.addIndex('notifications', ['status'], {
      name: 'idx_notifications_status',
      using: 'BTREE',
    })
    console.log('  ✅ Created index: idx_notifications_status')

    // 3. Correlation ID index (unique for idempotency)
    await queryInterface.addIndex('notifications', ['correlation_id'], {
      name: 'idx_notifications_correlation_id',
      using: 'BTREE',
    })
    console.log('  ✅ Created index: idx_notifications_correlation_id')

    // 4. Recipient ID index
    await queryInterface.addIndex('notifications', ['recipient_id'], {
      name: 'idx_notifications_recipient_id',
      using: 'BTREE',
    })
    console.log('  ✅ Created index: idx_notifications_recipient_id')

    // 5. Created at index (for time-based queries)
    await queryInterface.addIndex('notifications', ['created_at'], {
      name: 'idx_notifications_created_at',
      using: 'BTREE',
    })
    console.log('  ✅ Created index: idx_notifications_created_at')

    // 6. Compound index: status + retries (for retry job queries)
    await queryInterface.addIndex('notifications', ['status', 'retries'], {
      name: 'idx_notifications_status_retries',
      using: 'BTREE',
    })
    console.log('  ✅ Created index: idx_notifications_status_retries')

    // 7. Compound index: event_type + channel (for event-channel queries)
    await queryInterface.addIndex('notifications', ['event_type', 'channel'], {
      name: 'idx_notifications_event_type_channel',
      using: 'BTREE',
    })
    console.log('  ✅ Created index: idx_notifications_event_type_channel')

    console.log('✅ All indexes created successfully')
  } catch (error) {
    console.error('❌ Error creating indexes:', error)
    throw error
  }
}

/**
 * Drop existing indexes if they exist
 *
 * @param queryInterface - Sequelize query interface
 */
async function dropIndexesIfExist(queryInterface: QueryInterface): Promise<void> {
  const indexNames = [
    'idx_notifications_event_type',
    'idx_notifications_status',
    'idx_notifications_correlation_id',
    'idx_notifications_recipient_id',
    'idx_notifications_created_at',
    'idx_notifications_status_retries',
    'idx_notifications_event_type_channel',
  ]

  for (const indexName of indexNames) {
    try {
      await queryInterface.removeIndex('notifications', indexName)
    } catch {
      // Index doesn't exist, ignore error
    }
  }
}

/**
 * Drop all indexes
 *
 * Useful for cleanup or migration rollback.
 */
export async function dropIndexes(): Promise<void> {
  const queryInterface: QueryInterface = sequelize.getQueryInterface()

  console.log('🗑️  Dropping indexes for notifications table...')

  try {
    await dropIndexesIfExist(queryInterface)
    console.log('✅ All indexes dropped successfully')
  } catch (error) {
    console.error('❌ Error dropping indexes:', error)
    throw error
  }
}

/**
 * Show index statistics
 *
 * Useful for monitoring and optimization.
 */
export async function showIndexStats(): Promise<void> {
  try {
    const [results] = await sequelize.query(`
      SELECT
        schemaname,
        tablename,
        indexname,
        pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
        idx_scan AS number_of_scans,
        idx_tup_read AS tuples_read,
        idx_tup_fetch AS tuples_fetched
      FROM pg_stat_user_indexes
      WHERE tablename = 'notifications'
      ORDER BY idx_scan DESC;
    `)

    console.log('📊 Index statistics for notifications table:')
    console.table(results)
  } catch (error) {
    console.error('❌ Error fetching index stats:', error)
    throw error
  }
}
