import {
  Notification,
  NotificationProvider,
  NotificationProviderResult,
} from '../../../application'

/**
 * Email Provider Service (Simulated)
 *
 * Simulates email sending for development and testing.
 *
 * @remarks
 * - **PRODUCTION**: Replace with real email service (SendGrid, AWS SES, Mailgun, etc.)
 * - Simulates 90% success rate
 * - Random delay between 500-1500ms
 * - Generates mock message IDs
 *
 * @example Production replacement (SendGrid):
 * ```typescript
 * import sgMail from '@sendgrid/mail'
 * 
 * sgMail.setApiKey(process.env.SENDGRID_API_KEY!)
 * 
 * async send(notification: Notification): Promise<NotificationProviderResult> {
 *   try {
 *     const [response] = await sgMail.send({
 *       to: notification.recipientEmail!,
 *       from: process.env.SENDGRID_FROM_EMAIL!,
 *       subject: notification.subject || 'Notification',
 *       text: notification.message,
 *       html: notification.message,
 *     })
 * 
 *     return {
 *       success: true,
 *       messageId: response.headers['x-message-id'],
 *       metadata: { statusCode: response.statusCode }
 *     }
 *   } catch (error) {
 *     return {
 *       success: false,
 *       error: error.message
 *     }
 *   }
 * }
 * ```
 */
export class EmailProviderService implements NotificationProvider {
  private readonly successRate: number

  constructor(successRate: number = 0.9) {
    this.successRate = successRate
  }

  /**
   * Send email notification (simulated)
   */
  async send(notification: Notification): Promise<NotificationProviderResult> {
    // Validate channel
    if (notification.channel !== 'email') {
      return {
        success: false,
        error: `Invalid channel: ${notification.channel}. Expected: email`,
      }
    }

    // Validate recipient email
    if (!notification.recipientEmail) {
      return {
        success: false,
        error: 'Recipient email is required',
      }
    }

    // Simulate network delay
    const delay = Math.random() * 1000 + 500 // 500-1500ms
    await new Promise((resolve) => setTimeout(resolve, delay))

    // PLACEHOLDER: Replace with real email service in production
    console.log('INSERTAR SERVICIO DE EMAIL')

    // Simulate sending
    const isSuccess = Math.random() < this.successRate

    if (isSuccess) {
      const messageId = this.generateMessageId()

      // Log simulated email (for development)
      this.logSimulatedEmail(notification, messageId)

      return {
        success: true,
        messageId,
        metadata: {
          provider: 'email-simulator',
          recipientEmail: notification.recipientEmail,
          subject: notification.subject,
          delay: Math.round(delay),
          simulatedAt: new Date().toISOString(),
        },
      }
    } else {
      // Simulate random failures
      const errorReason = this.getRandomErrorReason()

      return {
        success: false,
        error: errorReason,
        metadata: {
          provider: 'email-simulator',
          delay: Math.round(delay),
        },
      }
    }
  }

  /**
   * Check if provider is available
   */
  async isAvailable(): Promise<boolean> {
    // In production, check email service API health
    return true
  }

  /**
   * Get provider name
   */
  getProviderName(): string {
    return 'email'
  }

  /**
   * Get supported channel
   */
  getSupportedChannel(): 'email' {
    return 'email'
  }

  /**
   * Generate mock message ID
   */
  private generateMessageId(): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 10)
    return `email-${timestamp}-${random}`
  }

  /**
   * Get random error reason
   */
  private getRandomErrorReason(): string {
    const reasons = [
      'Invalid email address',
      'Email bounced',
      'Recipient mailbox full',
      'SMTP connection timeout',
      'Rate limit exceeded',
      'Email service unavailable',
    ]

    return reasons[Math.floor(Math.random() * reasons.length)]
  }

  /**
   * Log simulated email (for development debugging)
   */
  private logSimulatedEmail(notification: Notification, messageId: string): void {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📧 SIMULATED EMAIL')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`Message ID: ${messageId}`)
    console.log(`To: ${notification.recipientEmail}`)
    console.log(`Subject: ${notification.subject || '(no subject)'}`)
    console.log(`Event Type: ${notification.eventType}`)
    console.log(`Correlation ID: ${notification.correlationId}`)
    console.log('─────────────────────────────')
    console.log(`Message:\n${notification.message}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  }
}
