# @shared/events

Domain events for event-driven architecture (RabbitMQ).

## Usage

```typescript
import { OrderCreatedEvent, PaymentProcessedEvent } from '@shared/events'

const event = new OrderCreatedEvent(orderId, userId, totalAmount, items)
```

All events extend `DomainEvent` with eventId, timestamp, and version.
