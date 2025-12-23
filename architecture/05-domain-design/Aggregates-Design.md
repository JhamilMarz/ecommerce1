# Aggregates Design

## 📋 Propósito

Define el diseño de **Aggregates** (agregados) siguiendo DDD. Los aggregates son boundaries de consistencia transaccional.

## 🎯 Principios de Diseño de Aggregates

### 1. Small Aggregates (Agregados Pequeños)

✅ **Preferir**: 1 entidad = 1 aggregate  
❌ **Evitar**: Aggregates con 10+ entidades  
**Por qué**: Mejor performance, menos contention, más escalable

### 2. Consistency Boundaries

✅ Transacciones ACID solo DENTRO del aggregate  
✅ Entre aggregates: Eventual consistency via eventos  
✅ Un aggregate = una operación de write a la vez

### 3. Reference by ID

✅ Aggregates se referencian por ID, NO por objeto completo  
❌ NO: `order.customer` (objeto Customer completo)  
✅ SÍ: `order.customerId` (solo el ID)

**Por qué**: Desacoplamiento, evita lazy loading issues, mejor performance

---

## 📦 Aggregates Diseñados

### 1. User Aggregate (IAM Context)

**Aggregate Root**: `User`  
**Entidades internas**: Ninguna (aggregate de 1 entidad)  
**Value Objects**: `Email`, `UserId`, `Role`

**Invariantes protegidas**:

- Email debe ser único en el sistema
- Password debe cumplir política de seguridad
- User activo puede autenticarse, suspendido no

**Operaciones**:

```typescript
user.authenticate(password): boolean
user.changePassword(old, new): void
user.suspend(): void
```

**Tamaño**: Pequeño ✅  
**Contention**: Baja (updates infrecuentes)

---

### 2. Product Aggregate (Catalog Context)

**Aggregate Root**: `Product`  
**Entidades internas**: Ninguna  
**Value Objects**: `Money`, `SKU`, `ProductImage[]`

**Invariantes protegidas**:

- SKU único por producto
- Precio siempre > 0
- Producto solo se puede publicar si tiene al menos 1 imagen

**Operaciones**:

```typescript
product.publish(): void
product.updatePrice(newPrice: Money): void
product.addImage(image: ProductImage): void
```

**Tamaño**: Pequeño ✅  
**Contention**: Media (sellers actualizan frecuentemente)

**Decisión**: NO incluir Inventory dentro de Product. Son aggregates separados.

---

### 3. InventoryItem Aggregate (Inventory Context)

**Aggregate Root**: `InventoryItem`  
**Entidades internas**: `StockReservation[]` (colección de reservas activas)  
**Value Objects**: `SKU`

**Invariantes protegidas**:

- quantityAvailable >= 0 (no stock negativo)
- quantityReserved = suma de reservas activas
- quantityAvailable >= quantityReserved siempre

**Operaciones**:

```typescript
item.reserve(quantity, orderId): StockReservation
item.release(reservation): void
item.allocate(reservation): void
item.replenish(quantity): void
```

**Tamaño**: Pequeño pero con colección interna ⚠️  
**Contention**: ALTA (muchas órdenes compitiendo por stock)

**Optimización**:

- Usar optimistic locking (version field)
- Retry automático en caso de conflict
- Cache agresivo de stock disponible (TTL corto)

---

### 4. Order Aggregate (Order Context)

**Aggregate Root**: `Order`  
**Entidades internas**: `OrderLine[]` (líneas del pedido)  
**Value Objects**: `Money`, `Address`, `CustomerId`, `PaymentId`

**Invariantes protegidas**:

- Order tiene al menos 1 OrderLine
- totalAmount = suma de todos los subtotals
- Order confirmada no puede modificar líneas
- Order cancelada no puede confirmarse

**Operaciones**:

```typescript
order.addLine(productId, quantity, price): void
order.removeLine(lineId): void
order.confirm(): void
order.cancel(): void
order.calculateTotal(): Money
```

**Tamaño**: Mediano (1 root + N lines) ⚠️  
**Contention**: Baja (solo owner modifica)

**Decisión**: OrderLine es entity, NO aggregate. Solo se accede via Order.

---

### 5. Payment Aggregate (Payment Context)

**Aggregate Root**: `Payment`  
**Entidades internas**: Ninguna  
**Value Objects**: `Money`, `PaymentMethod`

**Invariantes protegidas**:

- Payment completado no puede ser capturado nuevamente
- Refund no puede exceder amount original

**Operaciones**:

```typescript
payment.authorize(): void
payment.capture(): void
payment.refund(amount: Money): Refund
```

**Tamaño**: Pequeño ✅  
**Contention**: Baja

---

