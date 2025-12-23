# Reliability Strategy

## 📋 Propósito

Define la estrategia para lograr **99.9% uptime** (SLO) y minimizar el impacto de fallos.

## 🎯 Reliability Goals

| Metric                                | Target      | Acceptable Downtime               |
| ------------------------------------- | ----------- | --------------------------------- |
| **Availability (SLO)**                | 99.9%       | 43.8 min/mes                      |
| **MTBF** (Mean Time Between Failures) | > 720 horas | 1 fallo cada 30 días              |
| **MTTR** (Mean Time To Recovery)      | < 15 min    | Recovery rápido                   |
| **Error Budget**                      | 0.1%        | ~44 min/mes de downtime permitido |

---

## 🛡️ Design for Failure

**Principio**: Asumir que componentes FALLARÁN. Diseñar para resilience.

### Failure Modes

| Componente                | Failure Mode             | Probabilidad | Impacto                       |
| ------------------------- | ------------------------ | ------------ | ----------------------------- |
| **Pod crash**             | OOMKilled, panic         | Alta         | Bajo (otro pod sirve traffic) |
| **Node failure**          | Hardware, kernel panic   | Media        | Medio (K8s reschedule pods)   |
| **DB failure**            | Primary down             | Baja         | Alto (writes fallan)          |
| **Network partition**     | Split brain              | Baja         | Alto (inconsistencia)         |
| **External service down** | Stripe, SendGrid offline | Media        | Medio (degraded mode)         |
| **Data center outage**    | Zona completa down       | Muy baja     | Crítico                       |

---

## 🔄 Redundancy

### 1. Pod Redundancy

**Mínimo 2 réplicas** por servicio (alta disponibilidad):

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  replicas: 3 # Mínimo 3 para tolerar 1 failure
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1 # Máx 1 pod down durante update
      maxSurge: 1 # Máx 1 pod extra durante rollout
```

**Pod Anti-Affinity** (distribuir en diferentes nodos):

```yaml
affinity:
  podAntiAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
      - labelSelector:
          matchLabels:
            app: order-service
        topologyKey: kubernetes.io/hostname
```

**Resultado**: Pods se despliegan en nodos diferentes. Si 1 nodo cae, otros siguen sirviendo.

---

### 2. Database Redundancy

#### PostgreSQL High Availability

**Setup**: Primary + Standby (hot standby)

```
┌─────────────┐
│  Primary    │
│  (RW)       │───────┐ Streaming
└─────────────┘       │ Replication
                      │
                ┌─────▼──────┐
                │  Standby   │
                │  (Readonly) │
                └────────────┘
```

**Failover**: Si primary cae, standby se promociona automáticamente.

**Implementation** (con Patroni):

```yaml
# Patroni config
scope: postgres-cluster
name: postgres-1

bootstrap:
  dcs:
    ttl: 30
    loop_wait: 10
    retry_timeout: 10
    maximum_lag_on_failover: 1048576
    postgresql:
      use_pg_rewind: true
      parameters:
        max_connections: 200
        shared_buffers: 2GB
```

**Failover time**: ~10-30 segundos (automático)

---

### 3. Message Queue Redundancy

**RabbitMQ Cluster** (3 nodos):

```
┌──────────┐  ┌──────────┐  ┌──────────┐
│  Node 1  │─┤  Node 2  │─┤  Node 3  │
│ (Master) │  │ (Mirror) │  │ (Mirror) │
└──────────┘  └──────────┘  └──────────┘
```

**Mirrored Queues**:

```bash
rabbitmqctl set_policy ha-all "^" '{"ha-mode":"all", "ha-sync-mode":"automatic"}'
```

**Resultado**: Si un nodo cae, otro toma ownership de las queues.

---

## ⚡ Circuit Breaker Pattern

**Problema**: Servicio dependiente está caído → requests se acumulan → cascading failure.

**Solución**: Circuit breaker detecta fallos y "abre el circuito" (falla rápido).

### States

```
┌──────────┐  Failures    ┌──────────┐
│  CLOSED  ├─────────────►│   OPEN   │
│ (Normal) │  > Threshold │ (Failing)│
└────┬─────┘              └─────┬────┘
     │                          │
     │ Successful               │ Timeout
     │ Request                  │ Elapsed
     │                          │
     │    ┌──────────────┐      │
     └────┤  HALF-OPEN   │◄─────┘
          │  (Testing)   │
          └──────────────┘
