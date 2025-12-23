# Tracing Strategy

## 📋 Propósito

Define la estrategia de **distributed tracing** con Jaeger y OpenTelemetry para trackear requests a través de microservicios.

## 🎯 Tracing Goals

✅ **End-to-end visibility**: Ver request completo (gateway → service A → service B → database)  
✅ **Performance debugging**: Identificar bottlenecks (qué service es lento)  
✅ **Dependency mapping**: Visualizar cómo services se comunican  
✅ **Error attribution**: Qué service causó el error  
✅ **Low overhead**: < 1% performance impact

---

## 📊 Distributed Tracing Concepts

### Trace

**Request completo** desde inicio hasta fin

```
┌──────────────────────── Trace ─────────────────────────┐
│                                                         │
│  API Gateway → Order Service → Payment → Notification  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

### Span

**Una operación** dentro del trace

```
Trace: Create Order

├─ Span 1: API Gateway (100ms)
│  └─ Span 2: Order Service - Validate Order (50ms)
│     ├─ Span 3: Inventory Service - Check Stock (20ms)
│     │  └─ Span 4: Database Query (5ms)
│     └─ Span 5: Payment Service - Charge Card (30ms)
│        └─ Span 6: Stripe API Call (25ms)
└─ Span 7: Notification Service - Send Email (10ms)
```

Cada span tiene:

- **Trace ID**: Identifica el trace completo
- **Span ID**: Identifica este span específico
- **Parent Span ID**: ID del span padre
- **Start time** y **duration**
- **Tags**: Metadata (service, operation, http.status)
- **Logs**: Events dentro del span

---

## 🛠️ Stack: Jaeger + OpenTelemetry

### Architecture

```
┌──────────────┐
│  Application │
│  (OTel SDK)  │  ← Instrumentación
└──────┬───────┘
       │ Export spans (gRPC/HTTP)
       │
┌──────▼────────────┐
│  Jaeger Collector │  ← Recibe spans
└──────┬────────────┘
       │ Store
       │
┌──────▼────────┐
│  Cassandra    │  ← Almacenamiento
│  (or ES)      │
└───────────────┘
       │
┌──────▼────────┐
│  Jaeger Query │  ← API de consulta
└──────┬────────┘
       │
┌──────▼────────┐
│  Jaeger UI    │  ← Visualización
└───────────────┘
```

---

## 🔧 OpenTelemetry Instrumentation (Node.js)

### 1. Install Dependencies

```bash
npm install --save \
  @opentelemetry/api \
  @opentelemetry/sdk-node \
  @opentelemetry/auto-instrumentations-node \
  @opentelemetry/exporter-jaeger
```

---

### 2. Initialize Tracer

**File**: `src/tracing.ts`

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

const jaegerExporter = new JaegerExporter({
  endpoint:
    process.env.JAEGER_ENDPOINT || 'http://jaeger-collector:14268/api/traces',
});

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'order-service',
    [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]:
      process.env.NODE_ENV || 'development',
  }),
  traceExporter: jaegerExporter,
  instrumentations: [
    getNodeAutoInstrumentations({
      // Auto-instrument HTTP, Express, PostgreSQL, Redis, etc.
      '@opentelemetry/instrumentation-http': { enabled: true },
      '@opentelemetry/instrumentation-express': { enabled: true },
      '@opentelemetry/instrumentation-pg': { enabled: true },
      '@opentelemetry/instrumentation-redis': { enabled: true },
      '@opentelemetry/instrumentation-mongodb': { enabled: true },
    }),
  ],
});

sdk.start();

// Graceful shutdown
process.on('SIGTERM', () => {
  sdk
    .shutdown()
    .then(() => console.log('Tracing terminated'))
    .catch((error) => console.log('Error terminating tracing', error))
    .finally(() => process.exit(0));
});

export default sdk;
```

---

### 3. Start Application with Tracing

**File**: `src/main.ts`

```typescript
// MUST be imported FIRST (before any other imports)
import './tracing';

import express from 'express';
import { trace, context, SpanStatusCode } from '@opentelemetry/api';

const app = express();
const tracer = trace.getTracer('order-service');

// Auto-instrumentation handles HTTP requests automatically
// But you can add custom spans for business logic

app.post('/orders', async (req, res) => {
  // Create custom span
  const span = tracer.startSpan('create-order');

  try {
    // Add attributes (tags)
    span.setAttribute('order.customerId', req.body.customerId);
    span.setAttribute('order.total', req.body.total);

    // Business logic (automatically traced if uses HTTP, DB, etc.)
    const order = await orderService.create(req.body);

    // Add event (log within span)
    span.addEvent('Order validated', {
      orderId: order.id,
      validationTime: 50,
    });

    // Call payment service (HTTP call auto-traced)
    const payment = await paymentClient.charge({
      orderId: order.id,
      amount: order.total,
    });

    span.addEvent('Payment charged', {
      paymentId: payment.id,
    });

    // Success
    span.setStatus({ code: SpanStatusCode.OK });
    res.json(order);
  } catch (error) {
    // Record error
    span.recordException(error);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
    });

    res.status(500).json({ error: error.message });
  } finally {
    // Always end span
    span.end();
  }
});

app.listen(3000);
```

