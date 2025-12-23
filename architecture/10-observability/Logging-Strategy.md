# Logging Strategy

## 📋 Propósito

Define la estrategia de **logging centralizado** usando Loki para agregación y Grafana para visualización.

## 🎯 Logging Goals

✅ **Centralized**: Todos los logs en un solo lugar  
✅ **Structured**: JSON format, queryable  
✅ **Contextual**: Correlation IDs para tracing  
✅ **Retained**: 30 días production, 7 días staging  
✅ **Searchable**: Query rápido por service, level, time

---

## 📊 Logging Stack

### Architecture

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  Service 1  │  │  Service 2  │  │  Service 3  │
│  (stdout)   │  │  (stdout)   │  │  (stdout)   │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                │                │
       └────────────────┼────────────────┘
                        │
                ┌───────▼────────┐
                │  Promtail      │  (Log collector)
                │  (DaemonSet)   │
                └───────┬────────┘
                        │
                ┌───────▼────────┐
                │     Loki       │  (Log aggregation)
                │  (StatefulSet) │
                └───────┬────────┘
                        │
                ┌───────▼────────┐
                │    Grafana     │  (Visualization)
                └────────────────┘
```

---

## 🛠️ Implementation

### 1. Application Logging (Node.js)

**Library**: Pino (high-performance JSON logger)

```typescript
import pino from 'pino';

// Logger configuration
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
  },
  base: {
    service: 'order-service',
    environment: process.env.NODE_ENV,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  // Pretty print in development
  transport:
    process.env.NODE_ENV === 'development'
      ? { target: 'pino-pretty' }
      : undefined,
});

export default logger;
```

**Usage**:

```typescript
import logger from './logger';

// Info log
logger.info({ orderId: '123', amount: 150.0 }, 'Order created');

// Error log with stack trace
try {
  await processPayment(order);
} catch (error) {
  logger.error({ err: error, orderId: order.id }, 'Payment processing failed');
}

// With correlation ID
logger
  .child({ correlationId: req.headers['x-correlation-id'] })
  .info('Processing request');
```

**Output** (JSON):

```json
{
  "level": "INFO",
  "time": "2025-12-21T10:30:00.000Z",
  "service": "order-service",
  "environment": "production",
  "correlationId": "abc-123-def-456",
  "orderId": "123",
  "amount": 150.0,
  "msg": "Order created"
}
```

---

### 2. HTTP Request Logging (Middleware)

```typescript
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import logger from './logger';

export function requestLoggingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Generate correlation ID if not present
  const correlationId = (req.headers['x-correlation-id'] as string) || uuidv4();
  req.correlationId = correlationId;

  // Attach correlation ID to response header
  res.setHeader('X-Correlation-ID', correlationId);

  // Create child logger with correlation ID
  req.logger = logger.child({ correlationId });

  const start = Date.now();

  // Log request
  req.logger.info(
    {
      method: req.method,
      path: req.path,
      query: req.query,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    },
    'Incoming request'
  );

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - start;

    req.logger.info(
      {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        contentLength: res.get('Content-Length'),
      },
      'Request completed'
    );
  });

  next();
}
```

---

### 3. Error Logging (Error Handler)

```typescript
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Log error with full context
  req.logger.error(
    {
      err: {
        message: err.message,
        stack: err.stack,
        name: err.name,
      },
      method: req.method,
      path: req.path,
      body: req.body,
      params: req.params,
      userId: req.user?.id,
    },
    'Unhandled error'
  );

  // Send response
  res.status(500).json({
    error: 'Internal Server Error',
    correlationId: req.correlationId,
  });
}
```

---

## 🔍 Log Levels

| Level     | Usage            | Ejemplo                            |
| --------- | ---------------- | ---------------------------------- |
| **FATAL** | System crash     | Database unreachable               |
| **ERROR** | Request failed   | Payment declined, validation error |
| **WARN**  | Degraded mode    | External API slow, cache miss      |
| **INFO**  | Normal operation | Order created, user logged in      |
| **DEBUG** | Detailed info    | SQL queries, variable values       |
| **TRACE** | Very detailed    | Function entry/exit                |

**Production**: INFO y superior (no DEBUG/TRACE)  
**Staging**: DEBUG y superior  
**Development**: TRACE (todo)

---

## 📦 Promtail (Log Collection)

**DaemonSet** en K8s (1 pod por node):

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: promtail
  namespace: logging
spec:
  selector:
    matchLabels:
      app: promtail
  template:
    metadata:
      labels:
        app: promtail
    spec:
      serviceAccountName: promtail
      containers:
        - name: promtail
          image: grafana/promtail:2.9.3
          args:
            - -config.file=/etc/promtail/config.yml
          volumeMounts:
            - name: config
              mountPath: /etc/promtail
            - name: varlog
              mountPath: /var/log
            - name: varlibdockercontainers
              mountPath: /var/lib/docker/containers
              readOnly: true
      volumes:
        - name: config
          configMap:
            name: promtail-config
        - name: varlog
          hostPath:
            path: /var/log
        - name: varlibdockercontainers
          hostPath:
            path: /var/lib/docker/containers
```