```

### Implementation (Node.js)

```typescript
import CircuitBreaker from 'opossum';

// Stripe payment call con circuit breaker
const options = {
  timeout: 5000, // 5s timeout
  errorThresholdPercentage: 50, // Abrir si > 50% errores
  resetTimeout: 30000, // 30s antes de intentar cerrar
};

const breaker = new CircuitBreaker(stripeClient.createPayment, options);

// Fallback cuando circuito está abierto
breaker.fallback(() => {
  return {
    status: 'PENDING',
    message: 'Payment system temporarily unavailable',
  };
});

// Events
breaker.on('open', () => {
  console.error('Circuit opened - Stripe is down');
  alerting.notify('Stripe circuit opened');
});

breaker.on('halfOpen', () => {
  console.log('Circuit half-open - testing Stripe');
});

// Usar
const result = await breaker.fire(paymentData);
```

---

## 🔁 Retry Strategy

**Principio**: Fallos transitorios (network glitch, timeout) deben retryarse.

### Exponential Backoff

```typescript
import retry from 'async-retry';

await retry(
  async (bail) => {
    try {
      return await externalAPI.call();
    } catch (error) {
      if (error.status === 400) {
        // Client error - no retry
        bail(error);
      }
      // Transient error - retry
      throw error;
    }
  },
  {
    retries: 3,
    factor: 2, // 2^n backoff
    minTimeout: 1000, // 1s inicial
    maxTimeout: 10000,
    onRetry: (error, attempt) => {
      console.log(`Retry attempt ${attempt}: ${error.message}`);
    },
  }
);
```

**Backoff times**:

- Attempt 1: Wait 1s
- Attempt 2: Wait 2s
- Attempt 3: Wait 4s
- Attempt 4: Fail

**Idempotency**: Retries solo para operaciones idempotentes (GET, PUT, DELETE). POST requiere idempotency key.

---

## ⏱️ Timeouts

**Problema**: Servicio lento bloquea threads → agota pool → cascading failure.

**Solución**: Timeouts agresivos en todos los external calls.

```typescript
// HTTP client con timeout
import axios from 'axios';

const httpClient = axios.create({
  timeout: 5000, // 5s timeout
  validateStatus: (status) => status < 500,
});

// Database query timeout
await prisma.$queryRaw`SELECT * FROM orders WHERE ...`.timeout(3000);

// Redis timeout
await redis.get('key', { timeout: 1000 });
```

**Valores recomendados**:

- External HTTP: 5s
- Database query: 3s
- Redis: 1s
- Internal service: 10s

---

## 🔒 Bulkhead Pattern

**Principio**: Aislar recursos para prevenir que un failure afecte todo el sistema.

### Thread Pools Separados

```typescript
// Pool para external calls (limitado)
const externalPool = new ThreadPool({ maxWorkers: 5 });

// Pool para internal operations (más grande)
const internalPool = new ThreadPool({ maxWorkers: 20 });

// Si external API se atasca, solo consume 5 workers
await externalPool.exec(() => stripeClient.call());

// Internal operations siguen funcionando
await internalPool.exec(() => orderService.process());
```

### Database Connection Pools Separados

```typescript
// Pool para queries críticos (garantizado)
const criticalPool = new Pool({ min: 5, max: 10 });

// Pool para queries no críticos (best effort)
const nonCriticalPool = new Pool({ min: 2, max: 5 });

// Order creation usa critical pool
await criticalPool.query('INSERT INTO orders...');

