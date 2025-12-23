# ADR-003: Event-Driven Architecture with RabbitMQ

**Status**: Accepted  
**Date**: 2025-12-21  
**Decision Makers**: Architecture Team  
**Consulted**: Platform Team, Service Teams

---

## Context

Nuestros microservicios necesitan comunicarse entre sí. Las opciones principales son:

1. **Synchronous (REST APIs)**: Service A llama directamente a Service B via HTTP
2. **Asynchronous (Events/Messages)**: Service A publica evento, Service B lo consume
3. **Hybrid**: Combinar ambos según el caso

### Use Cases que Requieren Comunicación

- **Order created** → Notify customer, Update inventory, Process payment
- **Payment completed** → Update order status, Trigger shipping
- **Inventory low** → Notify admin, Create purchase order
- **User registered** → Send welcome email, Create customer profile

---

## Decision

**Adoptamos Event-Driven Architecture (EDA)** con **RabbitMQ** como message broker para comunicación asíncrona entre microservicios.

### When to Use Events vs REST

**Use Events (Async) para**:
✅ Fire-and-forget (no necesito respuesta inmediata)  
✅ Multiple consumers (varios services interesados en el mismo evento)  
✅ Decoupling (producer no sabe quién consume)  
✅ Background processing (emails, notifications, analytics)

**Use REST (Sync) para**:
✅ Request-Response (necesito resultado inmediato)  
✅ User-initiated actions (crear orden, login)  
✅ Query data de otro servicio  
✅ Real-time validation

### Architecture

```
┌──────────────┐
│ Order Service│
└──────┬───────┘
       │ Publish: order.created
       │
┌──────▼────────────────────┐
│      RabbitMQ             │
│  Exchange: events.topic   │
└──────┬────────────────────┘
       │
   ┌───┴────┬────────┬────────────┐
   │        │        │            │
┌──▼────┐ ┌▼─────┐ ┌▼──────┐  ┌──▼────────┐
│Payment│ │Email │ │Inventory│ │Analytics  │
│Service│ │Service│ │Service  │ │Service    │
└───────┘ └──────┘ └─────────┘ └───────────┘
```

**Subscribers**: Services se suscriben a eventos que les interesan, sin que producer sepa quiénes son.

---

## Rationale

### Why Event-Driven?

#### 1. **Loose Coupling**

- Order Service no necesita saber que Notification Service existe
- Agregar nuevo subscriber (Analytics) no requiere cambios en producer
- Remover subscriber no rompe nada

**Example**:

```typescript
// Order Service (Producer)
await orderRepo.save(order);
await eventBus.publish('order.created', {
  orderId: order.id,
  customerId: order.customerId,
  total: order.total,
});
// Order Service NO sabe quién va a procesar esto
```

```typescript
// Payment Service (Consumer)
eventBus.subscribe('order.created', async (event) => {
  await paymentService.charge({
    orderId: event.orderId,
    amount: event.total,
  });
});

// Notification Service (Consumer)
eventBus.subscribe('order.created', async (event) => {
  await emailService.sendOrderConfirmation(event.customerId, event.orderId);
});

// Nuevo subscriber - no cambia Order Service
eventBus.subscribe('order.created', async (event) => {
  await analyticsService.trackOrder(event);
});
```

---

#### 2. **Scalability**

- Consumers procesan eventos a su propio ritmo
- Si Email Service está lento, no bloquea Order Service
- Podemos agregar workers adicionales para procesar eventos más rápido

```
Order Service (creates 1000 orders/min)
         ↓
     RabbitMQ Queue
         ↓
Email Workers: 3 instances (cada uno procesa 400 emails/min)
Total throughput: 1200 emails/min
```

---

#### 3. **Resilience**

- Si Payment Service está down, eventos se quedan en queue
- Cuando vuelve, procesa eventos pendientes (no se pierden)
- Order Service sigue funcionando sin problemas

**RabbitMQ Durability**:

```typescript
// Messages persisten en disco
channel.assertQueue('orders', { durable: true });
channel.sendToQueue('orders', Buffer.from(JSON.stringify(order)), {
  persistent: true, // Sobrevive restart de RabbitMQ
});
```

---

#### 4. **Eventual Consistency**

- Aceptamos que data no es instantáneamente consistente
- Orden se crea → Email se envía 1-2 segundos después (acceptable)
- Trade-off: Performance y scalability > Strong consistency

---

### Why RabbitMQ?

**Alternatives considered**: Kafka, AWS SQS, Redis Pub/Sub

#### RabbitMQ Wins Because:

✅ **Simple setup**: Fácil de deploy y gestionar  
✅ **Rich routing**: Topic exchanges, fanout, direct, headers  
✅ **Guaranteed delivery**: Acknowledgments, persistence  
✅ **Wide language support**: Libraries para Node.js, Python, Go, etc.  
✅ **Management UI**: Web UI para monitoring, debugging  
✅ **Low latency**: < 10ms para publish/consume

#### vs Kafka

**Kafka pros**:

- Higher throughput (millions msgs/sec)
- Log retention (replay events)
- Stream processing

