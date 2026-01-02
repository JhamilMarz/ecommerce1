import { Op } from 'sequelize'
import { Notification } from '../../domain/entities/notification'
import { NotificationRepository } from '../../domain/repositories/notification-repository'
import { NotificationStatus } from '../../domain/value-objects/notification-status'
import { NotificationModel } from '../models/notification-model'
import { MAX_RETRY_ATTEMPTS } from '../../domain/entities/notification'

/**
 * PostgreSQL Notification Repository
 *
 * Implements NotificationRepository using Sequelize ORM.
 *
 * @remarks
 * - Converts between domain entities and database models
 * - Handles all persistence operations
 * - Uses Sequelize for query optimization
 */
export class PostgresNotificationRepository implements NotificationRepository {
  /**
   * Save a new notification
   */
  async save(notification: Notification): Promise<Notification> {
    const model = await NotificationModel.create({
      id: notification.id,
      eventType: notification.eventType,
      channel: notification.channel,
      recipientId: notification.recipientId,
      recipientEmail: notification.recipientEmail,
      recipientPhone: notification.recipientPhone,
      recipientWebhookUrl: notification.recipientWebhookUrl,
      subject: notification.subject,
      message: notification.message,
      metadata: notification.metadata,
      status: notification.status,
      retries: notification.retries,
      lastError: notification.lastError,
      providerResponse: notification.providerResponse,
      sentAt: notification.sentAt,
      correlationId: notification.correlationId,
    })

    return this.toDomain(model)
  }

  /**
   * Update an existing notification
   */
  async update(notification: Notification): Promise<Notification> {
    const model = await NotificationModel.findByPk(notification.id)

    if (!model) {
      throw new Error(`Notification with ID ${notification.id} not found`)
    }

    await model.update({
      eventType: notification.eventType,
      channel: notification.channel,
      recipientId: notification.recipientId,
      recipientEmail: notification.recipientEmail,
      recipientPhone: notification.recipientPhone,
      recipientWebhookUrl: notification.recipientWebhookUrl,
      subject: notification.subject,
      message: notification.message,
      metadata: notification.metadata,
      status: notification.status,
      retries: notification.retries,
      lastError: notification.lastError,
      providerResponse: notification.providerResponse,
      sentAt: notification.sentAt,
      correlationId: notification.correlationId,
    })

    return this.toDomain(model)
  }

  /**
   * Find notification by ID
   */
  async findById(id: string): Promise<Notification | null> {
    const model = await NotificationModel.findByPk(id)

    if (!model) {
      return null
    }

    return this.toDomain(model)
  }

  /**
   * Find notifications by correlation ID
   */
  async findByCorrelationId(correlationId: string): Promise<Notification[]> {
    const models = await NotificationModel.findAll({
      where: { correlationId },
      order: [['createdAt', 'DESC']],
    })

    return models.map((model) => this.toDomain(model))
  }

  /**
   * Find notifications by event type
   */
  async findByEventType(eventType: string, limit: number = 50): Promise<Notification[]> {
    const models = await NotificationModel.findAll({
      where: { eventType },
      order: [['createdAt', 'DESC']],
      limit,
    })

    return models.map((model) => this.toDomain(model))
  }

  /**
   * Find notifications by status
   */
  async findByStatus(status: NotificationStatus, limit: number = 50): Promise<Notification[]> {
    const models = await NotificationModel.findAll({
      where: { status },
      order: [['createdAt', 'DESC']],
      limit,
    })

    return models.map((model) => this.toDomain(model))
  }

  /**
   * Find notifications by recipient ID
   */
  async findByRecipientId(recipientId: string, limit: number = 50): Promise<Notification[]> {
    const models = await NotificationModel.findAll({
      where: { recipientId },
      order: [['createdAt', 'DESC']],
      limit,
    })

    return models.map((model) => this.toDomain(model))
  }

  /**
   * Find failed notifications eligible for retry
   */
  async findRetryable(limit: number = 10): Promise<Notification[]> {
    const models = await NotificationModel.findAll({
      where: {
        status: 'failed',
        retries: {
          [Op.lt]: MAX_RETRY_ATTEMPTS,
        },
      },
      order: [['createdAt', 'ASC']], // Oldest first
      limit,
    })

    return models.map((model) => this.toDomain(model))
  }

  /**
   * Count notifications by status
   */
  async countByStatus(status: NotificationStatus): Promise<number> {
    return NotificationModel.count({
      where: { status },
    })
  }

  /**
   * Delete notification by ID
   */
  async deleteById(id: string): Promise<boolean> {
    const deletedCount = await NotificationModel.destroy({
      where: { id },
    })

    return deletedCount > 0
  }

  /**
   * Convert database model to domain entity
   */
  private toDomain(model: NotificationModel): Notification {
    return Notification.fromPersistence({
      id: model.id,
      eventType: model.eventType,
      channel: model.channel,
      recipientId: model.recipientId,
      recipientEmail: model.recipientEmail,
      recipientPhone: model.recipientPhone,
      recipientWebhookUrl: model.recipientWebhookUrl,
      subject: model.subject,
      message: model.message,
      metadata: model.metadata,
      status: model.status,
      retries: model.retries,
      lastError: model.lastError,
      providerResponse: model.providerResponse,
      sentAt: model.sentAt,
      correlationId: model.correlationId,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    })
  }
}
