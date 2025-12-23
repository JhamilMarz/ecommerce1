# ADR-002: Database per Service Pattern

**Status**: Accepted  
**Date**: 2025-12-21  
**Decision Makers**: Architecture Team  
**Consulted**: Database Team, Platform Team

---

## Context

En una arquitectura de microservicios, necesitamos decidir cómo cada servicio accede y gestiona sus datos. Las opciones principales son:

1. **Shared Database**: Todos los servicios comparten una única base de datos
2. **Database per Service**: Cada servicio tiene su propia base de datos

### Current Situation

Tenemos 8 microservicios planificados (IAM, Catalog, Inventory, Order, Payment, Shipping, Notification, Customer), cada uno con diferentes necesidades de datos y patrones de acceso.

---

## Decision

**Adoptamos el patrón "Database per Service"**: Cada microservicio tendrá su propia base de datos, con ownership completo sobre su schema y datos.

### Implementation Details

**Data Ownership**:

- **IAM Service** → PostgreSQL (users, roles, permissions)
- **Catalog Service** → MongoDB (products, categories, flexible schema)
- **Order Service** → PostgreSQL (orders, order_items, transaccional)
- **Payment Service** → PostgreSQL (payments, transactions, compliance)
- **Inventory Service** → PostgreSQL (stock levels, reservations)
- **Shipping Service** → PostgreSQL (shipments, tracking)
- **Customer Service** → PostgreSQL (customer profiles, addresses)
- **Notification Service** → PostgreSQL (notification logs, templates)

**No Shared Tables**: Servicios NO pueden acceder directamente a tablas de otros servicios.

**Data Synchronization**: Usar eventos (RabbitMQ) para mantener denormalized data cuando necesario.

---

## Rationale

### Why Database per Service?

#### 1. **Service Autonomy**

- Cada equipo puede elegir la tecnología de DB más apropiada
- Catalog usa MongoDB (schema flexible para productos)
- Order usa PostgreSQL (ACID transactions críticas)
- Independencia de deployments: cambiar schema de Order no afecta a Payment

#### 2. **Loose Coupling**

- No hay coupling a nivel de base de datos
- Cambios en schema de un servicio no rompen otros servicios
- Interfaces claras via APIs y eventos

#### 3. **Scalability**

- Escalar databases independientemente según carga
- Catalog (read-heavy) → MongoDB con read replicas
- Order (write-heavy) → PostgreSQL optimizado para writes
- Payment (compliance) → separate DB con encryption at rest

#### 4. **Fault Isolation**

- Si DB de Catalog falla, Order sigue funcionando
- Problemas de performance en una DB no afectan otras

#### 5. **Technology Flexibility**

- Usar la mejor herramienta para cada caso
- Document store para catálogo (MongoDB)
- Relational para transacciones (PostgreSQL)
- Posibilidad de migrar a otras DBs sin impacto global

---

## Consequences

### Positive

✅ **Autonomía de equipos**: Cada team decide schema, indexes, migrations  
✅ **Mejor aislamiento de fallos**: DB failure es localizado  
✅ **Scaling granular**: Escalar solo las DBs que lo necesitan  
✅ **Technology matching**: Usar DB óptima para cada use case  
✅ **Independent deployments**: Schema changes no requieren coordinación

### Negative

❌ **Data consistency challenges**: No ACID transactions cross-service  
❌ **Data duplication**: Customer name puede estar en Order y Shipping  
❌ **Complex queries**: No JOINs cross-service, usar API composition  
❌ **Increased complexity**: Gestionar múltiples databases  
❌ **Higher operational cost**: Más DBs que mantener, backup, monitor

---

## Mitigations

### 1. Eventual Consistency

**Problema**: No hay transactions cross-DB.

**Solución**: Saga pattern para operaciones distribuidas.

```typescript
// Crear orden (multi-step saga)
async function createOrder(orderData) {
  // 1. Reserve inventory
  const reservation = await inventoryService.reserve(orderData.items);

  try {
    // 2. Charge payment
    const payment = await paymentService.charge(orderData.total);

    try {
      // 3. Create order
      const order = await orderRepo.save(orderData);

      // 4. Publish event
      await eventBus.publish('order.created', order);

      return order;
    } catch (error) {
      // Rollback payment
      await paymentService.refund(payment.id);
      throw error;
    }
  } catch (error) {
    // Rollback inventory
    await inventoryService.release(reservation.id);
    throw error;
  }
}
```

---

### 2. Event-Driven Data Synchronization

**Problema**: Customer name está en Customer DB, pero Order necesita mostrarlo.

**Solución**: Event sourcing + denormalization.

```typescript
// Customer Service publica evento
await eventBus.publish('customer.updated', {
  customerId: '123',
  name: 'John Doe',
  email: 'john@example.com',
});

// Order Service escucha y actualiza denormalized data
eventBus.subscribe('customer.updated', async (event) => {
  await orderRepo.updateCustomerInfo(event.customerId, {
    customerName: event.name,
    customerEmail: event.email,
  });
});
```

**Trade-off**: Data puede estar temporalmente desincronizado (eventual consistency).

---

### 3. API Composition para Queries

**Problema**: No podemos hacer JOIN entre Order y Customer.

**Solución**: API Gateway hace composición.

```typescript
// API Gateway endpoint: GET /orders/:id/full
async function getOrderWithDetails(orderId: string) {
  // Parallel fetch
  const [order, customer, shipping] = await Promise.all([
    orderService.getOrder(orderId),
    customerService.getCustomer(order.customerId),
    shippingService.getShipment(orderId),
  ]);

  return {
    ...order,
    customer: {
      name: customer.name,
      email: customer.email,
    },
    shipping: shipping,
  };
}
```