---

### 4. Propagate Context Between Services

**Order Service → Payment Service**:

```typescript
import axios from 'axios';
import { context, propagation } from '@opentelemetry/api';

// Payment client
async function chargePayment(data: any) {
  // Get current trace context
  const activeContext = context.active();

  // Inject trace context into HTTP headers
  const headers: any = {};
  propagation.inject(activeContext, headers);

  // Call payment service with trace headers
  const response = await axios.post('http://payment-service/charge', data, {
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
  });

  return response.data;
}
```

**Payment Service** (auto extracts context):

```typescript
// OpenTelemetry auto-instrumentation extracts traceparent header
// y continúa el trace automáticamente

app.post('/charge', async (req, res) => {
  // Este span será hijo del span de order-service
  const span = tracer.startSpan('charge-payment');

  // ... payment logic

  span.end();
});
```

---

## 📦 Jaeger Deployment (Kubernetes)

### All-in-One (Dev/Staging)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: jaeger
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: jaeger
  template:
    metadata:
      labels:
        app: jaeger
    spec:
      containers:
        - name: jaeger
          image: jaegertracing/all-in-one:1.52
          env:
            - name: COLLECTOR_ZIPKIN_HOST_PORT
              value: ':9411'
            - name: SPAN_STORAGE_TYPE
              value: 'memory' # In-memory (dev only)
          ports:
            - containerPort: 5775
              protocol: UDP
            - containerPort: 6831
              protocol: UDP
            - containerPort: 6832
              protocol: UDP
            - containerPort: 5778
              protocol: TCP
            - containerPort: 16686 # UI
              protocol: TCP
            - containerPort: 14268 # Collector HTTP
              protocol: TCP
            - containerPort: 14250 # Collector gRPC
              protocol: TCP
            - containerPort: 9411
              protocol: TCP
---
apiVersion: v1
kind: Service
metadata:
  name: jaeger-collector
  namespace: monitoring
spec:
  selector:
    app: jaeger
  ports:
    - name: jaeger-collector-http
      port: 14268
      targetPort: 14268
    - name: jaeger-collector-grpc
      port: 14250
      targetPort: 14250
---
apiVersion: v1
kind: Service
metadata:
  name: jaeger-query
  namespace: monitoring
spec:
  selector:
    app: jaeger
  ports:
    - name: query-http
      port: 16686
      targetPort: 16686
  type: LoadBalancer
```

---

### Production (with Cassandra)

```yaml
# Jaeger Collector
apiVersion: apps/v1
kind: Deployment
metadata:
  name: jaeger-collector
  namespace: monitoring
spec:
  replicas: 3
  selector:
    matchLabels:
      app: jaeger-collector
  template:
    metadata:
      labels:
        app: jaeger-collector
    spec:
      containers:
        - name: jaeger-collector
          image: jaegertracing/jaeger-collector:1.52
          env:
            - name: SPAN_STORAGE_TYPE
              value: 'cassandra'
            - name: CASSANDRA_SERVERS
              value: 'cassandra:9042'
            - name: CASSANDRA_KEYSPACE
              value: 'jaeger_v1_production'
          ports:
            - containerPort: 14268
            - containerPort: 14250
          resources:
            requests:
              memory: '512Mi'
              cpu: '500m'
            limits:
              memory: '2Gi'
              cpu: '2000m'

---
# Jaeger Query
apiVersion: apps/v1
kind: Deployment
metadata:
  name: jaeger-query
  namespace: monitoring
spec:
  replicas: 2
  selector:
    matchLabels:
      app: jaeger-query
  template:
    metadata:
      labels:
        app: jaeger-query
    spec:
      containers:
        - name: jaeger-query
          image: jaegertracing/jaeger-query:1.52
          env:
            - name: SPAN_STORAGE_TYPE
              value: 'cassandra'
            - name: CASSANDRA_SERVERS
              value: 'cassandra:9042'
            - name: CASSANDRA_KEYSPACE
              value: 'jaeger_v1_production'
          ports:
            - containerPort: 16686
```

---

## 🔍 Jaeger UI Usage

### 1. Find Traces

**URL**: `http://jaeger-ui:16686`

**Search by**:

- Service: `order-service`
- Operation: `POST /orders`
- Tags: `http.status_code=500`
- Duration: `> 1s`
- Time range: Last 1 hour

---

### 2. Trace View

