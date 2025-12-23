# Bounded Context Map (Domain-Driven Design)

## 📋 Propósito del Documento

Define los **límites de contexto (Bounded Contexts)** del sistema según Domain-Driven Design. Cada contexto representa un límite lingüístico y de modelo de dominio independiente. Es fundamental para estructurar microservicios de forma coherente.

## 🎯 Qué Debe Contener

- Bounded Contexts identificados
- Ubiquitous Language por contexto
- Relaciones entre contextos (Context Mapping)
- Patrones de integración (Shared Kernel, Customer-Supplier, etc.)
- Ownership y equipos responsables

## 🏗️ Impacto en la Arquitectura

- **Estructura de microservicios**: Cada BC → potencialmente un microservicio
- **Comunicación**: Define cómo se integran servicios
- **Ownership**: Establece boundaries de equipos
- **Evolución**: Permite cambiar contextos independientemente

## ⚠️ Criticidad en Sistemas de Gran Escala

Sin bounded contexts claros:

- Microservicios con responsabilidades ambiguas
- Acoplamiento fuerte entre servicios
- Conflictos semánticos (mismo término, significados diferentes)
- Imposible escalar equipos (no hay ownership claro)

---

## 🗺️ Context Map Overview

```plaintext
┌──────────────────────────────────────────────────────────────────────────┐
│                         E-COMMERCE BOUNDED CONTEXTS                       │
└──────────────────────────────────────────────────────────────────────────┘

╔═══════════════════╗          ╔═══════════════════╗
║   IDENTITY &      ║          ║   CATALOG         ║
║   ACCESS          ║──────────▶║   CONTEXT         ║
║   CONTEXT (IAM)   ║   ACL    ║                   ║
╚═══════════════════╝          ╚═══════════════════╝
        │                               │
        │ Shared Kernel                │ Customer-Supplier
        ▼                               ▼
╔═══════════════════╗          ╔═══════════════════╗
║   CUSTOMER        ║          ║   INVENTORY       ║
║   CONTEXT         ║          ║   CONTEXT         ║
║                   ║          ║                   ║
╚═══════════════════╝          ╚═══════════════════╝
        │                               │
        │ Published Language            │ Conformist
        ▼                               ▼
╔═══════════════════╗          ╔═══════════════════╗
║   ORDER           ║◀─────────║   PAYMENT         ║
║   CONTEXT         ║   ACL    ║   CONTEXT         ║
║                   ║          ║                   ║
╚═══════════════════╝          ╚═══════════════════╝
        │                               │
        │ Partnership                   │
        ▼                               │
╔═══════════════════╗                  │
║   SHIPPING        ║◀─────────────────┘
║   CONTEXT         ║   Open Host Service
║                   ║
╚═══════════════════╝
        │
        │ Anti-Corruption Layer
        ▼
╔═══════════════════╗
║   NOTIFICATION    ║
║   CONTEXT         ║
║                   ║
╚═══════════════════╝
```

---

## 📦 Bounded Contexts Detallados

### 1. Identity & Access Context (IAM)

**Propósito**: Gestiona autenticación, autorización y gestión de usuarios.

**Ubiquitous Language**:

- **User**: Entidad con credenciales (email, password)
- **Role**: Conjunto de permisos (Admin, Seller, Customer)
- **Permission**: Capacidad para realizar acción específica
- **Session**: Período de autenticación activo (JWT token)
- **Authentication**: Proceso de validar identidad
- **Authorization**: Proceso de validar permisos

**Entidades Core**:

- `User` (Aggregate Root)
- `Role`
- `Permission`
- `Session`

**Eventos de Dominio**:

- `UserRegistered`
- `UserLoggedIn`
- `UserLoggedOut`
- `PasswordResetRequested`
- `PermissionsChanged`

**Integraciones**:

- **Provides**: JWT tokens para todos los contextos
- **Consumes**: Nada (contexto autónomo)

**Base de Datos**: PostgreSQL (usuarios, roles, permisos - datos altamente estructurados)

**Ownership**: Backend Security Team

---

### 2. Catalog Context

**Propósito**: Gestiona productos, categorías, búsqueda y catálogo.

**Ubiquitous Language**:

