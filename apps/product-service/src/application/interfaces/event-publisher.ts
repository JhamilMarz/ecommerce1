export interface DomainEvent {
  eventType: string;
  aggregateId: string;
  occurredOn: Date;
  correlationId?: string;
  payload: unknown;
}

export interface EventPublisher {
  publish(event: DomainEvent): Promise<void>;
}
