# System Context Diagram (C4 Level 1)

## 📋 Propósito del Documento

Proporciona una **vista de alto nivel del sistema** y su relación con actores externos (usuarios, sistemas). Es el primer nivel del modelo C4 (Context, Containers, Components, Code). Define los límites del sistema y sus dependencias externas.

## 🎯 Qué Debe Contener

- Diagrama de contexto del sistema
- Actores principales (usuarios, sistemas externos)
- Flujos de interacción de alto nivel
- Protocolos de comunicación
- Límites del sistema (qué está dentro, qué fuera)

## 🏗️ Impacto en la Arquitectura

- **Scope definition**: Define qué construimos vs qué integramos
- **Dependencias externas**: Identifica riesgos de terceros
- **Interfaces críticas**: Determina puntos de integración
- **Seguridad perimetral**: Establece boundaries de confianza

## ⚠️ Criticidad en Sistemas de Gran Escala

Sin un contexto claro:

- Se construyen integraciones redundantes
- No se identifican single points of failure externos
- Difícil evaluar impacto de cambios en terceros
- Imposible planear disaster recovery

---

## 🎨 Diagrama de Contexto C4 - Level 1

```plaintext
┌─────────────────────────────────────────────────────────────────────────────┐
│                         E-COMMERCE PLATFORM CONTEXT                          │
└─────────────────────────────────────────────────────────────────────────────┘

     External Users                    System Boundary                External Systems
┌──────────────────┐           ┌────────────────────────────┐      ┌──────────────────┐
│                  │           │                            │      │                  │
│    Customer      │──HTTP─────▶   E-Commerce Platform     │      │  Payment Gateway │
│  (Compradores)   │  REST API │                            │◀─────│   (Stripe API)   │
│                  │           │   [Microservices]          │HTTPS │                  │
└──────────────────┘           │   [Node.js/TypeScript]     │      └──────────────────┘
                               │                            │
┌──────────────────┐           │  - Gestión de productos    │      ┌──────────────────┐
│                  │           │  - Procesamiento pedidos   │      │                  │
│     Seller       │──HTTP─────▶  - Autenticación/Auth     │      │   Email Service  │
│  (Vendedores)    │  REST API │  - Pagos y transacciones   │──────▶   (SendGrid)     │
│                  │           │  - Notificaciones          │HTTPS │                  │
└──────────────────┘           │                            │      └──────────────────┘
                               │  Databases:                │
┌──────────────────┐           │  - PostgreSQL (relacional) │      ┌──────────────────┐
│                  │           │  - MongoDB (documentos)    │      │                  │
│  Administrator   │──HTTP─────▶  - Redis (cache/sessions)  │      │ Logistics API    │
│   (Admins)       │  REST API │                            │◀─────│  (FedEx/UPS)     │
│                  │           │  Message Queue:            │HTTPS │                  │
└──────────────────┘           │  - RabbitMQ (async comm)   │      └──────────────────┘
                               │                            │
┌──────────────────┐           │  Observability:            │      ┌──────────────────┐
│                  │           │  - Prometheus (metrics)    │      │                  │
│   DevOps Team    │──HTTPS────▶  - Grafana (dashboards)    │      │   Cloud Storage  │
│   (Engineers)    │  Admin UI │  - Loki (logs)             │◀─────│     (AWS S3)     │
│                  │           │  - Tempo (traces)          │HTTPS │                  │
└──────────────────┘           │                            │      └──────────────────┘
                               └────────────────────────────┘
                                           │
                                           │ Deploy
                                           ▼
                               ┌────────────────────────────┐
                               │  Kubernetes Cluster        │
                               │  (AWS EKS / GCP GKE)       │
                               └────────────────────────────┘
```

---

## 👥 Actores Principales

### 1. **Customer** (Comprador)

**Descripción**: Usuario final que compra productos en la plataforma.

**Interacciones**:

- Navega catálogo de productos
- Busca y filtra productos
- Agrega productos al carrito
- Realiza checkout y pago
- Consulta estado de pedidos
- Gestiona su perfil

**Protocolo**: HTTPS REST API + WebSockets (notificaciones en tiempo real)

**Autenticación**: JWT (JSON Web Tokens) + OAuth2 (Google, Facebook)

**Volumen esperado**: 10,000 usuarios concurrentes en picos

---

### 2. **Seller** (Vendedor)

**Descripción**: Comerciante que lista productos en la plataforma.

**Interacciones**:

- Gestiona catálogo de productos
- Consulta inventario en tiempo real
- Procesa pedidos entrantes
- Gestiona envíos y tracking
- Consulta analytics de ventas
- Configura métodos de pago

