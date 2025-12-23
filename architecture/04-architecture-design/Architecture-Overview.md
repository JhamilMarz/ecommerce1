# Architecture Overview

## 📋 Propósito

Descripción ejecutiva de la arquitectura del sistema: visión de alto nivel, decisiones clave, patrones aplicados y justificaciones.

## 🏗️ Qué Contiene

- Visión arquitectónica
- Estilo arquitectónico elegido
- Patrones aplicados
- Tech stack
- Principios de diseño
- Diagrama de alto nivel

---

## 🎯 Visión Arquitectónica

**"Arquitectura de microservicios cloud-native, event-driven, preparada para escala, con observabilidad completa y seguridad by design."**

### Objetivos Arquitectónicos

1. **Escalabilidad independiente**: Cada servicio escala según su demanda
2. **Resiliencia**: Fallo de un servicio no colapsa el sistema
3. **Autonomía de equipos**: Equipos pequeños con ownership completo
4. **Velocidad de desarrollo**: Deploy frecuente y seguro
5. **Observabilidad**: Visibilidad completa del sistema en producción

---

## 🏛️ Estilo Arquitectónico: Microservicios

### ¿Por qué Microservicios?

✅ **Escalabilidad granular**: Escalar solo lo que necesita (ej: Order Service en Black Friday)  
✅ **Tecnología heterogénea**: Cada servicio puede usar tech stack óptimo  
✅ **Deploy independiente**: Reducir blast radius de cambios  
✅ **Ownership claro**: Equipos pequeños, alta velocidad  
✅ **Tolerancia a fallos**: Circuit breakers, bulkheads

### Trade-offs Aceptados

❌ **Complejidad distribuida**: Necesita orchestration, distributed tracing  
❌ **Eventual consistency**: No ACID global, usar Sagas  
❌ **Overhead operacional**: Kubernetes, service mesh, monitoring

**Justificación**: Para e-commerce a escala, beneficios > costos

---

## 🧩 Componentes Principales

### Layer 1: Edge Layer

**API Gateway** (Kong o similar)

- Rate limiting
- Authentication (JWT validation)
- Request routing
- API composition
- Caching

### Layer 2: Service Layer (Microservicios)

**Core Services**:

1. **IAM Service**: Identity & Access Management
2. **Catalog Service**: Products, categories, search
3. **Inventory Service**: Stock management
4. **Customer Service**: User profiles, preferences
5. **Order Service**: Cart, checkout, orders
6. **Payment Service**: Payment processing
7. **Shipping Service**: Logistics & tracking
8. **Notification Service**: Multi-channel notifications

### Layer 3: Data Layer

- **PostgreSQL**: Datos transaccionales (orders, payments, inventory)
- **MongoDB**: Catálogo con schema flexible
- **Redis**: Caching, sessions, rate limiting
- **Elasticsearch**: Full-text search (productos)

### Layer 4: Infrastructure Layer

- **Kubernetes**: Container orchestration
- **RabbitMQ**: Async messaging
- **Prometheus + Grafana**: Monitoring
- **Loki**: Log aggregation
- **Jaeger**: Distributed tracing

---

## 📐 Patrones Arquitectónicos Aplicados

### 1. API Gateway Pattern

**Problema**: Clientes no deben llamar directamente a 8 microservicios  
**Solución**: Gateway único como entry point  
**Beneficios**: Seguridad centralizada, rate limiting, routing

### 2. Database per Service

**Problema**: Shared database crea acoplamiento  
**Solución**: Cada microservicio su propia BD  
**Beneficios**: Autonomía, escalabilidad independiente  
**Trade-off**: Queries cross-service más complejas (usar eventos)

### 3. Event-Driven Architecture

**Problema**: Sincronización directa crea acoplamiento  
**Solución**: Comunicación asíncrona via eventos (RabbitMQ)  
**Beneficios**: Desacoplamiento, escalabilidad, auditabilidad  
**Ejemplo**: `OrderPlaced` event → Inventory decrementa stock, Notification envía email

### 4. Saga Pattern (Orchestration)

**Problema**: Transacciones distribuidas (crear orden requiere reservar stock + procesar pago)  
**Solución**: Saga orquestada desde Order Service  
**Pasos**:

1. Order Service → Reserve stock (Inventory Service)
2. Order Service → Process payment (Payment Service)
3. Si falla → Compensating transactions (liberar stock)

### 5. Circuit Breaker

**Problema**: Servicio downstream caído bloquea upstream  
**Solución**: Circuit breaker detecta fallas, abre circuito, fallback  
**Implementación**: Resilience4j o similar

### 6. Strangler Fig (para Legacy Migration)

**Problema**: Migrar de monolito a microservicios sin big bang  
**Solución**: Proxy que gradualmente redirige tráfico a nuevos servicios  
**Status**: No aplica en MVP (greenfield), documentado para futuro

---

## 🛠️ Tech Stack

### Backend

- **Runtime**: Node.js 20 LTS
- **Language**: TypeScript 5.x
- **Framework**: Express.js (REST), Socket.io (WebSockets)
- **ORM**: Prisma (PostgreSQL), Mongoose (MongoDB)
- **Validation**: Zod
- **Testing**: Jest (unit), Supertest (integration), k6 (load)