### 6. Shipment Aggregate (Shipping Context)

**Aggregate Root**: `Shipment`  
**Entidades internas**: `TrackingEvent[]`  
**Value Objects**: `TrackingNumber`, `Carrier`

**Invariantes protegidas**:

- Shipment solo puede marcarse delivered una vez
- TrackingEvents en orden cronológico

**Operaciones**:

```typescript
shipment.ship(): void
shipment.updateTracking(event): void
shipment.markAsDelivered(): void
```

**Tamaño**: Mediano (crece con tracking events)  
**Contention**: Baja

---

## 🔗 Relaciones Entre Aggregates

### ✅ CORRECTO: Reference by ID

```typescript
class Order {
  customerId: CustomerId; // Solo ID
  paymentId: PaymentId; // Solo ID
  lines: OrderLine[]; // Colección dentro del aggregate
}
```

### ❌ INCORRECTO: Reference por objeto completo

```typescript
class Order {
  customer: Customer; // ❌ NO - trae todo el aggregate
  payment: Payment; // ❌ NO
}
```

---

## 🔄 Consistencia Entre Aggregates

### Regla: Eventual Consistency via Domain Events

**Ejemplo: Crear Orden**

```typescript
// 1. Order Aggregate confirma orden (transacción local)
order.confirm(); // State: Confirmed
orderRepository.save(order);
eventBus.publish(new OrderConfirmed(order.id, order.customerId));

// 2. Inventory Aggregate consume evento (transacción separada)
// Event Handler
async function onOrderConfirmed(event: OrderConfirmed) {
  const order = await orderRepository.findById(event.orderId);
  for (const line of order.lines) {
    await inventoryService.allocateStock(line.productId, line.quantity);
  }
}
```

**Resultado**: Eventual consistency. Inventory se actualiza después de Order confirmada.

---

## ⚠️ Decisiones de Diseño

### ¿Cuándo incluir entidad DENTRO del aggregate?

✅ **SÍ incluir** si:

- Entidad NO tiene sentido fuera del aggregate (ej: OrderLine sin Order)
- Cambios deben ser atómicos (ej: Order + OrderLines actualizan juntos)
- Colección pequeña (< 20 elementos típicamente)

❌ **NO incluir** si:

- Entidad tiene lifecycle independiente
- Colección puede crecer sin límite
- Puede ser agregado separado

### Ejemplo: ¿Product incluye Reviews?

❌ **NO**. Reviews pueden crecer a miles. Además, tiene lifecycle independiente (se crean/editan independiente del producto).

**Solución**: Review es aggregate separado que referencia `productId`.

---

## 🧪 Testing de Aggregates

### Unit Tests de Invariantes

```typescript
test('Order cannot add line after confirmed', () => {
  const order = new Order();
  order.confirm();

  expect(() => order.addLine(productId, 1, price)).toThrow(
    new OrderAlreadyConfirmedError()
  );
});

test('InventoryItem cannot reserve more than available', () => {
  const item = new InventoryItem({ quantityAvailable: 5 });

  expect(() => item.reserve(10, orderId)).toThrow(new InsufficientStockError());
});
```

---

## 📊 Matriz de Aggregates

| Aggregate     | Root Entity   | Internal Entities  | Size   | Contention | Consistency |
| ------------- | ------------- | ------------------ | ------ | ---------- | ----------- |
| User          | User          | -                  | Small  | Low        | Strong      |
| Product       | Product       | -                  | Small  | Medium     | Strong      |
| InventoryItem | InventoryItem | StockReservation[] | Small  | HIGH       | Strong      |
| Order         | Order         | OrderLine[]        | Medium | Low        | Strong      |
| Payment       | Payment       | -                  | Small  | Low        | Strong      |
| Shipment      | Shipment      | TrackingEvent[]    | Medium | Low        | Strong      |

---

## 🔍 Red Flags (Señales de Mal Diseño)

🚨 **Aggregate demasiado grande**  
Señal: > 10 entidades internas  
Solución: Split en múltiples aggregates

🚨 **Operaciones que modifican múltiples aggregates**  
Señal: `updateOrderAndInventory()`  
Solución: Usar Saga pattern con eventos

🚨 **High contention (muchos conflicts)**  
Señal: Version conflicts frecuentes en DB  
Solución: Aggregate más granular o caching

🚨 **Lazy loading dentro de aggregate**  
Señal: N+1 queries  
Solución: Eager load todo el aggregate o reducir tamaño

---

**Versión**: 1.0  
**Última actualización**: Diciembre 2025  
**Referencias**: [Domain-Model.md](Domain-Model.md), [Bounded-Context-Map.md](../../02-context/Bounded-Context-Map.md)