**Kafka cons**:

- ❌ Más complejo (Zookeeper, partitions, rebalancing)
- ❌ Overkill para nuestro scale (100-1000 msgs/sec)
- ❌ Heavier operational overhead

**Decision**: RabbitMQ suficiente para MVP y Growth phase. Re-evaluar Kafka en Scale phase (si throughput > 10k msgs/sec).

---

#### vs AWS SQS

**SQS pros**:

- Managed (no ops)
- Infinite scale

**SQS cons**:

- ❌ AWS vendor lock-in
- ❌ No topic exchanges (solo point-to-point queues)
- ❌ Max message size 256KB
- ❌ Latency mayor (~100ms)

**Decision**: RabbitMQ para mantener cloud portability.

---

## Implementation

### 1. RabbitMQ Deployment (Kubernetes)

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: rabbitmq
  namespace: messaging
spec:
  serviceName: rabbitmq
  replicas: 3 # HA cluster
  selector:
    matchLabels:
      app: rabbitmq
  template:
    metadata:
      labels:
        app: rabbitmq
    spec:
      containers:
        - name: rabbitmq
          image: rabbitmq:3.12-management
          env:
            - name: RABBITMQ_DEFAULT_USER
              value: 'admin'
            - name: RABBITMQ_DEFAULT_PASS
              valueFrom:
                secretKeyRef:
                  name: rabbitmq-secret
                  key: password
            - name: RABBITMQ_ERLANG_COOKIE
              value: 'secret-cookie'
          ports:
            - containerPort: 5672 # AMQP
            - containerPort: 15672 # Management UI
          volumeMounts:
            - name: data
              mountPath: /var/lib/rabbitmq
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: ['ReadWriteOnce']
        storageClassName: gp3
        resources:
          requests:
            storage: 50Gi
```

---

### 2. Event Schema (TypeScript)

```typescript
// events/order-events.ts
export interface OrderCreatedEvent {
  eventId: string;
  eventType: 'order.created';
  timestamp: string;
  version: '1.0';
  data: {
    orderId: string;
    customerId: string;
    items: Array<{
      productId: string;
      quantity: number;
      price: number;
    }>;
    total: number;
    currency: string;
  };
}

export interface OrderCancelledEvent {
  eventId: string;
  eventType: 'order.cancelled';
  timestamp: string;
  version: '1.0';
  data: {
    orderId: string;
    reason: string;
    cancelledBy: string;
  };
}
```

---

### 3. Event Bus Abstraction

```typescript
// lib/event-bus.ts
import amqp from 'amqplib';
import { v4 as uuidv4 } from 'uuid';

export class EventBus {
  private connection: amqp.Connection;
  private channel: amqp.Channel;

  async connect(url: string) {
    this.connection = await amqp.connect(url);
    this.channel = await this.connection.createChannel();

    // Create topic exchange
    await this.channel.assertExchange('events', 'topic', { durable: true });
  }

  async publish<T>(eventType: string, data: T): Promise<void> {
    const event = {
      eventId: uuidv4(),
      eventType,
      timestamp: new Date().toISOString(),
      version: '1.0',
      data,
    };

    const routingKey = eventType; // e.g., 'order.created'

    this.channel.publish(
      'events',
      routingKey,
      Buffer.from(JSON.stringify(event)),
      { persistent: true }
    );

    logger.info({ eventType, eventId: event.eventId }, 'Event published');
  }

  async subscribe<T>(
    eventPattern: string,
    handler: (event: T) => Promise<void>
  ): Promise<void> {
    const queueName = `${process.env.SERVICE_NAME}.${eventPattern}`;

    // Create queue
    await this.channel.assertQueue(queueName, { durable: true });

    // Bind queue to exchange with pattern
    await this.channel.bindQueue(queueName, 'events', eventPattern);

    // Consume messages
    this.channel.consume(queueName, async (msg) => {
      if (msg) {
        try {
          const event = JSON.parse(msg.content.toString());

          logger.info({ eventType: event.eventType }, 'Processing event');

          await handler(event);

          // Acknowledge (remove from queue)
          this.channel.ack(msg);
        } catch (error) {
          logger.error({ error }, 'Error processing event');

          // Reject and requeue (retry)
          this.channel.nack(msg, false, true);
        }
      }
    });
  }
}
```

---

### 4. Producer Example (Order Service)

```typescript
// order-service/src/orders/order.service.ts
import { EventBus } from '@lib/event-bus';
import { OrderCreatedEvent } from '@events/order-events';

export class OrderService {
  constructor(private orderRepo: OrderRepository, private eventBus: EventBus) {}

  async createOrder(data: CreateOrderDto): Promise<Order> {
    // 1. Save to database
    const order = await this.orderRepo.save(data);

    // 2. Publish event
    await this.eventBus.publish<OrderCreatedEvent>('order.created', {
      orderId: order.id,
      customerId: order.customerId,
      items: order.items,
      total: order.total,
      currency: 'USD',
    });

    return order;
  }
}
```

---

### 5. Consumer Example (Notification Service)

```typescript
// notification-service/src/main.ts
import { EventBus } from '@lib/event-bus';
import { OrderCreatedEvent } from '@events/order-events';