### Infrastructure

- **Container**: Docker
- **Orchestration**: Kubernetes (AWS EKS o GCP GKE)
- **Service Mesh**: (Futuro - Istio, MVP sin service mesh)
- **CI/CD**: GitHub Actions
- **IaC**: Terraform

### Data

- **Relational**: PostgreSQL 15
- **Document**: MongoDB 7
- **Cache**: Redis 7
- **Search**: Elasticsearch 8 (Fase 2)
- **Message Queue**: RabbitMQ 3.12

### Observability

- **Metrics**: Prometheus + Grafana
- **Logs**: Loki + Promtail
- **Traces**: Jaeger (OpenTelemetry)
- **Alerting**: Alertmanager + PagerDuty

### Security

- **Authentication**: JWT (RS256)
- **Authorization**: RBAC
- **Secrets**: HashiCorp Vault o AWS Secrets Manager
- **API Security**: Rate limiting, CORS, Helmet.js

---

## 🔄 Flujo de Request (Ejemplo: Crear Orden)

```
1. Client → HTTPS → API Gateway (Kong)
2. Gateway → Validate JWT → Route to Order Service
3. Order Service:
   a. Validate stock (sync call to Inventory Service)
   b. Create order (write to PostgreSQL)
   c. Publish "OrderPlaced" event (RabbitMQ)
4. Payment Service (consume event):
   a. Process payment (call Stripe API)
   b. Publish "PaymentCompleted" event
5. Inventory Service (consume "PaymentCompleted"):
   a. Decrement stock (PostgreSQL transaction)
6. Notification Service (consume "OrderPlaced"):
   a. Send email (SendGrid API)
7. Order Service returns response to Client
```

**Latencia esperada**: P95 < 500ms (incluye network, DB, external APIs)

---

## 📊 Clean Architecture por Microservicio

```
src/
├── domain/           # Entidades, Value Objects, Aggregates (business logic pura)
│   ├── entities/
│   ├── value-objects/
│   └── errors/
├── application/      # Use Cases, Application Services (orquestación)
│   ├── use-cases/
│   ├── dtos/
│   └── ports/        # Interfaces (repository, external services)
├── infrastructure/   # Implementaciones concretas
│   ├── database/     # Prisma/Mongoose repositories
│   ├── http/         # Express controllers, middlewares
│   ├── messaging/    # RabbitMQ publishers/consumers
│   └── external/     # Stripe, SendGrid adapters
└── presentation/     # API routes, OpenAPI spec
    └── http/
        └── routes/
```

**Dependencias**: Domain ← Application ← Infrastructure/Presentation

**Benefit**: Testeable, framework-agnostic domain logic

---

## 🔐 Seguridad en Capas

### Capa 1: Perimeter (API Gateway)

- TLS 1.3 obligatorio
- Rate limiting (100 req/min por IP)
- DDoS protection (CloudFlare)
- CORS configurado

### Capa 2: Authentication & Authorization

- JWT con RS256 (public/private keys)
- Token expiration: 24h (access), 30d (refresh)
- RBAC: roles (Customer, Seller, Admin)
- MFA para admins

### Capa 3: Service-to-Service

- Service accounts con JWT específico
- mTLS para comunicación crítica (Fase 2)
- Network policies en Kubernetes

### Capa 4: Data

- Encryption at rest (AES-256)
- Encryption in transit (TLS)
- PII tokenization
- Secrets en Vault (no env vars)

---

## 📈 Estrategia de Escalabilidad

### Horizontal Scaling (Preferred)

- Stateless services (no sticky sessions)
- Auto-scaling en Kubernetes (HPA)
- Trigger: CPU > 70% o Memory > 80%
- Min replicas: 2 (HA), Max: 20

### Vertical Scaling (Si necesario)

- Database (PostgreSQL): Upgrade de instance type
- Redis: Cluster mode para > 100GB data

### Database Scaling

- **Read replicas**: Para queries pesadas (analytics)
- **Partitioning**: Orders por fecha (monthly partitions)
- **Sharding**: (Fase 3) Por region o customer segment

---

## 🚨 Fault Tolerance

### High Availability

- Multi-AZ deployment (mínimo 2 AZs)
- Health checks: liveness + readiness probes
- Auto-restart de pods fallidos
- Load balancing con health-aware routing

### Resilience Patterns

- **Circuit Breaker**: Proteger de cascading failures
- **Retry with Exponential Backoff**: Para fallos transitorios
- **Timeout**: Max 5s por external API call
- **Bulkhead**: Thread pools separados por dependency

### Disaster Recovery

- **RPO**: 15 minutos (point-in-time recovery)
- **RTO**: 1 hora (restore desde backup)
- **Backups**: Cada 6 horas, retention 30 días
- **DR Drills**: Trimestral

---

## 📖 Referencias a Documentos Relacionados

- [C4-Level2-Container.md](C4-Level2-Container.md): Detalle de containers
- [Architecture-Principles.md](Architecture-Principles.md): Principios guía
- [Architecture-Decision-Records/](Architecture-Decision-Records/): ADRs detallados

---

**Versión**: 1.0  
**Última actualización**: Diciembre 2025  
**Aprobado por**: Software Architect & Tech Lead