**Protocolo**: HTTPS REST API

**Autenticación**: JWT + Multi-factor authentication (MFA)

**Volumen esperado**: 500 sellers activos, 50 concurrentes en picos

---

### 3. **Administrator** (Administrador)

**Descripción**: Personal interno que gestiona la plataforma.

**Interacciones**:

- Gestiona usuarios (customers, sellers)
- Modera contenido (productos, reviews)
- Configura sistema (fees, comisiones, reglas)
- Monitorea métricas de negocio
- Resuelve disputas y soporte
- Gestiona promociones y descuentos

**Protocolo**: HTTPS REST API + Admin Dashboard

**Autenticación**: JWT + MFA + Role-Based Access Control (RBAC)

**Volumen esperado**: 10-20 admins simultáneos

---

### 4. **DevOps Team** (Equipo Técnico)

**Descripción**: Ingenieros que operan y mantienen la plataforma.

**Interacciones**:

- Monitorean servicios (logs, metrics, traces)
- Despliegan nuevas versiones (CI/CD)
- Gestionan infraestructura (Kubernetes, databases)
- Responden a incidentes (on-call)
- Ajustan escalamiento y capacity planning

**Protocolo**: HTTPS (Grafana, Prometheus), SSH/kubectl (infraestructura)

**Autenticación**: SSO (Single Sign-On) + MFA + Audit logs

---

## 🔗 Sistemas Externos

### 1. **Payment Gateway** (Stripe)

**Propósito**: Procesamiento de pagos con tarjeta de crédito/débito.

**Tipo de integración**: API REST HTTPS

**Flujo**:

1. Customer inicia checkout
2. Sistema genera `PaymentIntent` en Stripe
3. Frontend captura datos de tarjeta (Stripe.js - PCI compliant)
4. Stripe procesa pago
5. Webhook notifica resultado a nuestro backend

**Dependencia**: **CRÍTICA** - Sin Stripe, no hay ingresos

**Mitigación**:

- Implementar fallback a PayPal
- Circuit breaker para timeouts
- Idempotencia en creación de pagos

**Costo**: 2.9% + $0.30 por transacción

**SLA de Stripe**: 99.99% uptime

---

### 2. **Email Service** (SendGrid)

**Propósito**: Envío de emails transaccionales (confirmación pedido, tracking, password reset).

**Tipo de integración**: API REST HTTPS + SMTP

**Volumen esperado**: 50,000 emails/día

**Dependencia**: **IMPORTANTE** - Sistema funciona sin emails, pero UX degradada

**Mitigación**:

- Queue de emails en RabbitMQ (retry automático)
- Fallback a Amazon SES
- Almacenar emails enviados para auditoría

**Costo**: $0.001 por email (primeros 100k gratis/mes)

**SLA de SendGrid**: 99.95% uptime

---

### 3. **Logistics API** (FedEx, UPS)

**Propósito**: Tracking de envíos y cotización de tarifas.

**Tipo de integración**: API REST HTTPS (diferentes por carrier)

**Dependencia**: **MEDIA** - No bloquea ventas, solo información de tracking

**Mitigación**:

- Polling periódico (no tiempo real)
- Cache de tracking info (Redis)
- Soporte multi-carrier para redundancia

**Costo**: Variable según carrier

---

### 4. **Cloud Storage** (AWS S3)

**Propósito**: Almacenamiento de imágenes de productos, documentos, backups.

**Tipo de integración**: AWS SDK (S3 API)

**Volumen esperado**: 100 GB iniciales, crecimiento 10 GB/mes

**Dependencia**: **MEDIA** - Imágenes cached en CDN

**Mitigación**:

- CDN (CloudFront) para acelerar entrega
- Multi-region replication
- Lifecycle policies (archivar a Glacier después de 90 días)

**Costo**: $0.023/GB/mes + transfer costs

---

### 5. **Monitoring Stack** (Prometheus, Grafana, Loki)

**Propósito**: Observabilidad completa del sistema.

**Tipo de integración**: Prometheus pull model, Loki push via Promtail

**Dependencia**: **CRÍTICA para operación** - No afecta usuarios finales

**Mitigación**:

- Stack separado en cluster de observabilidad
- Backups de métricas históricas
- Alertas redundantes (Slack + PagerDuty)

**Costo**: Self-hosted en Kubernetes (costo de infra)

---

## 🛡️ Límites del Sistema (Boundaries)

### Dentro del Sistema (In Scope)