const eventBus = new EventBus();
await eventBus.connect(process.env.RABBITMQ_URL);

// Subscribe to order events
eventBus.subscribe<OrderCreatedEvent>('order.*', async (event) => {
  if (event.eventType === 'order.created') {
    // Send email
    await emailService.sendOrderConfirmation(
      event.data.customerId,
      event.data.orderId
    );
  }

  if (event.eventType === 'order.cancelled') {
    await emailService.sendCancellationNotice(
      event.data.customerId,
      event.data.orderId
    );
  }
});
```

---

## Event Patterns

### 1. Topic Exchange (Routing Pattern)

**Pattern matching**:

- `order.*` → Matches `order.created`, `order.cancelled`, `order.updated`
- `order.created` → Matches solo `order.created`
- `*.created` → Matches `order.created`, `payment.created`, etc.

---

### 2. Fanout (Broadcast)

**Use case**: Mismo evento para todos

```typescript
// Create fanout exchange
await channel.assertExchange('broadcasts', 'fanout');

// Every service gets the event
await channel.bindQueue('service-a-queue', 'broadcasts', '');
await channel.bindQueue('service-b-queue', 'broadcasts', '');
```

---

### 3. Dead Letter Queue (DLQ)

**Handle failed messages**:

```typescript
// Create DLQ
await channel.assertQueue('orders.dlq', { durable: true });

// Main queue con DLQ
await channel.assertQueue('orders', {
  durable: true,
  deadLetterExchange: '',
  deadLetterRoutingKey: 'orders.dlq',
  messageTtl: 60000, // 1 min antes de ir a DLQ
});
```

**Monitoring**: Alert si DLQ tiene > 10 mensajes.

---

## Event Versioning

**Problema**: Cambiar schema de evento puede romper consumers.

**Solución**: Versioning + backward compatibility.

```typescript
// v1.0
interface OrderCreatedEvent_V1 {
  version: '1.0';
  data: {
    orderId: string;
    total: number;
  };
}

// v2.0 (agregar campo)
interface OrderCreatedEvent_V2 {
  version: '2.0';
  data: {
    orderId: string;
    total: number;
    currency: string; // NEW
  };
}

// Consumer maneja ambas versiones
eventBus.subscribe('order.created', async (event) => {
  if (event.version === '1.0') {
    // Assume USD
    const currency = 'USD';
  } else if (event.version === '2.0') {
    const currency = event.data.currency;
  }
});
```

**Rule**: Siempre agregar campos, nunca remover (breaking change).

---

## Monitoring & Observability

### RabbitMQ Metrics (Prometheus)

```yaml
# Prometheus scrape config
- job_name: 'rabbitmq'
  static_configs:
    - targets: ['rabbitmq:15692']
```

**Key Metrics**:

- `rabbitmq_queue_messages` - Messages en queue
- `rabbitmq_queue_messages_ready` - Messages listos para consumir
- `rabbitmq_queue_messages_unacknowledged` - Messages being processed
- `rabbitmq_queue_consumers` - Active consumers

---

### Alerts

```yaml
- alert: RabbitMQQueueBacklog
  expr: rabbitmq_queue_messages > 1000
  for: 5m
  annotations:
    summary: 'Queue {{ $labels.queue }} has {{ $value }} messages'

- alert: RabbitMQNoConsumers
  expr: rabbitmq_queue_consumers == 0
  for: 5m
  annotations:
    summary: 'Queue {{ $labels.queue }} has no consumers'
```

---

## Trade-offs

### Pros

✅ Decoupling (loose coupling entre services)  
✅ Scalability (consumers paralelos)  
✅ Resilience (messages persisten si consumer down)  
✅ Flexibility (fácil agregar nuevos subscribers)

### Cons

❌ Eventual consistency (no immediate)  
❌ Debugging complexity (trace events cross-service)  
❌ Duplication risk (process mismo evento 2 veces)  
❌ Ordering challenges (events pueden llegar out-of-order)

---

## Idempotency

**Problema**: Consumer puede recibir mismo evento 2 veces (retry, network issue).

**Solución**: Idempotent consumers.

```typescript
// Store processed event IDs
const processedEvents = new Set<string>()

eventBus.subscribe('order.created', async (event) => {
  // Check if already processed
  if (processedEvents.has(event.eventId)) {
    logger.warn('Event already processed, skipping')
    return
  }

  // Process
  await emailService.send(...)

  // Mark as processed
  processedEvents.add(event.eventId)
  await redis.set(`event:${event.eventId}`, '1', 'EX', 86400)  // 24h TTL
})
```

---

## Success Metrics

- ✅ **Event publish latency** < 10ms
- ✅ **Event processing latency** < 1s (P95)
- ✅ **Queue depth** < 100 messages (under normal load)
- ✅ **Message loss rate** = 0% (durability)
- ✅ **Services can deploy independently** without coordination

---

**Última actualización**: Diciembre 2025
