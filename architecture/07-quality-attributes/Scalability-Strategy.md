# Scalability Strategy

## 📋 Propósito

Define la estrategia para escalar el sistema desde **100 RPS (MVP)** hasta **10,000 RPS (Fase 3)**.

## 🎯 Scalability Requirements

### Current State (MVP)

- **Target**: 100 requests/second
- **Users concurrentes**: ~500
- **Database**: Single instance PostgreSQL + MongoDB

### Target State (36 meses)

- **Target**: 10,000 requests/second (100x)
- **Users concurrentes**: ~50,000
- **Database**: Multi-region, read replicas, sharding

---

## 🏗️ Scaling Dimensions

### 1. Horizontal Scaling (Preferred)

**Principio**: Agregar más instancias del servicio

✅ **Ventajas**:

- Sin límite teórico
- Fault tolerance (una instancia cae, otras siguen)
- Cost-effective (escalar solo lo necesario)

**Cómo**: Kubernetes HorizontalPodAutoscaler (HPA)

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: order-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: order-service
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

**Resultado**: Cuando CPU > 70%, K8s agrega pods automáticamente.

---

### 2. Vertical Scaling (Complementario)

**Principio**: Aumentar recursos de instancia existente

❌ **Desventajas**:

- Límite físico (máx RAM, CPU)
- Requiere restart (downtime)
- Más caro

**Cuándo usar**:

- Database primary (PostgreSQL no escala horizontal fácilmente)
- Redis master
- Background jobs pesados

**Ejemplo**:

```yaml
# Initial
resources:
  limits:
    memory: "512Mi"
    cpu: "500m"

# Scaled (Fase 2)
resources:
  limits:
    memory: "2Gi"
    cpu: "2000m"
```

---

## 📊 Scaling by Layer

### Application Layer (Stateless)

**Servicios**: IAM, Catalog, Order, Payment, etc.

**Estrategia**: Horizontal scaling con HPA

**Target metrics**:

- **Fase 1 (MVP)**: 2 réplicas mínimo (HA)
- **Fase 2 (Growth)**: 3-10 réplicas por servicio
- **Fase 3 (Scale)**: 10-50 réplicas por servicio

**Auto-scaling**:

```typescript
// Prometheus metrics
http_requests_per_second{service="order-service"} > 50
  → Scale up

cpu_utilization{service="order-service"} > 70%
  → Scale up

response_time_p95{service="order-service"} > 500ms
  → Scale up
```

---

### Data Layer

#### PostgreSQL (Transactional Data)

**Fase 1 (MVP)**: Single primary instance

```
┌─────────────┐
│  Primary    │
│  (RW)       │
└─────────────┘
```

**Fase 2 (Growth)**: Primary + Read Replicas

```
┌─────────────┐
│  Primary    │────┐
│  (Write)    │    │
└─────────────┘    │ Replication
                   │
       ┌───────────┼───────────┐
       │           │           │
┌──────▼─────┐ ┌──▼────────┐ ┌▼──────────┐
│ Replica 1  │ │ Replica 2 │ │ Replica 3 │
│ (Read)     │ │ (Read)    │ │ (Read)    │
└────────────┘ └───────────┘ └───────────┘
```

**Application changes**:

```typescript
// Writes van al primary
await primaryDB.query('INSERT INTO orders...');

// Reads van a replicas (load balanced)
await replicaDB.query('SELECT * FROM products...');
```

**Fase 3 (Scale)**: Sharding por Bounded Context

```
┌──────────────────────┐  ┌──────────────────────┐
│  Order DB Shard      │  │  Customer DB Shard   │
│  (Primary + Replicas)│  │  (Primary + Replicas)│
└──────────────────────┘  └──────────────────────┘
```

Cada microservicio tiene su propio cluster PostgreSQL.

---

#### MongoDB (Catalog)

**Fase 1**: Single node
**Fase 2**: Replica Set (3 nodes)