---

### 4. Reference Data via IDs

**Principio**: Solo guardar IDs, no copiar toda la data.

```sql
-- Order table
CREATE TABLE orders (
  id UUID PRIMARY KEY,
  customer_id UUID NOT NULL,  -- Reference, no foreign key
  customer_name VARCHAR(255),  -- Denormalized for display
  total DECIMAL(10,2),
  created_at TIMESTAMP
);
```

**No foreign keys** entre databases (no sería posible enforcement).

---

### 5. Shared Reference Data (Exception)

**Problema**: Algunos datos son realmente "global" (e.g., country codes, currencies).

**Solución**: Replicar reference data en cada DB o usar cache compartido (Redis).

```typescript
// Cache compartido para reference data
const countryCodes = await redis.get('reference:countries');
```

---

## Operational Considerations

### Database Management

**Backups**:

```bash
# Cada DB tiene su propio backup schedule
pg_dump order_db > order_backup.sql
mongodump --db catalog_db --out catalog_backup/
```

**Monitoring**:

```yaml
# Prometheus exporters por DB
- postgres_exporter (para todos los PostgreSQL)
- mongodb_exporter (para Catalog)
```

**Migrations**:

```bash
# Cada servicio gestiona sus propias migrations
cd order-service && npm run db:migrate
cd catalog-service && npm run db:migrate
```

---

### Cost Estimation

**8 microservices × 1 DB each**:

| DB           | Type           | Instance     | Cost/month |
| ------------ | -------------- | ------------ | ---------- |
| IAM          | PostgreSQL RDS | db.t3.small  | $30        |
| Catalog      | MongoDB Atlas  | M10          | $60        |
| Order        | PostgreSQL RDS | db.t3.medium | $60        |
| Payment      | PostgreSQL RDS | db.t3.medium | $60        |
| Inventory    | PostgreSQL RDS | db.t3.small  | $30        |
| Shipping     | PostgreSQL RDS | db.t3.small  | $30        |
| Customer     | PostgreSQL RDS | db.t3.small  | $30        |
| Notification | PostgreSQL RDS | db.t3.small  | $30        |

**Total**: ~$330/month (vs $100/month para shared DB)

**Trade-off**: 3.3x costo, pero mayor autonomía y scalability.

---

## Alternatives Considered

### Alternative 1: Shared Database

**Pros**:

- Simple (una sola DB que mantener)
- ACID transactions cross-service
- JOINs fáciles
- Lower cost

**Cons**:

- ❌ Tight coupling (schema changes afectan múltiples services)
- ❌ Single point of failure
- ❌ No technology flexibility
- ❌ Schema conflicts (múltiples equipos modificando mismo schema)
- ❌ Scaling all-or-nothing

**Decision**: Rechazado - Va en contra de principios de microservicios.

---

### Alternative 2: Shared Database with Schema per Service

**Pros**:

- Logical separation (schema `order`, `payment`, etc.)
- Una sola DB instance que gestionar
- JOINs posibles si necesario

**Cons**:

- ❌ Aún hay coupling (todos deben usar mismo tipo de DB)
- ❌ Single point of failure persiste
- ❌ No technology flexibility
- ❌ Scaling difícil (no puedes escalar solo un schema)

**Decision**: Rechazado - Compromiso débil que mantiene problemas principales.

---

### Alternative 3: Hybrid (Shared para algunos, Separado para otros)

**Ejemplo**:

- Services críticos (Order, Payment) → Own DB
- Services simples (Notification) → Shared DB

**Pros**:

- Balance entre autonomía y costo
- Críticos tienen isolation

**Cons**:

- ❌ Inconsistencia arquitectural
- ❌ Confusión sobre cuándo usar shared vs own
- ❌ Aún requiere gestionar data consistency

**Decision**: Rechazado - Preferimos consistencia arquitectural.

---

## Implementation Plan

### Phase 1: MVP (Meses 0-3)

**Shared development DB** (para rapidez):

- Un PostgreSQL con schemas separados
- MongoDB para Catalog (único con schema flexible)

**Rationale**: En MVP, velocidad > autonomía perfecta.

---

### Phase 2: Production Launch (Mes 4-6)

**Migrate to separate DBs**:

- Crear RDS instances separadas
- Migrar data de shared a dedicated DBs
- Configurar backups, monitoring por DB

---

### Phase 3: Scale (Mes 6+)

**Optimize per service**:

- Order DB → Agregar read replicas
- Catalog DB → Shard por category
- Payment DB → Enhanced backup/encryption

---

## Success Metrics

**Autonomy**:

- ✅ Teams pueden deploy schema changes sin coordinación

**Isolation**:

- ✅ DB failure en un servicio no afecta otros (99%+ availability maintained)

**Scalability**:

- ✅ Podemos escalar Order DB sin tocar Catalog DB

**Performance**:

- ✅ No contention de DB resources entre services
- ✅ P95 query latency < 50ms per service

---

## References

- [Microservices Patterns - Chris Richardson](https://microservices.io/patterns/data/database-per-service.html)
- [Building Microservices - Sam Newman](https://www.oreilly.com/library/view/building-microservices-2nd/9781492034018/)
- [Distributed Data Management for Microservices](https://docs.microsoft.com/en-us/azure/architecture/patterns/cqrs)

---

## Review Schedule

**Next review**: Q2 2026 (después de 6 meses en producción)

**Questions to answer**:

- ¿Data consistency issues frecuentes?
- ¿Operational overhead manejable?
- ¿Cost justificado por beneficios?
- ¿Necesitamos CQRS para queries complejas?

---

**Última actualización**: Diciembre 2025
