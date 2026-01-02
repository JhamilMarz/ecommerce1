import { v4 as uuidv4 } from 'uuid'
import {
  type NotificationStatus,
  isValidStatusTransition,
  isTerminalStatus,
} from '../value-objects/notification-status'
import { type NotificationChannel } from '../value-objects/notification-channel'

/**
 * Maximum retry attempts for failed notifications
 */
export const MAX_RETRY_ATTEMPTS = 3

/**
 * Notification creation properties
 */
export interface CreateNotificationProps {
  eventType: string
  channel: NotificationChannel
  recipientId: string
  recipientEmail?: string
  recipientPhone?: string
  recipientWebhookUrl?: string
  subject?: string
  message: string
  metadata?: Record<string, unknown>
  correlationId?: string
}

/**
 * Notification entity properties
 */
export interface NotificationProps extends CreateNotificationProps {
  id: string
  status: NotificationStatus
  retries: number
  lastError?: string
  providerResponse?: Record<string, unknown>
  sentAt?: Date
  createdAt: Date
  updatedAt: Date
}

/**
 * Notification Domain Entity
 *
 * Represents a notification to be sent through a specific channel.
 *
 * Business Rules:
 * - Status follows state machine (pending → sent | failed | retrying)
 * - Max 3 retry attempts
 * - Terminal states (sent) cannot be modified
 * - correlationId enables idempotency
 * - Each channel requires specific recipient data
 */
export class Notification {
  private constructor(private props: NotificationProps) {}