```yaml
rs.initiate({
  _id: "catalog-rs",
  members: [
    { _id: 0, host: "mongo-0:27017", priority: 2 },
    { _id: 1, host: "mongo-1:27017", priority: 1 },
    { _id: 2, host: "mongo-2:27017", priority: 1, arbiterOnly: true }
  ]
})
```

**Fase 3**: Sharding por category

```javascript
sh.shardCollection('catalog.products', { category: 'hashed' });
```

---

#### Redis (Cache/Sessions)

**Fase 1**: Single instance  
**Fase 2**: Redis Sentinel (HA)  
**Fase 3**: Redis Cluster (sharding)

```
┌────────────┐  ┌────────────┐  ┌────────────┐
│  Master    │  │  Replica 1 │  │  Replica 2 │
│  Shard 1   │  │  Shard 2   │  │  Shard 3   │
└────────────┘  └────────────┘  └────────────┘
     │               │               │
     └───────────────┴───────────────┘
          Hash slot distribution
```

---

### Message Queue (RabbitMQ)

**Fase 1**: Single node  
**Fase 2**: Cluster (3 nodes) + Mirrored queues  
**Fase 3**: Federated queues (multi-region)

```yaml
# RabbitMQ HA policy
rabbitmqctl set_policy ha-all "^" '{"ha-mode":"all", "ha-sync-mode":"automatic"}'
```

---

## ⚡ Caching Strategy

### L1: Application Cache (In-Memory)

```typescript
// Node.js in-memory cache
import NodeCache from 'node-cache';
const cache = new NodeCache({ stdTTL: 300 }); // 5 min

async function getProduct(id: string) {
  const cached = cache.get(`product:${id}`);
  if (cached) return cached;

  const product = await productRepo.findById(id);
  cache.set(`product:${id}`, product);
  return product;
}
```

**Trade-off**: Rápido pero no compartido entre pods.

---

### L2: Distributed Cache (Redis)

```typescript
import Redis from 'ioredis';
const redis = new Redis();

async function getProduct(id: string) {
  const cached = await redis.get(`product:${id}`);
  if (cached) return JSON.parse(cached);

  const product = await productRepo.findById(id);
  await redis.setex(`product:${id}`, 300, JSON.stringify(product));
  return product;
}
```

**Qué cachear**:
✅ Catálogo de productos (TTL: 5 min)  
✅ Categorías (TTL: 1 hora)  
✅ User sessions (TTL: 24 horas)  
❌ Órdenes (datos transaccionales)  
❌ Inventory (cambia constantemente)

---

### L3: CDN (CloudFront/Cloudflare)

Para assets estáticos y API responses públicas:

```http
GET /api/v1/products?category=electronics
Cache-Control: public, max-age=300

# Cached by CDN for 5 minutes
```

**Purge strategy**:

```typescript
// Al actualizar producto, invalida cache
await product.update(...)
await cdn.purge(`/api/v1/products/${product.id}`)
```

---

## 🔀 Load Balancing

### L4 Load Balancer (Kubernetes Service)

```yaml
apiVersion: v1
kind: Service
metadata:
  name: order-service
spec:
  type: LoadBalancer
  selector:
    app: order-service
  ports:
    - port: 80
      targetPort: 3000
```

**Algoritmo**: Round-robin (default)

---

### L7 Load Balancer (API Gateway)

Kong gateway con load balancing strategies:

```yaml
upstreams:
  - name: order-service-upstream
    algorithm: round-robin # o least-connections, consistent-hashing
    targets:
      - target: order-pod-1:3000
        weight: 100
      - target: order-pod-2:3000
        weight: 100
```

**Health checks**:

```yaml
healthchecks:
  active:
    http_path: /health
    healthy:
      interval: 5
      successes: 2
    unhealthy:
      http_failures: 3
      timeouts: 2
```

---

## 📈 Database Connection Pooling

**Problema**: Cada pod abre N conexiones a DB → Overload

**Solución**: Connection pooling + PgBouncer

```typescript
// Prisma connection pool
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  connection_limit = 10  // Max 10 conexiones por pod
}
```

**PgBouncer** (connection proxy):

```
[databases]
order_db = host=postgres-primary port=5432 dbname=orders

[pgbouncer]
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
```