**Promtail Config**:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: promtail-config
  namespace: logging
data:
  config.yml: |
    server:
      http_listen_port: 3100

    clients:
      - url: http://loki:3100/loki/api/v1/push

    positions:
      filename: /tmp/positions.yaml

    scrape_configs:
      # Kubernetes pod logs
      - job_name: kubernetes-pods
        kubernetes_sd_configs:
          - role: pod
        relabel_configs:
          # Add namespace
          - source_labels: [__meta_kubernetes_pod_namespace]
            target_label: namespace
          
          # Add pod name
          - source_labels: [__meta_kubernetes_pod_name]
            target_label: pod
          
          # Add container name
          - source_labels: [__meta_kubernetes_pod_container_name]
            target_label: container
          
          # Add service label
          - source_labels: [__meta_kubernetes_pod_label_app]
            target_label: service
          
          # Add environment
          - source_labels: [__meta_kubernetes_namespace]
            regex: (.*)-(.*)
            target_label: environment
            replacement: $2
```

---

## 🗄️ Loki (Log Aggregation)

**StatefulSet** deployment:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: loki
  namespace: logging
spec:
  serviceName: loki
  replicas: 1
  selector:
    matchLabels:
      app: loki
  template:
    metadata:
      labels:
        app: loki
    spec:
      containers:
        - name: loki
          image: grafana/loki:2.9.3
          args:
            - -config.file=/etc/loki/config.yaml
          ports:
            - containerPort: 3100
              name: http
          volumeMounts:
            - name: config
              mountPath: /etc/loki
            - name: storage
              mountPath: /loki
          resources:
            requests:
              memory: '512Mi'
              cpu: '250m'
            limits:
              memory: '2Gi'
              cpu: '1000m'
      volumes:
        - name: config
          configMap:
            name: loki-config
  volumeClaimTemplates:
    - metadata:
        name: storage
      spec:
        accessModes: ['ReadWriteOnce']
        storageClassName: gp3
        resources:
          requests:
            storage: 100Gi
```

**Loki Config**:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: loki-config
  namespace: logging
data:
  config.yaml: |
    auth_enabled: false

    server:
      http_listen_port: 3100

    ingester:
      lifecycler:
        ring:
          kvstore:
            store: inmemory
          replication_factor: 1
      chunk_idle_period: 5m
      chunk_retain_period: 30s

    schema_config:
      configs:
        - from: 2023-01-01
          store: boltdb-shipper
          object_store: filesystem
          schema: v11
          index:
            prefix: index_
            period: 24h

    storage_config:
      boltdb_shipper:
        active_index_directory: /loki/index
        cache_location: /loki/cache
        shared_store: filesystem
      filesystem:
        directory: /loki/chunks

    limits_config:
      enforce_metric_name: false
      reject_old_samples: true
      reject_old_samples_max_age: 168h  # 7 days
      max_entries_limit_per_query: 10000

    chunk_store_config:
      max_look_back_period: 720h  # 30 days retention

    table_manager:
      retention_deletes_enabled: true
      retention_period: 720h  # 30 days