```
Trace ID: abc123def456
Duration: 450ms
Spans: 8
Services: 4

┌─ order-service: POST /orders (450ms) ─────────────────┐
│  ├─ validate-order (50ms)                             │
│  ├─ inventory-service: GET /check-stock (20ms) ──┐    │
│  │  └─ postgres-query (5ms)                      │    │
│  ├─ payment-service: POST /charge (380ms) ───────┐    │
│  │  ├─ validate-payment (10ms)                   │    │
│  │  └─ stripe-api: POST /payment_intents (350ms) │    │
│  └─ notification-service: POST /send (10ms)           │
└───────────────────────────────────────────────────────┘
```

**Insights**:

- Total duration: 450ms
- Bottleneck: Stripe API (350ms, 78% del tiempo)
- Optimization: Cache stripe customer, use async notification

---

### 3. Service Dependency Graph

```
                   API Gateway
                        │
            ┌───────────┼───────────┐
            │           │           │
       Order Service  IAM Service  Catalog
            │
        ┌───┼────┐
        │   │    │
    Payment │  Notification
            │
        Inventory
```

**Insights**:

- Order service tiene 4 dependencies
- Critical path: Order → Payment → Stripe
- Single point of failure: Payment service

---

## 📊 Sampling Strategy

**Problema**: 10,000 RPS × 10 spans/request = 100,000 spans/s → Storage expensive

**Solución**: Sampling (guardar solo % de traces)

### Sampling Types

#### 1. Head-Based Sampling (Decision al inicio)

**Constant sampler**: Sample N% de requests

```typescript
import {
  ParentBasedSampler,
  TraceIdRatioBasedSampler,
} from '@opentelemetry/sdk-trace-base';

const sdk = new NodeSDK({
  // Sample 10% of traces
  sampler: new ParentBasedSampler({
    root: new TraceIdRatioBasedSampler(0.1), // 10%
  }),
  // ...
});
```

---

#### 2. Tail-Based Sampling (Decision al final)

**Estrategia**: Sample 100% de errores, solo 1% de success

⚠️ Requiere external sampler (Jaeger no soporta nativamente)

---

#### 3. Adaptive Sampling

**Estrategia**: Ajustar sampling rate dinámicamente

```typescript
// High traffic → Lower sampling (1%)
// Low traffic → Higher sampling (100%)

const getSamplingRate = (requestsPerSecond: number) => {
  if (requestsPerSecond > 1000) return 0.01; // 1%
  if (requestsPerSecond > 100) return 0.1; // 10%
  return 1.0; // 100%
};
```

---

### Recommended Sampling

| Environment                   | Strategy  | Rate  |
| ----------------------------- | --------- | ----- |
| **Development**               | Always on | 100%  |
| **Staging**                   | Constant  | 100%  |
| **Production (low traffic)**  | Constant  | 10%   |
| **Production (high traffic)** | Adaptive  | 1-10% |

---

## 🔧 Advanced: Custom Spans

### Span for Database Query

```typescript
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('order-service');

async function findOrderById(id: string) {
  const span = tracer.startSpan('db.findOrderById', {
    attributes: {
      'db.system': 'postgresql',
      'db.statement': 'SELECT * FROM orders WHERE id = $1',
      'db.name': 'ecommerce',
      'order.id': id,
    },
  });

  try {
    const order = await prisma.order.findUnique({ where: { id } });
    span.setAttribute('db.rows_returned', order ? 1 : 0);
    return order;
  } finally {
    span.end();
  }
}
```

---

### Span for External API Call

```typescript
async function sendEmail(to: string, template: string) {
  const span = tracer.startSpan('sendgrid.sendEmail', {
    attributes: {
      'messaging.system': 'sendgrid',
      'messaging.destination': to,
      'email.template': template,
    },
  });

  try {
    await sendgridClient.send({ to, template });
    span.setStatus({ code: SpanStatusCode.OK });
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR });
    throw error;
  } finally {
    span.end();
  }
}
```

---

## 📈 Retention Policy

| Environment     | Retention | Storage |
| --------------- | --------- | ------- |
| **Production**  | 7 días    | 100 GB  |
| **Staging**     | 3 días    | 20 GB   |
| **Development** | 1 día     | 5 GB    |

**Por qué corto**: Traces son para debugging activo, no análisis histórico (usa metrics para eso).

---

## ✅ Tracing Checklist

### Application

- [ ] OpenTelemetry SDK installed
- [ ] Auto-instrumentation configurada (HTTP, DB, Redis)
- [ ] Custom spans para business logic
- [ ] Context propagation entre services
- [ ] Error recording en spans

### Infrastructure

- [ ] Jaeger Collector deployed
- [ ] Jaeger Query deployed
- [ ] Jaeger UI accessible
- [ ] Storage configured (Cassandra/ES)
- [ ] Retention policy configured

### Usage

- [ ] Team trained en Jaeger UI
- [ ] Sampling strategy definida
- [ ] Runbooks con trace examples
- [ ] Integration con alerting (trace on error)

---

**Versión**: 1.0  
**Última actualización**: Diciembre 2025
