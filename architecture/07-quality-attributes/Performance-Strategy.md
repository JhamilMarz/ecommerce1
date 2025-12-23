# Performance Strategy

## 📋 Propósito

Define la estrategia para cumplir con los **NFRs de performance**: P95 < 200ms (reads), P95 < 500ms (writes).

## 🎯 Performance Targets

| Operation Type       | P50     | P95     | P99     | Timeout |
| -------------------- | ------- | ------- | ------- | ------- |
| **Read** (GET)       | < 50ms  | < 200ms | < 500ms | 5s      |
| **Write** (POST/PUT) | < 100ms | < 500ms | < 1s    | 10s     |
| **Search**           | < 100ms | < 300ms | < 800ms | 5s      |
| **Batch**            | -       | -       | < 5s    | 30s     |

---

## ⚡ Optimization Techniques

### 1. Database Query Optimization

#### Indexes

**Regla**: Crear índices en campos usados en WHERE, JOIN, ORDER BY

```sql
-- ❌ Slow query (sin índice)
SELECT * FROM products WHERE category = 'electronics';
-- Seq Scan: 500ms

-- ✅ Con índice
CREATE INDEX idx_products_category ON products(category);
-- Index Scan: 5ms (100x más rápido)
```

**Índices compuestos**:

```sql
-- Query común: filtrar por category y ordenar por price
SELECT * FROM products
WHERE category = 'electronics'
ORDER BY price DESC;

-- Índice compuesto
CREATE INDEX idx_products_category_price ON products(category, price DESC);
```

---

#### Query Analysis

**EXPLAIN ANALYZE** para detectar slow queries:

```sql
EXPLAIN ANALYZE
SELECT o.*, c.name AS customer_name
FROM orders o
JOIN customers c ON o.customer_id = c.id
WHERE o.status = 'pending'
ORDER BY o.created_at DESC
LIMIT 20;

-- Output
Limit  (cost=0.42..123.45 rows=20 width=256) (actual time=0.234..1.567 rows=20 loops=1)
  ->  Nested Loop  (cost=0.42..45678.90 rows=7500 width=256)
        ->  Index Scan using idx_orders_status on orders o
              Index Cond: (status = 'pending')
        ->  Index Scan using customers_pkey on customers c
              Index Cond: (id = o.customer_id)
Planning Time: 0.123 ms
Execution Time: 1.601 ms  ✅ (< 200ms target)
```

**Red flags**:

- ❌ Seq Scan en tablas grandes
- ❌ Nested Loop sin índices
- ❌ Planning Time > 10ms

---

#### N+1 Query Problem

**❌ Problema**:

```typescript
// Fetch orders
const orders = await orderRepo.find({ status: 'pending' }); // 1 query

// Para cada orden, fetch customer (N queries)
for (const order of orders) {
  const customer = await customerRepo.findById(order.customerId); // N queries
  order.customer = customer;
}
// Total: 1 + N queries (si N=100, 101 queries!)
```

**✅ Solución 1: Join**:

```typescript
const orders = await orderRepo.find({
  where: { status: 'pending' },
  relations: ['customer'], // Prisma/TypeORM hace JOIN
});
// Total: 1 query
```

**✅ Solución 2: DataLoader** (para GraphQL):

```typescript
const customerLoader = new DataLoader(async (ids) => {
  return await customerRepo.findByIds(ids);
});

// Batch load
const orders = await orderRepo.find({ status: 'pending' });
const customers = await customerLoader.loadMany(
  orders.map((o) => o.customerId)
);
// Total: 2 queries (1 orders, 1 customers batched)
```

---

### 2. Caching

#### Cache Strategy por Endpoint

| Endpoint          | Strategy    | TTL    | Invalidation       |
| ----------------- | ----------- | ------ | ------------------ |
| GET /products     | Redis cache | 5 min  | On product update  |
| GET /products/:id | Redis cache | 5 min  | On product update  |
| GET /categories   | Redis cache | 1 hora | On category update |
| GET /orders/:id   | No cache    | -      | -                  |
| GET /cart         | Redis cache | 1 min  | On cart update     |

#### Implementation

