import { DomainEvent } from './event-publisher'

/**
 * Event Publisher Interface - Application Layer
 * 
 * Architecture: Clean Architecture - Application Layer
 * Abstracts message broker implementation (RabbitMQ, Kafka, etc.)
 * Implementation will be in Infrastructure Layer
 * 
 * Responsibility:
 * - Publish domain events to message broker
 * - Ensure delivery (with retries)
 * - Handle connection lifecycle
 */
export interface EventPublisher {
  /**
   * Publishes a domain event to message broker
   * 
   * @param event - Domain event to publish
   * @throws Error if publish fails after retries
   */
  publish(event: DomainEvent): Promise<void>

  /**
   * Closes connection to message broker
   * Called during graceful shutdown
   */
  close(): Promise<void>
}