**Resultado**: 100 pods × 10 conexiones = 1000 conexiones → PgBouncer las multiplexa a 25 conexiones reales al DB.

---

## 🌍 Multi-Region (Fase 3)

**Objetivo**: Reducir latency global, HA multi-región

### Architecture

```
┌──────────────────────┐       ┌──────────────────────┐
│   US-East Region     │       │   EU-West Region     │
├──────────────────────┤       ├──────────────────────┤
│  - App Services      │       │  - App Services      │
│  - PostgreSQL Primary│◄──────┤  - PostgreSQL Replica│
│  - Redis Master      │       │  - Redis Replica     │
└──────────────────────┘       └──────────────────────┘
```

**Data Replication**:

- PostgreSQL: Logical replication (primary en US, replicas en EU)
- Redis: Redis Sentinel con cross-region replication
- MongoDB: Multi-region replica set

**Routing**: GeoDNS (Route 53) → Usuario en Europa va a EU region

---

## 🧪 Load Testing

### Tools

**k6** (open source):

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100
    { duration: '2m', target: 1000 }, // Spike to 1000
    { duration: '5m', target: 1000 }, // Stay at 1000
    { duration: '2m', target: 0 }, // Ramp down
  ],
};

export default function () {
  const res = http.get('https://api.ecommerce.com/products');
  check(res, { 'status 200': (r) => r.status === 200 });
  sleep(1);
}
```

**Run**: `k6 run --vus 1000 --duration 10m load-test.js`

---

### Metrics to Monitor

```
┌────────────────────────────────────────┐
│  Load Test Results                     │
├────────────────────────────────────────┤
│  VUs:          1000                    │
│  Requests:     50,000                  │
│  Duration:     10m                     │
├────────────────────────────────────────┤
│  Req/s:        83.33                   │
│  Latency P95:  450ms    ✅ (< 500ms)   │
│  Latency P99:  800ms    ⚠️             │
│  Error Rate:   0.5%     ✅ (< 1%)      │
├────────────────────────────────────────┤
│  CPU:          65%      ✅             │
│  Memory:       70%      ✅             │
│  DB Conn:      80/100   ✅             │
└────────────────────────────────────────┘
```

---

## 📊 Capacity Planning

### Dimensioning

**Fórmula**:

```
Pods requeridos = (Target RPS / RPS per pod) × Safety factor

Safety factor = 1.5 (50% headroom para spikes)
```

**Ejemplo** (Order Service):

- Target: 1000 RPS
- RPS per pod: 50 (medido en load test)
- Pods = (1000 / 50) × 1.5 = **30 pods**

---

### Database Sizing

**PostgreSQL**:

```
Conexiones = Pods × Conexiones por pod
           = 30 × 10
           = 300 conexiones

PostgreSQL instance: db.m5.xlarge (4 vCPU, 16 GB RAM)
Max connections: 500 (con headroom)
```

**Storage**:

```
Tamaño inicial:    100 GB
Crecimiento:       10 GB/mes
Retención:         12 meses
Total (1 año):     220 GB → Provisionar 500 GB (con headroom)
```

---

## ✅ Scalability Checklist

### Application

- [ ] Servicios stateless (no session affinity)
- [ ] HPA configurado (min/max replicas)
- [ ] Health checks implementados
- [ ] Graceful shutdown implementado
- [ ] Connection pooling configurado

### Database

- [ ] Read replicas configuradas
- [ ] Connection pooling (PgBouncer)
- [ ] Índices optimizados
- [ ] Query performance monitoreado
- [ ] Backup automatizado

### Infrastructure

- [ ] Auto-scaling groups configurados
- [ ] Load balancers con health checks
- [ ] CDN configurado para assets
- [ ] Monitoring & alerting activo

### Testing

- [ ] Load tests ejecutados regularmente
- [ ] Capacity planning documentado
- [ ] Runbooks para scaling events
- [ ] Chaos engineering (opcional, Fase 3)

---

**Versión**: 1.0  
**Última actualización**: Diciembre 2025