  /**
   * Create a new notification
   *
   * @param props - Notification creation data
   * @returns New notification in pending state
   * @throws Error if validation fails
   */
  static create(props: CreateNotificationProps): Notification {
    const notification = new Notification({
      ...props,
      id: uuidv4(),
      status: 'pending',
      retries: 0,
      correlationId: props.correlationId || uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    notification.validate()

    return notification
  }

  /**
   * Reconstitute notification from persistence
   */
  static fromPersistence(props: NotificationProps): Notification {
    return new Notification(props)
  }

  /**
   * Validate notification data
   *
   * @throws Error if validation fails
   */
  validate(): void {
    if (!this.props.eventType || this.props.eventType.trim().length === 0) {
      throw new Error('Event type is required')
    }

    if (!this.props.recipientId || this.props.recipientId.trim().length === 0) {
      throw new Error('Recipient ID is required')
    }

    if (!this.props.message || this.props.message.trim().length === 0) {
      throw new Error('Message is required')
    }

    // Validate channel-specific requirements
    this.validateChannelRequirements()
  }

  /**
   * Validate channel-specific requirements
   *
   * @throws Error if channel requirements not met
   */
  private validateChannelRequirements(): void {
    switch (this.props.channel) {
      case 'email':
        if (!this.props.recipientEmail || !this.isValidEmail(this.props.recipientEmail)) {
          throw new Error('Valid recipient email is required for email channel')
        }
        break

      case 'sms':
        if (!this.props.recipientPhone || !this.isValidPhone(this.props.recipientPhone)) {
          throw new Error('Valid recipient phone is required for SMS channel')
        }
        break

      case 'webhook':
        if (!this.props.recipientWebhookUrl || !this.isValidUrl(this.props.recipientWebhookUrl)) {
          throw new Error('Valid recipient webhook URL is required for webhook channel')
        }
        break

      case 'push':
        // Push notifications use recipientId as device token
        if (!this.props.recipientId) {
          throw new Error('Recipient ID (device token) is required for push channel')
        }
        break
    }
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * Validate phone format (E.164)
   */
  private isValidPhone(phone: string): boolean {
    const phoneRegex = /^\+[1-9]\d{1,14}$/
    return phoneRegex.test(phone)
  }

  /**
   * Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url)
      return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:'
    } catch {
      return false
    }
  }

  /**
   * Mark notification as sent
   *
   * @param providerResponse - Response from notification provider
   * @throws Error if transition invalid
   */
  markSent(providerResponse?: Record<string, unknown>): void {
    if (!isValidStatusTransition(this.props.status, 'sent')) {
      throw new Error(`Cannot mark notification as sent from status: ${this.props.status}`)
    }

    this.props.status = 'sent'
    this.props.sentAt = new Date()
    this.props.providerResponse = providerResponse
    this.props.lastError = undefined
    this.props.updatedAt = new Date()
  }

  /**
   * Mark notification as failed
   *
   * @param error - Error message
   * @throws Error if transition invalid
   */
  markFailed(error: string): void {
    if (!isValidStatusTransition(this.props.status, 'failed')) {
      throw new Error(`Cannot mark notification as failed from status: ${this.props.status}`)
    }

    this.props.status = 'failed'
    this.props.lastError = error
    this.props.updatedAt = new Date()
  }

  /**
   * Mark notification as retrying
   *
   * @throws Error if transition invalid or max retries exceeded
   */
  markRetrying(): void {
    if (!isValidStatusTransition(this.props.status, 'retrying')) {
      throw new Error(`Cannot mark notification as retrying from status: ${this.props.status}`)
    }

    if (this.props.retries >= MAX_RETRY_ATTEMPTS) {
      throw new Error(`Max retry attempts (${MAX_RETRY_ATTEMPTS}) exceeded`)
    }

    this.props.status = 'retrying'
    this.props.updatedAt = new Date()
  }

  /**
   * Increment retry counter
   */
  incrementRetry(): void {
    this.props.retries += 1
    this.props.updatedAt = new Date()
  }

  /**
   * Check if notification can be retried
   *
   * @returns True if notification can be retried
   */
  canRetry(): boolean {
    return this.props.status === 'failed' && this.props.retries < MAX_RETRY_ATTEMPTS
  }

  /**
   * Check if notification is in terminal state
   *
   * @returns True if notification cannot be modified
   */
  isTerminal(): boolean {
    return isTerminalStatus(this.props.status)
  }

  /**
   * Check if notification can be modified
   *
   * @returns True if notification can be modified
   */
  canBeModified(): boolean {
    return !this.isTerminal()
  }

  /**
   * Change notification status
   *
   * @param newStatus - New status
   * @throws Error if transition invalid
   */
  changeStatus(newStatus: NotificationStatus): void {
    if (!isValidStatusTransition(this.props.status, newStatus)) {
      throw new Error(`Invalid status transition from ${this.props.status} to ${newStatus}`)
    }

    this.props.status = newStatus
    this.props.updatedAt = new Date()
  }

  // Getters
  get id(): string {
    return this.props.id
  }

  get eventType(): string {
    return this.props.eventType
  }

  get channel(): NotificationChannel {
    return this.props.channel
  }

  get recipientId(): string {
    return this.props.recipientId
  }

  get recipientEmail(): string | undefined {
    return this.props.recipientEmail
  }

  get recipientPhone(): string | undefined {
    return this.props.recipientPhone
  }

  get recipientWebhookUrl(): string | undefined {
    return this.props.recipientWebhookUrl
  }

  get subject(): string | undefined {
    return this.props.subject
  }

  get message(): string {
    return this.props.message
  }

  get metadata(): Record<string, unknown> | undefined {
    return this.props.metadata
  }

  get status(): NotificationStatus {
    return this.props.status
  }

  get retries(): number {
    return this.props.retries
  }

  get lastError(): string | undefined {
    return this.props.lastError
  }

  get providerResponse(): Record<string, unknown> | undefined {
    return this.props.providerResponse
  }

  get correlationId(): string {
    return this.props.correlationId!
  }

  get sentAt(): Date | undefined {
    return this.props.sentAt
  }

  get createdAt(): Date {
    return this.props.createdAt
  }

  get updatedAt(): Date {
    return this.props.updatedAt
  }

  /**
   * Convert to plain object
   */
  toObject(): NotificationProps {
    return { ...this.props }
  }
}
