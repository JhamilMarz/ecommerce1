import { DomainEvent } from './base.event'

export class UserRegisteredEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly role: string
  ) {
    super('user.registered')
  }
}

export class UserDeletedEvent extends DomainEvent {
  constructor(public readonly userId: string) {
    super('user.deleted')
  }
}