```typescript
async function getProduct(id: string): Promise<Product> {
  // 1. Check cache
  const cached = await redis.get(`product:${id}`);
  if (cached) {
    return JSON.parse(cached);
  }

  // 2. Fetch from DB
  const product = await productRepo.findById(id);

  // 3. Store in cache
  await redis.setex(`product:${id}`, 300, JSON.stringify(product));

  return product;
}
```

#### Cache Invalidation

**Event-Driven**:

```typescript
// Al actualizar producto
await productRepo.update(id, data);

// Invalidar cache
await redis.del(`product:${id}`);

// Publicar evento para otros servicios
await rabbitMQ.publish('product.updated', { productId: id });
```

---

### 3. Asynchronous Processing

**Regla**: Operaciones lentas (> 1s) deben ser async.

#### Use Cases

✅ **Async**:

- Email sending (SendGrid API)
- PDF generation (facturas)
- Image processing (resize, compress)
- Webhook notifications
- Analytics tracking

❌ **Sync**:

- Crear orden (crítico para UX)
- Procesar payment (usuario espera)
- Login/logout

#### Implementation con RabbitMQ

```typescript
// 1. Controller: Encola tarea, retorna inmediatamente
router.post('/orders/:id/invoice', async (req, res) => {
  await rabbitMQ.publish('invoice.generate', { orderId: req.params.id });

  res.status(202).json({
    message: 'Invoice generation started',
    statusUrl: `/orders/${req.params.id}/invoice/status`,
  });
});

// 2. Worker: Procesa tarea async
rabbitMQ.subscribe('invoice.generate', async (msg) => {
  const { orderId } = msg;
  const order = await orderRepo.findById(orderId);

  // Operación lenta (2-3 segundos)
  const pdf = await pdfGenerator.generate(order);
  await s3.upload(`invoices/${orderId}.pdf`, pdf);

  await orderRepo.update(orderId, { invoiceUrl: `...` });
});
```

**Beneficio**: Request retorna en < 50ms (vs 2-3s si fuera síncrono).

---

### 4. Database Connection Pooling

**Problema**: Crear nueva conexión DB es costoso (~10ms).

**Solución**: Pool de conexiones reutilizables.

```typescript
// Prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  connection_limit = 10  // Pool size
}

// TypeORM
{
  type: 'postgres',
  host: 'localhost',
  poolSize: 10,
  extra: {
    max: 10,              // Max conexiones
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  }
}
```

**Dimensioning**:

```
Pool size = (Pods × Requests concurrentes) / Promedio requests por segundo

Ejemplo:
- 5 pods
- 20 requests concurrentes por pod
- Pool = 5 × 20 = 100 conexiones máx
```

---

### 5. HTTP Compression

**Gzip** para responses grandes:

```typescript
import compression from 'compression';

app.use(
  compression({
    level: 6, // Compresión nivel 6 (balance speed/ratio)
    threshold: 1024, // Solo comprimir si > 1KB
  })
);
```

**Resultado**:

- Response de 50KB → 5KB (10x reducción)
- Latency: +10ms (compresión) vs -100ms (menos bytes transferidos) = **Neto -90ms**

---

### 6. API Response Pagination

**❌ Bad**:

```typescript
GET / products;
// Retorna 10,000 productos (5MB response, 2s latency)
```

**✅ Good**:

```typescript
GET /products?page=1&limit=20
// Retorna 20 productos (50KB response, 50ms latency)
```

**Implementation**:

```typescript
router.get('/products', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100); // Max 100
  const offset = (page - 1) * limit;

  const [products, total] = await Promise.all([
    productRepo.find({ skip: offset, take: limit }),
    productRepo.count(),
  ]);

  res.json({
    data: products,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});
```

---

### 7. Field Selection (Sparse Fieldsets)

**Problema**: Retornar todo el objeto cuando cliente solo necesita pocos campos.

```typescript
GET /products/:id?fields=id,name,price

// Implementation
router.get('/products/:id', async (req, res) => {
  const product = await productRepo.findById(req.params.id)

  if (req.query.fields) {
    const fields = req.query.fields.split(',')
    const filtered = fields.reduce((obj, field) => {
      obj[field] = product[field]
      return obj
    }, {})
    return res.json(filtered)
  }

  res.json(product)
})
```

**Resultado**:

- Full object: 2KB
- Filtered (3 campos): 200 bytes (10x reducción)

---

### 8. Lazy Loading

