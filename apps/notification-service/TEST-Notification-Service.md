# TEST-Notification-Service.md

## Notification Service - Test Plan & Documentation

### 📋 Service Overview

**Service Name:** Notification Service  
**Port:** 3004  
**Architecture:** Clean Architecture (Domain → Application → Infrastructure)  
**Purpose:** Internal event-driven notification service that consumes RabbitMQ events and delivers notifications via multiple channels (email, webhook).

**Key Features:**

- ✅ Event-driven architecture (RabbitMQ consumer)
- ✅ Multi-channel support (email, webhook, SMS, push)
- ✅ State machine with retry logic (max 3 retries)
- ✅ Dead Letter Queue (DLQ) for failed messages
- ✅ Idempotency via correlationId
- ✅ PostgreSQL persistence with 7 optimized indexes
- ✅ Prometheus metrics + Winston structured logging
- ✅ NO public business endpoints (internal service)

---

## 🏗️ Architecture

### Clean Architecture Layers

```
src/
├── domain/
│   ├── entities/
│   │   └── notification.ts           # Core entity with business logic
│   ├── repositories/
│   │   └── notification-repository.ts # Repository interface (DIP)
│   └── value-objects/
│       ├── notification-channel.ts    # Channel types
│       └── notification-status.ts     # Status state machine
├── application/
│   ├── interfaces/
│   │   └── notification-provider.ts   # Provider abstraction
│   └── use-cases/
│       ├── send-notification.ts       # Send with idempotency
│       ├── get-notification.ts        # Query notifications
│       └── retry-notification.ts      # Retry failed
└── infrastructure/
    ├── database/
    │   ├── database.ts                # PostgreSQL connection
    │   ├── notification-model.ts      # Sequelize model
    │   ├── postgres-notification-repository.ts
    │   ├── indexes.ts                 # 7 database indexes
    │   └── seed.ts                    # Dev seed data
    ├── providers/
    │   ├── email-provider-service.ts  # Email (simulated)
    │   ├── webhook-provider-service.ts # Webhook (simulated)
    │   └── notification-provider-registry.ts
    ├── messaging/
    │   ├── rabbitmq-event-consumer.ts # RabbitMQ consumer
    │   └── event-handlers.ts          # Event routing
    ├── http/
    │   ├── controllers/
    │   │   └── health-controller.ts   # Health check
    │   └── routes.ts                  # /health, /metrics
    └── observability/
        ├── logger.ts                  # Winston logging
        └── metrics.ts                 # Prometheus metrics
```

### State Machine

```
┌─────────┐
│ pending │
└────┬────┘
     │
     ├─────► sent (terminal)
     │
     └─────► failed
             │
             ├─────► retrying (retry #1)
             │        │
             │        ├─────► sent (terminal)
             │        └─────► failed
             │                 │
             │                 └─────► retrying (retry #2)
             │                          │
             │                          ├─────► sent (terminal)
             │                          └─────► failed
             │                                   │
             │                                   └─────► retrying (retry #3)
             │                                            │
             │                                            ├─────► sent (terminal)
             │                                            └─────► failed (DLQ)
             │
             └─────► sent (terminal, if provider succeeds)
```

**Rules:**

- **pending** → sent | failed | retrying
- **sent** → terminal (no transitions)
- **failed** → retrying (if retries < 3)
- **retrying** → sent | failed
- Max 3 retries, then DLQ

---

## 🧪 Test Coverage

### Domain Tests (`notification.test.ts`)

**15 Test Cases:**

1. **create() - Email Channel**

   - ✅ Creates notification with email channel
   - ✅ Sets status to 'pending'
   - ✅ Generates UUID id
   - ✅ Initializes retries to 0

2. **create() - Webhook Channel**

   - ✅ Creates notification with webhook channel
   - ✅ Validates webhook URL format