✅ Autenticación y autorización de usuarios  
✅ Gestión de catálogo de productos  
✅ Procesamiento de pedidos  
✅ Integración con payment gateway  
✅ Notificaciones (email, in-app)  
✅ Analytics básico de negocio  
✅ Gestión de inventario  
✅ Sistema de reviews y ratings

### Fuera del Sistema (Out of Scope)

❌ Procesamiento directo de tarjetas (PCI-DSS compliance delegado a Stripe)  
❌ Logística física (delegado a carriers)  
❌ Facturación electrónica (futura integración)  
❌ ERP empresarial (integramos vía API si existe)  
❌ CRM avanzado (futuro, hoy solo básico)  
❌ Machine Learning / Recomendaciones personalizadas (Fase 2)

---

## 🔐 Protocolos de Comunicación

### Externa (Internet → Sistema)

- **HTTPS REST API** (TLS 1.3): Todas las comunicaciones de usuarios
- **WebSockets** (WSS): Notificaciones en tiempo real
- **OAuth2 + OpenID Connect**: Login con proveedores externos

### Interna (Microservicio ↔ Microservicio)

- **HTTP REST** (dentro de red privada): Comunicación síncrona
- **RabbitMQ (AMQP)**: Comunicación asíncrona
- **gRPC** (futuro): Para comunicación de alta performance

### Observabilidad

- **Prometheus pull** (HTTP /metrics endpoint)
- **Loki push** (Promtail agent)
- **Jaeger** (OpenTelemetry traces via HTTP)

---

## 📊 Flujos de Interacción Principales

### Flujo 1: Compra de Producto

```
Customer → API Gateway → Product Service (query)
         → Cart Service (add to cart)
         → Order Service (create order)
         → Payment Service → Stripe API (process payment)
         → Inventory Service (decrement stock)
         → Notification Service → SendGrid (confirmation email)
         → Customer (order confirmed)
```

### Flujo 2: Seller Lista Producto

```
Seller → API Gateway → Auth Service (validate JWT)
       → Product Service (create product)
       → Image Upload → S3 (store images)
       → Inventory Service (set stock)
       → Search Service (index for search)
       → Seller (product published)
```

### Flujo 3: Admin Modera Contenido

```
Admin → Admin Dashboard → Auth Service (RBAC validation)
      → Product Service (review product)
      → Notification Service → SendGrid (notify seller)
      → Audit Log Service (record action)
```

---

## 🚨 Puntos Críticos de Fallo

### Single Points of Failure (SPOF)

1. **API Gateway**: Si cae, todo el sistema es inaccesible

   - **Mitigación**: Múltiples réplicas + Health checks + Auto-scaling

2. **PostgreSQL Master**: Si cae, escrituras bloqueadas

   - **Mitigación**: Replicación asíncrona + Automated failover

3. **RabbitMQ**: Si cae, mensajes asíncronos perdidos

   - **Mitigación**: Cluster de 3 nodos + Persistent queues

4. **Stripe**: Si cae su API, no podemos procesar pagos
   - **Mitigación**: Circuit breaker + Fallback a PayPal + Queue de retry

---

## 🌐 Regiones y Multi-Region (Futuro)

### Fase 1 (MVP): Single Region

- **Región primaria**: AWS us-east-1 (Norte de Virginia)
- **Justificación**: Menor latencia para usuarios en Américas
- **Backups**: Cross-region replication a us-west-2

### Fase 2 (Scale): Multi-Region Active-Passive

- **Primary**: us-east-1
- **Disaster Recovery**: eu-west-1 (Irlanda)
- **RTO**: 4 horas (Recovery Time Objective)
- **RPO**: 15 minutos (Recovery Point Objective)

### Fase 3 (Global): Multi-Region Active-Active

- **Americas**: us-east-1
- **Europe**: eu-west-1
- **Asia**: ap-southeast-1 (Singapore)
- **Routing**: GeoDNS (Route 53)

---

## 📖 Referencias

- [C4 Model Official Site](https://c4model.com/)
- [C4-Level2-Container.md](../04-architecture-design/C4-Level2-Container.md): Siguiente nivel de detalle
- [Stakeholders.md](Stakeholders.md): Roles y responsabilidades
- [Integration-Contracts.md](../06-interfaces-and-contracts/Integration-Contracts.md): Contratos de APIs externas

---

**Versión**: 1.0  
**Última actualización**: Diciembre 2025  
**Aprobado por**: Software Architect  
**Próxima revisión**: Trimestral o ante cambio arquitectónico mayor