**Principio**: No cargar relaciones/datos pesados hasta que sean necesarios.

```typescript
// ❌ Eager loading (siempre carga reviews, aunque no se usen)
const product = await productRepo.findOne({
  where: { id },
  relations: ['reviews', 'images', 'variants'],
});

// ✅ Lazy loading (carga solo si se necesita)
const product = await productRepo.findById(id);

// Solo si se pide
if (req.query.include === 'reviews') {
  product.reviews = await reviewRepo.find({ productId: id });
}
```

---

### 9. Database Read Replicas

**Separar reads (90%) de writes (10%)**:

```typescript
// Prisma multiple datasources
const prismaWrite = new PrismaClient({
  datasources: { db: { url: 'postgresql://primary:5432/db' } },
});

const prismaRead = new PrismaClient({
  datasources: { db: { url: 'postgresql://replica:5432/db' } },
});

// Writes van al primary
async function createOrder(data) {
  return await prismaWrite.order.create({ data });
}

// Reads van a replicas
async function getOrders() {
  return await prismaRead.order.findMany();
}
```

**Beneficio**: Reduce carga en primary DB, mejora latency de reads.

---

### 10. CDN para Assets

**CloudFront** (AWS) o **Cloudflare**:

```
User request: GET https://cdn.ecommerce.com/images/product-123.jpg
                       │
                       ▼
                  [CDN Edge]
                  Cache hit? ───Yes──> Return (5ms) ✅
                       │
                       No
                       │
                       ▼
                  [Origin: S3]
                  Fetch (100ms)
                       │
                       ▼
                  Cache + Return
```

**Resultado**: 95%+ requests servidas desde edge (< 10ms) vs 100ms desde origin.

---

## 📊 Performance Monitoring

### Application Metrics

```typescript
// Prometheus metrics
import { Histogram } from 'prom-client';

const httpDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
});

// Middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpDuration
      .labels(req.method, req.route, res.statusCode)
      .observe(duration);
  });
  next();
});
```

### Database Metrics

**pg_stat_statements** (PostgreSQL):

```sql
-- Top 10 slow queries
SELECT
  query,
  mean_exec_time,
  calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### Alerting

```yaml
# Prometheus alerts
groups:
  - name: performance
    rules:
      - alert: HighLatency
        expr: http_request_duration_seconds{quantile="0.95"} > 0.5
        for: 5m
        annotations:
          summary: 'P95 latency > 500ms'

      - alert: SlowQueries
        expr: pg_slow_queries_total > 100
        for: 10m
        annotations:
          summary: 'Too many slow queries'
```

---

## 🧪 Performance Testing

### Load Test with k6

```javascript
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  thresholds: {
    http_req_duration: ['p(95)<200'], // P95 < 200ms
    http_req_failed: ['rate<0.01'], // Error < 1%
  },
};

export default function () {
  const res = http.get('https://api.ecommerce.com/products');
  check(res, {
    'status 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });
}
```

**Run**: `k6 run --vus 100 --duration 5m perf-test.js`

---

### APM (Application Performance Monitoring)

**Tools**: New Relic, Datadog, Elastic APM

**Métricas**:

- Transaction traces (end-to-end)
- Database query performance
- External service calls latency
- Error tracking

---

## ✅ Performance Checklist

### Code Level

- [ ] N+1 queries eliminados (usar joins o DataLoader)
- [ ] Índices DB creados en columnas filtradas/ordenadas
- [ ] Queries analizadas con EXPLAIN
- [ ] Connection pooling configurado
- [ ] Caching implementado para reads frecuentes

### API Level

- [ ] Paginación implementada (max 100 items)
- [ ] Compression (gzip) habilitado
- [ ] Field selection disponible
- [ ] ETags para conditional requests
- [ ] Timeouts configurados (5s reads, 10s writes)

### Infrastructure

- [ ] CDN configurado para assets
- [ ] Read replicas para DB
- [ ] Redis para caching
- [ ] Load balancing configurado

### Monitoring

- [ ] Prometheus metrics expuestos
- [ ] APM tool integrado
- [ ] Alertas configuradas (P95 > 500ms)
- [ ] Load tests ejecutados regularmente

---

**Versión**: 1.0  
**Última actualización**: Diciembre 2025