- **Product**: Item vendible con atributos (precio, descripción, imágenes)
- **Category**: Agrupación jerárquica de productos
- **Attribute**: Característica del producto (color, talla, marca)
- **SKU** (Stock Keeping Unit): Identificador único por variante
- **Listing**: Producto publicado por un Seller
- **Visibility**: Estado de publicación (Draft, Published, Archived)

**Entidades Core**:

- `Product` (Aggregate Root)
- `Category`
- `ProductVariant`
- `ProductImage`

**Eventos de Dominio**:

- `ProductCreated`
- `ProductPublished`
- `ProductUpdated`
- `ProductArchived`
- `PriceChanged`

**Integraciones**:

- **Depends on**: IAM Context (validar seller)
- **Provides**: Datos de productos para Order Context
- **Integrates with**: Elasticsearch (búsqueda full-text)

**Base de Datos**: MongoDB (catálogo con atributos dinámicos)

**Ownership**: Product Management Team

---

### 3. Inventory Context

**Propósito**: Gestiona stock, disponibilidad y reservas de productos.

**Ubiquitous Language**:

- **Stock**: Cantidad disponible de un SKU en una ubicación
- **Warehouse**: Ubicación física de almacenamiento
- **Reservation**: Stock temporalmente reservado (durante checkout)
- **Allocation**: Stock asignado a un pedido confirmado
- **Restock**: Evento de entrada de inventario
- **StockOut**: Situación de inventario agotado

**Entidades Core**:

- `InventoryItem` (Aggregate Root)
- `Warehouse`
- `StockReservation`
- `StockMovement`

**Eventos de Dominio**:

- `StockReserved`
- `StockReleased`
- `StockAllocated`
- `StockReplenished`
- `LowStockThresholdReached`

**Integraciones**:

- **Depends on**: Catalog Context (SKU reference)
- **Provides**: Disponibilidad para Order Context
- **Consumes**: `OrderPlaced` event para decrementar stock

**Base de Datos**: PostgreSQL (transacciones ACID críticas)

**Ownership**: Operations Team

---

### 4. Customer Context

**Propósito**: Gestiona perfiles de clientes, direcciones, preferencias.

**Ubiquitous Language**:

- **Customer**: Comprador con historial de compras
- **Address**: Dirección de envío o facturación
- **Wishlist**: Lista de productos deseados
- **Preference**: Configuraciones del cliente (idioma, newsletter)
- **Segment**: Categorización de clientes (VIP, Regular, New)

**Entidades Core**:

- `Customer` (Aggregate Root)
- `Address`
- `CustomerSegment`
- `Wishlist`

**Eventos de Dominio**:

- `CustomerCreated`
- `AddressAdded`
- `PreferencesUpdated`
- `CustomerSegmentChanged`

**Integraciones**:

- **Shared Kernel con IAM**: Comparten concepto de User
- **Provides**: Datos de cliente para Order Context
- **Consumes**: `OrderCompleted` para actualizar historial

**Base de Datos**: PostgreSQL (datos relacionales)

**Ownership**: Customer Success Team

---

### 5. Order Context

**Propósito**: Gestiona el proceso de compra desde carrito hasta pedido confirmado.

**Ubiquitous Language**:

- **Cart**: Colección temporal de productos antes de checkout
- **Order**: Pedido confirmado y pagado
- **OrderLine**: Línea individual dentro de un pedido
- **OrderStatus**: Estado del pedido (Pending, Confirmed, Shipped, Delivered, Cancelled)
- **Checkout**: Proceso de finalización de compra
- **Discount**: Descuento aplicado (cupón, promoción)

**Entidades Core**:

- `Order` (Aggregate Root)
- `OrderLine`
- `Cart`
- `DiscountCode`

**Eventos de Dominio**:

- `CartCreated`
- `ItemAddedToCart`
- `CheckoutInitiated`
- `OrderPlaced`
- `OrderConfirmed`
- `OrderCancelled`

**Integraciones**:

- **Depends on**: Customer, Catalog, Inventory, Payment
- **Orchestrates**: Saga pattern para coordinar orden completa
- **Provides**: Datos de orden para Shipping Context

**Base de Datos**: PostgreSQL (transaccionalidad crítica)