3. **create() - Invalid Email**

   - ✅ Throws error for invalid email format
   - ✅ Email regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`

4. **create() - Missing Email**

   - ✅ Throws error when email channel requires recipientEmail

5. **create() - Missing Webhook URL**

   - ✅ Throws error when webhook channel requires recipientWebhookUrl

6. **markSent() - Success**

   - ✅ Transitions status from 'pending' to 'sent'
   - ✅ Sets sentAt timestamp
   - ✅ Stores providerResponse metadata

7. **markSent() - Invalid Transition**

   - ✅ Throws error for 'sent' → 'sent' transition

8. **markFailed() - Success**

   - ✅ Transitions status from 'pending' to 'failed'
   - ✅ Stores lastError message

9. **markRetrying() - Success**

   - ✅ Transitions status from 'failed' to 'retrying'

10. **markRetrying() - Invalid Transition**

    - ✅ Throws error for 'sent' → 'retrying' transition

11. **incrementRetry() - Count**

    - ✅ Increments retries from 0 → 1 → 2 → 3

12. **canRetry() - Below Max**

    - ✅ Returns true when status='failed' && retries < 3

13. **canRetry() - At Max**

    - ✅ Returns false when retries >= 3

14. **canRetry() - Terminal Status**

    - ✅ Returns false when status='sent'

15. **isTerminal() - Status Check**
    - ✅ Returns true for 'sent'
    - ✅ Returns false for 'pending', 'failed', 'retrying'

### Application Tests (`send-notification.test.ts`)

**10 Test Cases:**

1. **execute() - Success Flow**

   - ✅ Creates notification entity
   - ✅ Saves to repository with status='pending'
   - ✅ Selects provider by channel
   - ✅ Sends notification via provider
   - ✅ Updates status to 'sent'
   - ✅ Stores messageId and providerResponse

2. **execute() - Idempotency**

   - ✅ Checks correlationId for duplicates
   - ✅ Returns existing notification if found
   - ✅ Skips send operation

3. **execute() - No Provider**

   - ✅ Throws error when no provider registered for channel

4. **execute() - Provider Unavailable**

   - ✅ Throws error when provider.isAvailable() returns false

5. **execute() - Send Failure**

   - ✅ Marks notification as 'failed'
   - ✅ Stores error message in lastError
   - ✅ Updates repository

6. **execute() - Provider Exception**

   - ✅ Catches exceptions from provider.send()
   - ✅ Marks notification as 'failed'
   - ✅ Includes error details

7. **execute() - Validation**

   - ✅ Validates notification data before saving
   - ✅ Throws error for invalid email/phone/webhook

8. **execute() - Metadata**

   - ✅ Includes metadata in notification entity
   - ✅ Persists metadata to database

9. **execute() - CorrelationId**

   - ✅ Sets correlationId from input
   - ✅ Uses correlationId for idempotency check

10. **execute() - Provider Selection**
    - ✅ Calls providerRegistry.getProvider(channel)
    - ✅ Uses correct provider for channel

### Test Commands

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

**Coverage Thresholds:**

- Branches: ≥70%
- Functions: ≥80%
- Lines: ≥80%
- Statements: ≥80%

---

## 🔄 Event Flow

### Consumed Events

| Event Type          | Binding Key       | Handler                  | Notifications Created          |
| ------------------- | ----------------- | ------------------------ | ------------------------------ |
| **user.created**    | `user.created`    | `handleUserCreated()`    | 1 email (welcome)              |
| **order.created**   | `order.created`   | `handleOrderCreated()`   | 1 email + 1 webhook (optional) |
| **order.paid**      | `order.paid`      | `handleOrderPaid()`      | 1 email (payment confirmation) |
| **order.cancelled** | `order.cancelled` | `handleOrderCancelled()` | 1 email (cancellation)         |
| **payment.failed**  | `payment.failed`  | `handlePaymentFailed()`  | 1 email + 1 webhook (optional) |

### RabbitMQ Configuration

- **Exchange:** `events` (type: topic)
- **Queue:** `notification-service-events`
- **DLQ:** `notification-service-events-dlq`
- **Prefetch:** 1 message at a time
- **Acknowledgment:** Manual (ack after processing)
- **Retry Logic:** Max 3 retries via `x-retry-count` header

### Event Processing Flow

```
1. RabbitMQ publishes event to 'events' exchange
2. Event routed to 'notification-service-events' queue
3. Consumer fetches message (prefetch 1)
4. Parse event payload
5. Route to appropriate handler (event-handlers.ts)
6. Handler extracts recipient info
7. Calls SendNotificationUseCase
8. Check correlationId (idempotency)
9. Create Notification entity
10. Save to database (status='pending')
11. Select provider by channel
12. Send notification
    ├─ Success → status='sent', ack message
    └─ Failure → status='failed', nack + requeue
