import { randomUUID } from 'crypto'

export interface BaseEvent {
  eventId: string
  eventType: string
  timestamp: Date
  version: string
}

export abstract class DomainEvent implements BaseEvent {
  public readonly eventId: string
  public readonly timestamp: Date
  public readonly version: string = '1.0'

  constructor(public readonly eventType: string) {
    this.eventId = randomUUID()
    this.timestamp = new Date()
  }
}
