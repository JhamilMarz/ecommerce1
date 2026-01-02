import {
  Notification,
  NotificationProvider,
  NotificationProviderResult,
} from '../../../application'

/**
 * Webhook Provider Service (Simulated)
 *
 * Simulates webhook HTTP POST requests for development and testing.
 *
 * @remarks
 * - **PRODUCTION**: Replace with real HTTP client (axios, node-fetch, etc.)
 * - Simulates 90% success rate
 * - Random delay between 500-2000ms
 * - Generates mock response data
 *
 * @example Production replacement (axios):
 * ```typescript
 * import axios from 'axios'
 * 
 * async send(notification: Notification): Promise<NotificationProviderResult> {
 *   try {
 *     const response = await axios.post(
 *       notification.recipientWebhookUrl!,
 *       {
 *         event: notification.eventType,
 *         data: notification.metadata,
 *         message: notification.message,
 *         correlationId: notification.correlationId,
 *         timestamp: new Date().toISOString(),
 *       },
 *       {
 *         headers: {
 *           'Content-Type': 'application/json',
 *           'X-Event-Type': notification.eventType,
 *           'X-Correlation-Id': notification.correlationId,
 *         },
 *         timeout: 10000,
 *       }
 *     )
 * 
 *     return {
 *       success: true,
 *       messageId: response.headers['x-webhook-id'] || `webhook-${Date.now()}`,
 *       metadata: {
 *         statusCode: response.status,
 *         responseData: response.data,
 *       }
 *     }
 *   } catch (error) {
 *     return {
 *       success: false,
 *       error: error.response?.data?.message || error.message
 *     }
 *   }
 * }
 * ```
 */
export class WebhookProviderService implements NotificationProvider {
  private readonly successRate: number

  constructor(successRate: number = 0.9) {
    this.successRate = successRate
  }

  /**
   * Send webhook notification (simulated)
   */
  async send(notification: Notification): Promise<NotificationProviderResult> {
    // Validate channel
    if (notification.channel !== 'webhook') {
      return {
        success: false,
        error: `Invalid channel: ${notification.channel}. Expected: webhook`,
      }
    }

    // Validate recipient webhook URL
    if (!notification.recipientWebhookUrl) {
      return {
        success: false,
        error: 'Recipient webhook URL is required',
      }
    }

    // Simulate network delay
    const delay = Math.random() * 1500 + 500 // 500-2000ms
    await new Promise((resolve) => setTimeout(resolve, delay))

    // PLACEHOLDER: Replace with real HTTP client in production
    console.log('INSERTAR SERVICIO DE WEBHOOK')

    // Simulate sending
    const isSuccess = Math.random() < this.successRate

    if (isSuccess) {
      const messageId = this.generateMessageId()
      const statusCode = 200

      // Log simulated webhook (for development)
      this.logSimulatedWebhook(notification, messageId, statusCode)

      return {
        success: true,
        messageId,
        metadata: {
          provider: 'webhook-simulator',
          recipientWebhookUrl: notification.recipientWebhookUrl,
          statusCode,
          delay: Math.round(delay),
          simulatedAt: new Date().toISOString(),
        },
      }
    } else {
      // Simulate random failures
      const { statusCode, errorReason } = this.getRandomError()

      return {
        success: false,
        error: errorReason,
        metadata: {
          provider: 'webhook-simulator',
          statusCode,
          delay: Math.round(delay),
        },
      }
    }
  }

  /**
   * Check if provider is available
   */
  async isAvailable(): Promise<boolean> {
    // In production, could check network connectivity or health endpoint
    return true
  }

  /**
   * Get provider name
   */
  getProviderName(): string {
    return 'webhook'
  }

  /**
   * Get supported channel
   */
  getSupportedChannel(): 'webhook' {
    return 'webhook'
  }

  /**
   * Generate mock message ID
   */
  private generateMessageId(): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 10)
    return `webhook-${timestamp}-${random}`
  }

  /**
   * Get random error with status code
   */
  private getRandomError(): { statusCode: number; errorReason: string } {
    const errors = [
      { statusCode: 400, errorReason: 'Bad Request: Invalid payload format' },
      { statusCode: 401, errorReason: 'Unauthorized: Invalid webhook signature' },
      { statusCode: 404, errorReason: 'Not Found: Webhook endpoint not found' },
      { statusCode: 408, errorReason: 'Request Timeout: Webhook took too long to respond' },
      { statusCode: 429, errorReason: 'Too Many Requests: Rate limit exceeded' },
      { statusCode: 500, errorReason: 'Internal Server Error: Webhook endpoint error' },
      { statusCode: 502, errorReason: 'Bad Gateway: Upstream server error' },
      { statusCode: 503, errorReason: 'Service Unavailable: Webhook endpoint down' },
    ]

    return errors[Math.floor(Math.random() * errors.length)]
  }

  /**
   * Log simulated webhook (for development debugging)
   */
  private logSimulatedWebhook(
    notification: Notification,
    messageId: string,
    statusCode: number
  ): void {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🔗 SIMULATED WEBHOOK')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`Message ID: ${messageId}`)
    console.log(`URL: ${notification.recipientWebhookUrl}`)
    console.log(`Method: POST`)
    console.log(`Status: ${statusCode}`)
    console.log(`Event Type: ${notification.eventType}`)
    console.log(`Correlation ID: ${notification.correlationId}`)
    console.log('─────────────────────────────')
    console.log('Payload:')
    console.log(
      JSON.stringify(
        {
          event: notification.eventType,
          data: notification.metadata,
          message: notification.message,
          correlationId: notification.correlationId,
          timestamp: new Date().toISOString(),
        },
        null,
        2
      )
    )
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  }
}
