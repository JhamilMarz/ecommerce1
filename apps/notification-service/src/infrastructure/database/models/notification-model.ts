import { DataTypes, Model, Optional } from 'sequelize'
import { v4 as uuidv4 } from 'uuid'
import { sequelize } from './database'
import { NotificationChannel } from '../../domain/value-objects/notification-channel'
import { NotificationStatus } from '../../domain/value-objects/notification-status'

/**
 * Notification Model Attributes
 *
 * Database representation of notification entity.
 */
export interface NotificationModelAttributes {
  id: string
  eventType: string
  channel: NotificationChannel
  recipientId: string
  recipientEmail?: string
  recipientPhone?: string
  recipientWebhookUrl?: string
  subject?: string
  message: string
  metadata?: Record<string, unknown>
  status: NotificationStatus
  retries: number
  lastError?: string
  providerResponse?: Record<string, unknown>
  sentAt?: Date
  correlationId: string
  createdAt: Date
  updatedAt: Date
}

/**
 * Creation attributes (omit auto-generated fields)
 */
export interface NotificationCreationAttributes
  extends Optional<
    NotificationModelAttributes,
    'id' | 'retries' | 'status' | 'correlationId' | 'createdAt' | 'updatedAt'
  > {}

/**
 * Notification Sequelize Model
 *
 * ORM model for notifications table.
 *
 * @remarks
 * - Custom UUID primary key (not auto-increment)
 * - JSON columns for metadata and providerResponse
 * - Indexes created separately in indexes.ts
 * - Hooks generate UUID if not provided
 */
export class NotificationModel
  extends Model<NotificationModelAttributes, NotificationCreationAttributes>
  implements NotificationModelAttributes
{
  declare id: string
  declare eventType: string
  declare channel: NotificationChannel
  declare recipientId: string
  declare recipientEmail?: string
  declare recipientPhone?: string
  declare recipientWebhookUrl?: string
  declare subject?: string
  declare message: string
  declare metadata?: Record<string, unknown>
  declare status: NotificationStatus
  declare retries: number
  declare lastError?: string
  declare providerResponse?: Record<string, unknown>
  declare sentAt?: Date
  declare correlationId: string
  declare readonly createdAt: Date
  declare readonly updatedAt: Date
}

NotificationModel.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: () => uuidv4(),
      allowNull: false,
    },
    eventType: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Event type that triggered notification (e.g., user.created, order.paid)',
    },
    channel: {
      type: DataTypes.ENUM('email', 'webhook', 'sms', 'push'),
      allowNull: false,
      comment: 'Notification delivery channel',
    },
    recipientId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Recipient identifier (user ID, device token, etc.)',
    },
    recipientEmail: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Email address (for email channel)',
    },
    recipientPhone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Phone number in E.164 format (for SMS channel)',
    },
    recipientWebhookUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Webhook URL (for webhook channel)',
    },
    subject: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Notification subject (optional, mainly for email)',
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Notification message content',
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Additional metadata (event payload, template vars, etc.)',
    },
    status: {
      type: DataTypes.ENUM('pending', 'sent', 'failed', 'retrying'),
      allowNull: false,
      defaultValue: 'pending',
      comment: 'Notification status',
    },
    retries: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Number of retry attempts',
    },
    lastError: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Last error message if failed',
    },
    providerResponse: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Response from notification provider (message ID, etc.)',
    },
    sentAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp when notification was successfully sent',
    },
    correlationId: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: () => uuidv4(),
      comment: 'Correlation ID for tracing and idempotency',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'notifications',
    timestamps: true,
    underscored: true,
    indexes: [
      // Indexes defined separately in indexes.ts
      // Listed here for documentation:
      // - idx_notifications_event_type
      // - idx_notifications_status
      // - idx_notifications_correlation_id
      // - idx_notifications_recipient_id
      // - idx_notifications_created_at
      // - idx_notifications_status_retries
      // - idx_notifications_event_type_channel
    ],
    hooks: {
      beforeValidate: (notification) => {
        // Generate UUID if not provided
        if (!notification.id) {
          notification.id = uuidv4()
        }

        // Generate correlationId if not provided
        if (!notification.correlationId) {
          notification.correlationId = uuidv4()
        }
      },
    },
  }
)