13. Update database
14. Acknowledge RabbitMQ message
```

**Retry Flow:**

```
1. Message fails processing
2. Increment x-retry-count header
3. If retries < 3: nack + requeue
4. If retries >= 3: nack + route to DLQ
5. DLQ messages require manual intervention
```

---

## 📡 HTTP Endpoints

### GET /health

**Purpose:** Health check for monitoring  
**Authentication:** None (public)  
**Response:**

```json
{
  "status": "healthy",
  "service": "notification-service",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 12345,
  "checks": {
    "database": "connected"
  }
}
```

**Status Codes:**

- `200` - Healthy
- `503` - Unhealthy (database down)

### GET /metrics

**Purpose:** Prometheus metrics  
**Authentication:** None (public)  
**Response:** Prometheus text format

**Metrics:**

- `notification_operations_total` (counter) - labels: operation, status
- `notification_processing_duration_seconds` (histogram) - labels: operation
- `rabbitmq_messages_total` (counter) - labels: event_type, status
- `rabbitmq_message_processing_duration_seconds` (histogram) - labels: event_type
- `database_operations_total` (counter) - labels: operation, status
- `database_operation_duration_seconds` (histogram) - labels: operation
- `provider_operation_duration_seconds` (histogram) - labels: provider, operation

---

## 🗄️ Database Schema

### Table: `notifications`

| Column                  | Type         | Constraints   | Description                             |
| ----------------------- | ------------ | ------------- | --------------------------------------- |
| `id`                    | UUID         | PRIMARY KEY   | Custom UUID (not auto-increment)        |
| `event_type`            | VARCHAR(100) | NOT NULL      | Event that triggered notification       |
| `channel`               | ENUM         | NOT NULL      | 'email', 'webhook', 'sms', 'push'       |
| `recipient_id`          | VARCHAR(255) | NOT NULL      | User/merchant ID                        |
| `recipient_email`       | VARCHAR(255) |               | Email address (for email channel)       |
| `recipient_phone`       | VARCHAR(50)  |               | Phone number (for SMS/push)             |
| `recipient_webhook_url` | VARCHAR(500) |               | Webhook URL (for webhook channel)       |
| `subject`               | VARCHAR(500) | NOT NULL      | Notification subject/title              |
| `message`               | TEXT         | NOT NULL      | Notification body                       |
| `metadata`              | JSONB        |               | Additional event data                   |
| `status`                | ENUM         | NOT NULL      | 'pending', 'sent', 'failed', 'retrying' |
| `retries`               | INTEGER      | DEFAULT 0     | Retry attempt count                     |
| `last_error`            | TEXT         |               | Last error message                      |
| `provider_response`     | JSONB        |               | Provider API response                   |
| `sent_at`               | TIMESTAMP    |               | Delivery timestamp                      |
| `correlation_id`        | VARCHAR(255) | UNIQUE        | Idempotency key                         |
| `created_at`            | TIMESTAMP    | DEFAULT NOW() | Creation timestamp                      |
| `updated_at`            | TIMESTAMP    | DEFAULT NOW() | Last update timestamp                   |

### Indexes (7)

1. **idx_notifications_event_type** (BTREE)

   - Column: `event_type`
   - Purpose: Filter by event type

2. **idx_notifications_status** (BTREE)

   - Column: `status`
   - Purpose: Filter by status, retry jobs

3. **idx_notifications_correlation_id** (BTREE)

   - Column: `correlation_id`
   - Purpose: Idempotency checks

4. **idx_notifications_recipient_id** (BTREE)

   - Column: `recipient_id`
   - Purpose: User notification history

5. **idx_notifications_created_at** (BTREE)

   - Column: `created_at`
   - Purpose: Time-based queries, pagination

6. **idx_notifications_status_retries** (BTREE, Compound)

   - Columns: `status`, `retries`
   - Purpose: Find retryable notifications (status='failed' AND retries < 3)

7. **idx_notifications_event_type_channel** (BTREE, Compound)
   - Columns: `event_type`, `channel`
   - Purpose: Analytics, reporting

---

## 🎭 Provider Simulation

### Email Provider (`email-provider-service.ts`)

**Simulation Details:**

- **Line 65:** `console.log("INSERTAR SERVICIO DE EMAIL")` ✅
- **Success Rate:** 90% (configurable via `EMAIL_PROVIDER_SUCCESS_RATE`)
- **Delay:** 500-1500ms (simulates network latency)
- **Mock Message IDs:** `email-mock-[UUID]`
- **Error Cases:** Invalid email, bounced, mailbox full, timeout, rate limit

**Production Replacement:**

```typescript
// Replace line 65 with real email service (e.g., SendGrid)
const msg = {
  to: notification.recipientEmail,
  from: process.env.SENDGRID_FROM_EMAIL,
  subject: notification.subject,
  text: notification.message,
};
const response = await sgMail.send(msg);
```

### Webhook Provider (`webhook-provider-service.ts`)

**Simulation Details:**

- **Line 72:** `console.log("INSERTAR SERVICIO DE WEBHOOK")` ✅
- **Success Rate:** 90% (configurable via `WEBHOOK_PROVIDER_SUCCESS_RATE`)
- **Delay:** 500-2000ms (simulates HTTP latency)
- **Mock Status Codes:** 200, 400, 401, 404, 429, 500, 502, 503
- **Mock Response Bodies:** JSON with status, webhook_id, error

**Production Replacement:**

```typescript
// Replace line 72 with real HTTP client (e.g., axios)
const response = await axios.post(
  notification.recipientWebhookUrl,
  {
    event: notification.eventType,
    subject: notification.subject,
    message: notification.message,
    metadata: notification.metadata,
  },
  {
    headers: { 'Content-Type': 'application/json' },
    timeout: 5000,
  },
);
```

---

## 🐳 Docker Deployment

### Local Development

```bash
# Start all services (PostgreSQL + RabbitMQ + notification-service)
docker-compose up -d