**Ownership**: Core Product Team

---

### 6. Payment Context

**Propósito**: Gestiona procesamiento de pagos y transacciones financieras.

**Ubiquitous Language**:

- **Payment**: Transacción de pago
- **PaymentMethod**: Método de pago (CreditCard, PayPal, BankTransfer)
- **Transaction**: Operación financiera (Authorize, Capture, Refund)
- **PaymentStatus**: Estado del pago (Pending, Completed, Failed, Refunded)
- **Gateway**: Proveedor externo (Stripe, PayPal)

**Entidades Core**:

- `Payment` (Aggregate Root)
- `PaymentMethod`
- `Transaction`
- `Refund`

**Eventos de Dominio**:

- `PaymentInitiated`
- `PaymentAuthorized`
- `PaymentCompleted`
- `PaymentFailed`
- `RefundIssued`

**Integraciones**:

- **Depends on**: Order Context (amount, order reference)
- **Integrates with**: Stripe API (Anti-Corruption Layer)
- **Publishes**: Payment events para Order Context

**Base de Datos**: PostgreSQL (compliance, auditoría)

**Ownership**: Finance & Security Team

---

### 7. Shipping Context

**Propósito**: Gestiona logística, envíos y tracking.

**Ubiquitous Language**:

- **Shipment**: Envío físico de productos
- **Carrier**: Empresa de logística (FedEx, UPS)
- **TrackingNumber**: Identificador único del envío
- **ShipmentStatus**: Estado del envío (Processing, Shipped, InTransit, Delivered)
- **DeliveryAddress**: Dirección de entrega
- **ShippingMethod**: Tipo de envío (Standard, Express, Overnight)

**Entidades Core**:

- `Shipment` (Aggregate Root)
- `TrackingEvent`
- `CarrierIntegration`

**Eventos de Dominio**:

- `ShipmentCreated`
- `ShipmentShipped`
- `ShipmentInTransit`
- `ShipmentDelivered`
- `ShipmentException`

**Integraciones**:

- **Depends on**: Order Context (order details)
- **Integrates with**: FedEx/UPS APIs (Open Host Service)
- **Publishes**: Shipping events para Notification Context

**Base de Datos**: PostgreSQL (tracking crítico)

**Ownership**: Operations Team

---

### 8. Notification Context

**Propósito**: Gestiona comunicaciones multicanal (email, SMS, push, in-app).

**Ubiquitous Language**:

- **Notification**: Mensaje enviado a usuario
- **Template**: Plantilla de mensaje (Order Confirmation, Shipping Update)
- **Channel**: Medio de envío (Email, SMS, Push, InApp)
- **NotificationStatus**: Estado (Pending, Sent, Delivered, Failed)
- **Preference**: Configuración de notificaciones del usuario

**Entidades Core**:

- `Notification` (Aggregate Root)
- `Template`
- `NotificationHistory`

**Eventos de Dominio**:

- `NotificationScheduled`
- `NotificationSent`
- `NotificationFailed`

**Integraciones**:

- **Consumes**: Eventos de TODOS los contextos (event-driven)
- **Integrates with**: SendGrid, Twilio (ACL)
- **Depends on**: IAM Context (user contact info)

**Base de Datos**: MongoDB (alto volumen, append-only)

**Ownership**: Platform Team

---

## 🔗 Patrones de Integración (Context Mapping Patterns)

### 1. Shared Kernel

**Contextos**: IAM ↔ Customer

**Descripción**: Comparten modelo de `User`. Cambios requieren coordinación.

**Riesgo**: Acoplamiento alto

**Mitigación**: Minimizar shared kernel solo a entidades core

---

### 2. Customer-Supplier

**Contextos**: Catalog → Inventory

**Descripción**: Inventory depende de Catalog para definición de productos.

**Contrato**: Catalog es upstream, define contrato. Inventory es downstream, consume.

**Mitigación**: API versionada, backward compatibility

---

### 3. Conformist

**Contextos**: Inventory → Catalog

**Descripción**: Inventory se conforma al modelo de Catalog sin traducción.

**Justificación**: Simplicidad, modelo de producto estable

---

### 4. Anti-Corruption Layer (ACL)

