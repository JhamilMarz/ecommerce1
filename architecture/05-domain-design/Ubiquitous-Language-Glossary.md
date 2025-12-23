# Ubiquitous Language Glossary

## 📋 Propósito

Glosario completo del **lenguaje ubicuo** (Ubiquitous Language) usado en el dominio. Asegura que negocio y desarrollo usen los mismos términos con los mismos significados.

## 🎯 Reglas

- Términos en INGLÉS en código
- Descripciones en ESPAÑOL
- Un término = Un significado (sin ambigüedad)
- Usado consistentemente en código, docs, conversaciones

---

## 🔑 Términos Core

### A

**Aggregate**  
Grupo de entidades y value objects tratados como unidad de consistencia. Tiene un Aggregate Root que es el único punto de acceso externo.

**Aggregate Root**  
Entidad principal de un Aggregate. Es la única entidad que puede ser referenciada desde fuera del aggregate.

**API Gateway**  
Punto de entrada único para todas las peticiones de clientes externos. Maneja autenticación, routing, rate limiting.

---

### B

**Bounded Context**  
Límite explícito dentro del cual un modelo de dominio es definido y aplicable. En nuestro sistema, cada microservicio corresponde a un bounded context.

**Business Logic**  
Lógica de negocio que implementa las reglas del dominio. Debe estar en la capa de dominio, no en controllers ni repositorios.

---

### C

**Cart (Carrito)**  
Colección temporal de productos que un Customer intenta comprar. Persiste 7 días para usuarios autenticados.

**Catalog (Catálogo)**  
Conjunto de todos los productos disponibles en la plataforma.

**Category (Categoría)**  
Clasificación jerárquica de productos. Ejemplo: Electronics > Smartphones > iOS.

**Checkout**  
Proceso de finalización de compra desde el carrito hasta la creación de la orden.

**Circuit Breaker**  
Patrón que previene llamadas a un servicio que está fallando. Tiene estados: Closed, Open, Half-Open.

**Customer (Cliente/Comprador)**  
Usuario que compra productos en la plataforma. NO confundir con User (término técnico).

---

### D

**Domain Event**  
Algo que sucedió en el dominio y que es relevante para el negocio. Ejemplo: OrderPlaced, PaymentCompleted. Son inmutables y en pasado.

**Domain Service**  
Servicio que implementa lógica de negocio que no pertenece a una entidad específica. Ejemplo: PricingService, TaxCalculator.

---

### E

**Entity**  
Objeto con identidad única que persiste en el tiempo. Ejemplo: User, Order, Product.

**Event-Driven Architecture**  
Arquitectura donde componentes se comunican mediante eventos asíncronos.

**Eventual Consistency**  
Modelo de consistencia donde el sistema eventualmente converge a un estado consistente, pero no inmediatamente.

---

### F

**Fulfillment**  
Proceso de cumplimiento de una orden: picking, packing, shipping.

---

### I

**Idempotency**  
Propiedad de una operación que puede ejecutarse múltiples veces sin cambiar el resultado más allá de la primera ejecución.

**Inventory (Inventario)**  
Stock disponible de productos en warehouse(s).

---

### M

**Microservice**  
Servicio independiente que implementa un bounded context. Tiene su propia base de datos y se despliega independientemente.

**Money (Dinero)**  
Value Object que representa cantidad monetaria: { amount: number, currency: string }. SIEMPRE usar Money, NUNCA number directo.

---

### O

**Order (Orden/Pedido)**  
Solicitud de compra confirmada y pagada por un Customer. Tiene OrderLines (líneas de pedido).

**OrderLine**  
Línea individual dentro de una Order. Contiene: producto, cantidad, precio unitario.

---

### P

**Payment (Pago)**  
Transacción financiera para pagar una Order. Procesado por Payment Gateway (Stripe).

**Payment Gateway**  
Proveedor externo que procesa pagos (Stripe, PayPal).

**Product (Producto)**  
Item vendible en el catálogo. Tiene SKU único, precio, descripción, imágenes.

---

### R

**Repository**  
Patrón que abstrae el acceso a datos. Cada Aggregate Root tiene un Repository.

**Resilience**  
Capacidad del sistema de recuperarse de fallos y continuar operando.

---

### S

**Saga**  
Patrón para gestionar transacciones distribuidas mediante secuencia de transacciones locales coordinadas.

**Seller (Vendedor)**  
Usuario que lista y vende productos en la plataforma.

**Shipment (Envío)**  
Despacho físico de productos de una Order al Customer.

**SKU (Stock Keeping Unit)**  
Identificador único de un producto o variante. Ejemplo: TSHIRT-RED-L.

**Stock**  
Cantidad disponible de un SKU en inventario.

---

### T

**Tracking Number**  
Número de seguimiento proporcionado por el carrier (FedEx, UPS) para rastrear un Shipment.

---

### U

**Ubiquitous Language**  
Lenguaje común usado por todo el equipo (negocio, developers, QA). Debe reflejarse en el código.

**Use Case**  
Caso de uso que implementa un flujo de negocio. Orquesta entidades y servicios de dominio. Ejemplo: CreateOrderUseCase.

---

### V

**Value Object**  
Objeto sin identidad, definido solo por sus atributos. Es inmutable. Ejemplo: Email, Money, Address.

---

### W

**Warehouse**  
Ubicación física donde se almacena inventario.

---

## 🚫 Términos a EVITAR

### ❌ NO usar términos ambiguos:

- ~~"Item"~~ → Usar Product o OrderLine (específico según contexto)
- ~~"Transaction"~~ → Usar Payment o Order (según contexto)
- ~~"Record"~~ → Usar nombre de entidad específico (User, Product, etc.)
- ~~"Data"~~ → Ser específico (OrderData, ProductData, etc.)

### ❌ NO mezclar idiomas:

- ~~"ProductoEntity"~~ → ❌ (mezcla español e inglés)
- `Product` → ✅ (código en inglés)
- "Producto" → ✅ (docs en español)

---

## 📚 Glosario por Bounded Context

### IAM Context

- User, Role, Permission, Session, Authentication, Authorization

### Catalog Context

- Product, Category, SKU, Attribute, Listing, Visibility

### Inventory Context

- Stock, Warehouse, Reservation, Allocation, StockMovement

### Customer Context

- Customer, Address, Wishlist, Preference, Segment

### Order Context

- Order, OrderLine, Cart, Checkout, Discount

### Payment Context

- Payment, Transaction, PaymentMethod, Refund, Gateway

### Shipping Context

- Shipment, Carrier, TrackingNumber, TrackingEvent, DeliveryAddress

### Notification Context

- Notification, Template, Channel, NotificationStatus

---

## 🔄 Proceso de Actualización

Cuando se identifica un nuevo término del dominio:

1. Discutir con Domain Expert y equipo
2. Agregar al glosario con definición clara
3. Actualizar código existente si hay inconsistencia
4. Comunicar en Slack #engineering

**Responsable**: Domain Expert + Tech Lead

---

**Versión**: 1.0  
**Última actualización**: Diciembre 2025  
**Referencias**: [Domain-Model.md](Domain-Model.md), [Bounded-Context-Map.md](../../02-context/Bounded-Context-Map.md)