# View logs
docker-compose logs -f notification-service

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### Service URLs

| Service                  | Port  | URL                                         | Credentials       |
| ------------------------ | ----- | ------------------------------------------- | ----------------- |
| **Notification Service** | 3004  | http://localhost:3004                       | -                 |
| **Health Check**         | 3004  | http://localhost:3004/health                | -                 |
| **Metrics**              | 3004  | http://localhost:3004/metrics               | -                 |
| **PostgreSQL**           | 5433  | postgresql://localhost:5433/notification_db | postgres/postgres |
| **RabbitMQ Management**  | 15674 | http://localhost:15674                      | guest/guest       |
| **RabbitMQ AMQP**        | 5674  | amqp://localhost:5674                       | guest/guest       |

### Build & Push

```bash
# Build image
docker build -t notification-service:1.0.0 .

# Run standalone container
docker run -d \
  --name notification-service \
  -p 3004:3004 \
  -e DATABASE_URL=postgresql://postgres:postgres@host.docker.internal:5433/notification_db \
  -e RABBITMQ_URL=amqp://guest:guest@host.docker.internal:5674 \
  notification-service:1.0.0

# Tag for registry
docker tag notification-service:1.0.0 myregistry.com/notification-service:1.0.0

# Push to registry
docker push myregistry.com/notification-service:1.0.0
```

---

## 📊 Monitoring

### Winston Logging

**Format:** JSON structured logs  
**Log Level:** Configurable via `LOG_LEVEL` env (default: info)  
**Transports:**

- Console (always)
- File (production only): `logs/notification-service.log`

**Log Fields:**

- `timestamp`: ISO 8601
- `level`: debug, info, warn, error
- `message`: Log message
- `service`: notification-service
- `correlationId`: Request correlation ID
- `operation`: Operation name (e.g., send_notification, rabbitmq_event)
- `metadata`: Additional context (event type, channel, status, error)

**Example Log:**

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "info",
  "message": "Notification sent successfully",
  "service": "notification-service",
  "correlationId": "corr-abc-123",
  "operation": "send_notification",
  "notificationId": "notif-xyz-456",
  "channel": "email",
  "provider": "EmailProvider"
}
```

### Prometheus Metrics

**Endpoint:** `GET /metrics`

**Key Metrics:**

1. **notification_operations_total** (counter)

   - Labels: operation (create, send, retry), status (success, failure)
   - Purpose: Track notification operations

2. **notification_processing_duration_seconds** (histogram)

   - Labels: operation (create, send, retry)
   - Buckets: 0.1, 0.5, 1, 2, 5, 10 seconds
   - Purpose: Measure processing latency

3. **rabbitmq_messages_total** (counter)

   - Labels: event_type (user.created, order.created, etc.), status (success, failure)
   - Purpose: Track message consumption

4. **rabbitmq_message_processing_duration_seconds** (histogram)

   - Labels: event_type
   - Buckets: 0.1, 0.5, 1, 2, 5, 10 seconds
   - Purpose: Measure message processing latency

5. **database_operations_total** (counter)

   - Labels: operation (save, update, find), status (success, failure)
   - Purpose: Track database operations

6. **database_operation_duration_seconds** (histogram)

   - Labels: operation (save, update, find)
   - Buckets: 0.01, 0.05, 0.1, 0.5, 1 seconds
   - Purpose: Measure query performance

7. **provider_operation_duration_seconds** (histogram)
   - Labels: provider (EmailProvider, WebhookProvider), operation (send)
   - Buckets: 0.1, 0.5, 1, 2, 5, 10 seconds
   - Purpose: Measure provider latency

---

## 🚀 Production Checklist

- [ ] Replace email provider simulation with real service (SendGrid, SES, etc.)
- [ ] Replace webhook provider simulation with real HTTP client (axios)
- [ ] Configure database connection pooling for high load
- [ ] Set up database replication (read replicas)
- [ ] Configure RabbitMQ clustering for high availability
- [ ] Enable TLS/SSL for database and RabbitMQ connections
- [ ] Set up Prometheus scraping for metrics endpoint
- [ ] Configure log aggregation (ELK, Datadog, etc.)
- [ ] Implement SMS and Push notification providers
- [ ] Set up alerting for DLQ messages (PagerDuty, Slack)
- [ ] Configure rate limiting for providers
- [ ] Enable CORS if exposing metrics to external systems
- [ ] Review and tune retry delay (`RETRY_DELAY_MS`)
- [ ] Load test notification throughput
- [ ] Document runbook for operational procedures

---

## 📝 License

MIT

---

**Last Updated:** 2024-01-15  
**Version:** 1.0.0  
**Maintainer:** Backend Team