// Analytics usa non-critical pool
await nonCriticalPool.query('SELECT COUNT(*) FROM orders...');
```

---

## 🏥 Health Checks

### Liveness Probe

**Pregunta**: ¿Está el pod vivo?

```typescript
// /health/liveness
app.get('/health/liveness', (req, res) => {
  // Simple check: proceso responde
  res.status(200).json({ status: 'ok' });
});
```

**K8s config**:

```yaml
livenessProbe:
  httpGet:
    path: /health/liveness
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3 # 3 fallos → restart pod
```

---

### Readiness Probe

**Pregunta**: ¿Está el pod listo para recibir tráfico?

```typescript
// /health/readiness
app.get('/health/readiness', async (req, res) => {
  try {
    // Check DB connection
    await prisma.$queryRaw`SELECT 1`;

    // Check Redis
    await redis.ping();

    // Check RabbitMQ
    await rabbitMQ.checkConnection();

    res.status(200).json({ status: 'ready' });
  } catch (error) {
    res.status(503).json({ status: 'not ready', error: error.message });
  }
});
```

**K8s config**:

```yaml
readinessProbe:
  httpGet:
    path: /health/readiness
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 3 # 3 fallos → remove from service
```

**Diferencia**:

- **Liveness fail** → K8s **restart** pod
- **Readiness fail** → K8s **remove** pod del load balancer (no mata)

---

## 🔧 Graceful Shutdown

**Problema**: Al hacer deploy, K8s mata pods abruptamente → requests in-flight fallan.

**Solución**: Graceful shutdown.

```typescript
// Capturar SIGTERM (K8s envía esto antes de matar)
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, starting graceful shutdown');

  // 1. Stop accepting new requests
  server.close(() => {
    console.log('HTTP server closed');
  });

  // 2. Wait for in-flight requests to complete (max 30s)
  await new Promise((resolve) => {
    setTimeout(resolve, 30000);
  });

  // 3. Close DB connections
  await prisma.$disconnect();
  await redis.quit();

  // 4. Exit
  process.exit(0);
});
```

**K8s terminationGracePeriodSeconds**:

```yaml
spec:
  terminationGracePeriodSeconds: 30 # Wait 30s antes de SIGKILL
```

---

## 🚨 Alerting

### Critical Alerts (PagerDuty)

```yaml
# Prometheus alerts
groups:
  - name: critical
    rules:
      - alert: ServiceDown
        expr: up{job="order-service"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: 'Order service is down'

      - alert: DatabaseDown
        expr: pg_up == 0
        for: 30s
        labels:
          severity: critical

      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: 'Error rate > 5%'
```

---

## 📊 Monitoring

### SLI (Service Level Indicators)

```
Availability = Successful requests / Total requests × 100%

Target: 99.9%
Error budget: 0.1% = 43.8 min/month
```

**Dashboard**:

```
┌─────────────────────────────────────────┐
│  Availability (Last 30 days)            │
├─────────────────────────────────────────┤
│  Current:     99.95%   ✅               │
│  Target:      99.90%                    │
│  Error Budget Remaining: 21.9 min       │
│                                         │
│  Incidents:                             │
│  - 2025-12-15: 5 min (DB failover)      │
│  - 2025-12-01: 10 min (deploy issue)    │
└─────────────────────────────────────────┘
```

---

## 🧪 Chaos Engineering (Fase 3)

**Objetivo**: Proactivamente inyectar fallos para validar resilience.

### Chaos Monkey (Netflix)

```bash
# Aleatoriamente mata pods en production
kubectl apply -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: chaos-monkey
spec:
  containers:
  - name: chaos-monkey
    image: chaostoolkit/chaostoolkit
    command: ["chaos", "run", "kill-random-pod.yaml"]
EOF
```

### Tests

- **Kill random pod** → Sistema sigue funcionando?
- **Introduce network latency** → Timeouts funcionan?
- **Fail database primary** → Failover automático?
- **Spike traffic 10x** → Auto-scaling funciona?

---

## ✅ Reliability Checklist

### Application

- [ ] Mínimo 2 réplicas por servicio
- [ ] Health checks (liveness + readiness) implementados
- [ ] Graceful shutdown implementado
- [ ] Circuit breakers en external calls
- [ ] Retry con exponential backoff
- [ ] Timeouts en todos los external calls

### Infrastructure

- [ ] Database HA (primary + standby)
- [ ] RabbitMQ cluster (3 nodos)
- [ ] Redis Sentinel (3 nodos)
- [ ] Pod anti-affinity configurado
- [ ] PodDisruptionBudget configurado

### Monitoring

- [ ] Availability metrics trackeadas
- [ ] Error budget calculado
- [ ] Alertas críticas configuradas (PagerDuty)
- [ ] Runbooks para incidents documentados
- [ ] Post-mortem process definido

---

**Versión**: 1.0  
**Última actualización**: Diciembre 2025
