import { DomainEvent } from './event-publisher';

/**
 * Event Publisher Interface
 * 
 * Abstraction for publishing domain events to message broker (RabbitMQ)
 * Implementation will be in Infrastructure Layer
 */
export interface EventPublisher {
  /**
   * Publish a domain event
   */
  publish(event: DomainEvent): Promise<void>;

  /**
   * Close connection (for graceful shutdown)
   */
  close(): Promise<void>;
}