```

---

## 📊 Grafana Queries (LogQL)

### Query Examples

**1. All logs from order-service**:

```logql
{service="order-service"}
```

**2. Error logs only**:

```logql
{service="order-service"} |= "ERROR"
```

**3. Logs for specific order**:

```logql
{service="order-service"} | json | orderId="123"
```

**4. Payment failures in last hour**:

```logql
{service="payment-service"}
  |= "Payment processing failed"
  | json
  | __timestamp__ > now() - 1h
```

**5. Rate of errors (per minute)**:

```logql
rate({service="order-service"} |= "ERROR" [1m])
```

**6. Top 10 error messages**:

```logql
topk(10,
  count_over_time({level="ERROR"} [24h]) by (msg)
)
```

**7. Correlation ID tracing**:

```logql
{correlationId="abc-123-def-456"}
```

---

## 🔔 Alerting on Logs

**Prometheus Alertmanager** integration:

```yaml
# Loki ruler config
ruler:
  alertmanager_url: http://alertmanager:9093
  enable_api: true
  rule_path: /tmp/loki/rules

# Alert rules
groups:
  - name: error_rate
    interval: 1m
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: |
          rate({service=~".*"} |= "ERROR" [5m]) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: 'High error rate detected'
          description: '{{ $labels.service }} has error rate > 1/s'

      # Payment failures
      - alert: PaymentFailures
        expr: |
          count_over_time({service="payment-service"} |= "Payment processing failed" [5m]) > 10
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: 'Multiple payment failures'
```

---

## 📈 Log Aggregation Patterns

### Pattern 1: Correlation ID

**Propósito**: Trackear request a través de múltiples services

```typescript
// API Gateway genera correlation ID
const correlationId = uuidv4();
req.headers['x-correlation-id'] = correlationId;

// Cada microservicio lo propaga
logger.child({ correlationId }).info('Processing order');

// Query en Grafana
{
  correlationId = 'abc-123';
}
// Muestra logs de IAM → Order → Payment → Shipping
```

---

### Pattern 2: Structured Logging

**Propósito**: Queryable fields

```typescript
// ❌ No structured
logger.info(`Order ${orderId} created with amount ${amount}`)

// ✅ Structured
logger.info({ orderId, amount, customerId }, 'Order created')

// Query
{service="order-service"} | json | orderId="123"
```

---

### Pattern 3: Contextual Logging

```typescript
// Agregar context a logger
const orderLogger = logger.child({
  orderId: order.id,
  customerId: order.customerId,
});

orderLogger.info('Validating order');
orderLogger.info('Charging payment');
orderLogger.info('Order completed');

// Todos los logs tendrán orderId y customerId
```

---

## 📊 Retention Policy

| Environment     | Retention | Storage |
| --------------- | --------- | ------- |
| **Production**  | 30 días   | 100 GB  |
| **Staging**     | 7 días    | 20 GB   |
| **Development** | 1 día     | 5 GB    |

**Archive** (opcional, Fase 3): Logs antiguos → S3 (cheaper storage)

---

## 🔐 Security & Compliance

### PII Masking

**No loggear**:
❌ Passwords  
❌ Credit card numbers  
❌ SSN  
❌ API keys

**Másking middleware**:

```typescript
function maskSensitiveData(obj: any) {
  if (obj.password) obj.password = '***';
  if (obj.creditCard)
    obj.creditCard = obj.creditCard.slice(-4).padStart(16, '*');
  return obj;
}

logger.info(
  maskSensitiveData({
    email: 'user@example.com',
    password: 'secret123',
    creditCard: '4242424242424242',
  })
);

// Output: { email: "user@example.com", password: "***", creditCard: "************4242" }
```

---

## ✅ Logging Checklist

### Application

- [ ] Pino logger configurado
- [ ] Correlation ID middleware implementado
- [ ] Error handler con logging
- [ ] Structured logging (JSON)
- [ ] PII masking implementado

### Infrastructure

- [ ] Promtail DaemonSet deployeado
- [ ] Loki StatefulSet deployeado
- [ ] Grafana con Loki datasource
- [ ] Retention policy configurada
- [ ] Alertas configuradas (high error rate)

### Operations

- [ ] Log queries documentadas
- [ ] Dashboards creados (errors, latency)
- [ ] Runbooks con query examples
- [ ] Log rotation configurado

---

**Versión**: 1.0  
**Última actualización**: Diciembre 2025
