# Domain Model

## 📋 Propósito

Define el **modelo de dominio** siguiendo Domain-Driven Design: Entidades, Value Objects, Aggregates, Domain Events por cada Bounded Context.

## 🎯 Contenido

- Entidades (identidad, lifecycle)
- Value Objects (inmutables, sin identidad)
- Aggregates (consistency boundaries)
- Domain Events
- Repositories

---

## 🛒 IAM Context - Domain Model

### Entidades

#### User (Aggregate Root)

```typescript
class User {
  id: UserId; // Value Object
  email: Email; // Value Object
  passwordHash: string;
  role: Role; // Enum: Customer, Seller, Admin
  status: UserStatus; // Enum: Active, Suspended, Deleted
  createdAt: Date;
  updatedAt: Date;

  // Business logic
  authenticate(password: string): boolean;
  changePassword(oldPassword: string, newPassword: string): void;
  suspend(): void;
  activate(): void;
}
```

### Value Objects

- **UserId**: UUID
- **Email**: Validado con regex
- **Password**: Hash bcrypt, validación de política

### Domain Events

- `UserRegistered`
- `UserAuthenticated`
- `PasswordChanged`
- `UserSuspended`

---

## 📦 Catalog Context - Domain Model

### Entidades

#### Product (Aggregate Root)

```typescript
class Product {
  id: ProductId;
  sellerId: SellerId;
  name: ProductName; // Value Object
  description: string;
  price: Money; // Value Object
  category: Category;
  sku: SKU; // Value Object
  images: ProductImage[]; // Value Object
  attributes: Map<string, string>;
  status: ProductStatus; // Draft, Published, Archived
  createdAt: Date;

  publish(): void;
  archive(): void;
  updatePrice(newPrice: Money): void;
  addImage(image: ProductImage): void;
}
```

### Value Objects

- **Money**: `{ amount: number, currency: string }`
- **SKU**: Identificador único, inmutable
- **ProductImage**: `{ url: string, alt: string, order: number }`

### Domain Events

- `ProductCreated`
- `ProductPublished`
- `PriceChanged`

---

## 🔢 Inventory Context - Domain Model

### Entidades

#### InventoryItem (Aggregate Root)

```typescript
class InventoryItem {
  sku: SKU;
  warehouseId: WarehouseId;
  quantityAvailable: number;
  quantityReserved: number;
  lowStockThreshold: number;

  reserve(quantity: number, orderId: OrderId): StockReservation;
  release(reservation: StockReservation): void;
  allocate(reservation: StockReservation): void;
  replenish(quantity: number): void;
  isLowStock(): boolean;
}
```

### Domain Events

- `StockReserved`
- `StockReleased`
- `StockAllocated`
- `LowStockReached`

---

## 🛍️ Order Context - Domain Model

### Entidades

#### Order (Aggregate Root)

```typescript
class Order {
  id: OrderId;
  customerId: CustomerId;
  lines: OrderLine[]; // Entity
  totalAmount: Money;
  status: OrderStatus; // Pending, Confirmed, Shipped, Delivered, Cancelled
  shippingAddress: Address; // Value Object
  paymentId: PaymentId;
  createdAt: Date;

  addLine(productId: ProductId, quantity: number, price: Money): void;
  removeLine(lineId: OrderLineId): void;
  confirm(): void;
  ship(trackingNumber: TrackingNumber): void;
  cancel(): void;
  calculateTotal(): Money;
}
```

#### OrderLine (Entity dentro del Aggregate)

```typescript
class OrderLine {
  id: OrderLineId;
  productId: ProductId;
  productName: string; // Snapshot del nombre
  quantity: number;
  unitPrice: Money;
  subtotal: Money;
}
```

### Domain Events

- `OrderPlaced`
- `OrderConfirmed`
- `OrderShipped`
- `OrderCancelled`

---

## 💳 Payment Context - Domain Model

### Entidades

#### Payment (Aggregate Root)

```typescript
class Payment {
  id: PaymentId;
  orderId: OrderId;
  amount: Money;
  method: PaymentMethod; // CreditCard, PayPal, etc.
  status: PaymentStatus; // Pending, Completed, Failed, Refunded
  gatewayTransactionId: string;
  createdAt: Date;

  authorize(): void;
  capture(): void;
  fail(reason: string): void;
  refund(amount: Money): Refund;
}
```

### Domain Events

- `PaymentInitiated`
- `PaymentCompleted`
- `PaymentFailed`
- `RefundIssued`

---

## 🚚 Shipping Context - Domain Model

### Entidades

#### Shipment (Aggregate Root)

```typescript
class Shipment {
  id: ShipmentId;
  orderId: OrderId;
  carrier: Carrier; // FedEx, UPS, DHL
  trackingNumber: TrackingNumber;
  status: ShipmentStatus; // Processing, Shipped, InTransit, Delivered
  estimatedDelivery: Date;
  actualDelivery: Date | null;
  trackingEvents: TrackingEvent[];

  ship(): void;
  updateTracking(event: TrackingEvent): void;
  markAsDelivered(): void;
}
```

### Domain Events

- `ShipmentCreated`
- `ShipmentShipped`
- `ShipmentDelivered`

---

## 📋 Reglas de Diseño DDD

### Aggregates Design Rules

1. **Small aggregates**: Preferir aggregates pequeños (1-2 entidades)
2. **Reference by ID**: Aggregates se referencian por ID, no por objeto completo
3. **Consistency boundary**: Transacciones ACID solo dentro del aggregate
4. **Eventual consistency**: Entre aggregates, usar eventos

### Repositories

Cada Aggregate Root tiene un Repository:

```typescript
interface IOrderRepository {
  findById(id: OrderId): Promise<Order | null>;
  save(order: Order): Promise<void>;
  delete(order: Order): Promise<void>;
}
```

### Domain Services

Para lógica que no pertenece a una entidad específica:

```typescript
class PricingService {
  calculateDiscount(order: Order, coupon: Coupon): Money;
}
```

---

**Versión**: 1.0  
**Última actualización**: Diciembre 2025  
**Referencias**: [Bounded-Context-Map.md](../../02-context/Bounded-Context-Map.md), [Ubiquitous-Language-Glossary.md](Ubiquitous-Language-Glossary.md)
