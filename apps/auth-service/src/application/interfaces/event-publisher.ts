/**
 * Event Publisher Interface
 * Abstraction for publishing domain events to message broker
 */
export interface EventPublisher {
  /**
   * Publish an event to the message broker
   */
  publish(exchange: string, routingKey: string, data: unknown): Promise<void>;

  /**
   * Close connection
   */
  close(): Promise<void>;
}