**Contextos**: Payment → Stripe API

**Descripción**: ACL traduce modelo externo de Stripe al modelo interno de Payment.

**Beneficio**: Protege dominio interno de cambios externos

**Implementación**: Adapter pattern

---

### 5. Open Host Service (OHS)

**Contextos**: Shipping → FedEx/UPS APIs

**Descripción**: Shipping expone interfaz estándar, oculta complejidad de múltiples carriers.

**Beneficio**: Clientes no se acoplan a carriers específicos

---

### 6. Published Language

**Contextos**: Customer → Order

**Descripción**: Customer publica eventos en formato estándar (JSON Schema).

**Beneficio**: Desacoplamiento, múltiples consumidores

**Implementación**: Event-driven via RabbitMQ

---

### 7. Partnership

**Contextos**: Order ↔ Shipping

**Descripción**: Colaboración estrecha, evolución coordinada.

**Justificación**: Ambos core del negocio, necesitan consistencia

**Riesgo**: Acoplamiento

**Mitigación**: Clear interfaces, versioning

---

## 🏢 Organización de Equipos (Conway's Law)

### Team 1: Authentication & Customer (3 devs)

**Contexts**: IAM, Customer  
**Ownership**: User lifecycle completo

### Team 2: Catalog & Inventory (3 devs)

**Contexts**: Catalog, Inventory  
**Ownership**: Product management

### Team 3: Order & Payment (4 devs)

**Contexts**: Order, Payment  
**Ownership**: Core transaccional (crítico)

### Team 4: Fulfillment (2 devs)

**Contexts**: Shipping, Notification  
**Ownership**: Post-order operations

### Team 5: Platform (3 devs)

**Contexts**: API Gateway, Observability, Infrastructure  
**Ownership**: Shared services

**Total**: 15 developers (alineado con Business Goals)

---

## 📊 Matriz de Dependencias

| Context      | Depends On                            | Provides To         | Database   | Team   |
| ------------ | ------------------------------------- | ------------------- | ---------- | ------ |
| IAM          | -                                     | All                 | PostgreSQL | Team 1 |
| Customer     | IAM                                   | Order, Notification | PostgreSQL | Team 1 |
| Catalog      | IAM                                   | Order, Inventory    | MongoDB    | Team 2 |
| Inventory    | Catalog                               | Order               | PostgreSQL | Team 2 |
| Order        | Customer, Catalog, Inventory, Payment | Shipping            | PostgreSQL | Team 3 |
| Payment      | Order                                 | Order               | PostgreSQL | Team 3 |
| Shipping     | Order                                 | Notification        | PostgreSQL | Team 4 |
| Notification | All (events)                          | -                   | MongoDB    | Team 4 |

---

## 🚨 Riesgos y Mitigaciones

### Riesgo 1: Ciclos de Dependencia

**Descripción**: Contextos que se dependen mutuamente.

**Mitigación**: Event-driven para romper ciclos. Ejemplo: Order → Payment (sync), Payment → Order (async via events)

### Riesgo 2: Shared Database

**Descripción**: Múltiples contextos accediendo misma DB.

**Mitigación**: Cada contexto DEBE tener su propia base de datos. No shared tables.

### Riesgo 3: Distributed Transactions

**Descripción**: Necesidad de atomicidad cross-context.

**Mitigación**: Saga pattern (orchestration o choreography), eventual consistency

### Riesgo 4: Bounded Context Erosion

**Descripción**: Contextos que crecen sin control, pierden cohesión.

**Mitigación**: Code reviews arquitectónicos, refactoring continuo, ADRs para cambios

---

## 📖 Referencias

- [Domain-Model.md](../05-domain-design/Domain-Model.md): Detalle de modelos por contexto
- [Ubiquitous-Language-Glossary.md](../05-domain-design/Ubiquitous-Language-Glossary.md): Términos detallados
- [C4-Level2-Container.md](../04-architecture-design/C4-Level2-Container.md): Mapeo BC → Microservicios

---

**Versión**: 1.0  
**Última actualización**: Diciembre 2025  
**Aprobado por**: Software Architect & Domain Experts  
**Próxima revisión**: Semestral o ante refactoring mayor
