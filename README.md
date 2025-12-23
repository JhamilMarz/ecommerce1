# E-Commerce Microservices Monorepo

Monorepo profesional con arquitectura de microservicios para plataforma de e-commerce. Implementa Clean Architecture, SOLID, y event-driven architecture con Node.js 18.20.8 y pnpm workspaces.

## 📁 Estructura

```
back/
├── apps/                    # Microservicios
│   ├── api-gateway/        # Punto de entrada (proxy routing)
│   ├── auth-service/       # Autenticación JWT
│   ├── product-service/    # Catálogo de productos
│   ├── order-service/      # Gestión de pedidos
│   ├── notification-service/ # Emails transaccionales
│   ├── payment-service/    # Pagos (Stripe)
│   └── logging-service/    # Agregación de logs
├── packages/               # Código compartido
│   ├── shared-dtos/       # DTOs con Zod schemas
│   ├── shared-events/     # Domain events (RabbitMQ)
│   ├── shared-errors/     # Custom error classes
│   └── shared-utils/      # Utilidades comunes
└── docs/                  # Arquitectura (CHECKPOINT 0)
```

## 🚀 Instalación

### Requisitos
- **Node.js 18.20.8** (obligatorio, usar nvm)
- **pnpm 9.15.0+**
- PostgreSQL 16+
- MongoDB 7+
- Redis 7+ (opcional)
- RabbitMQ 3.13+ (opcional)

### Setup

```bash
# Instalar Node.js 18.20.8
nvm install 18.20.8
nvm use 18.20.8

# Instalar pnpm
npm install -g pnpm@9.15.0

# Instalar dependencias (workspace completo)
pnpm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con credenciales reales

# Construir shared packages
pnpm --filter "@shared/*" build

# Desarrollo: iniciar todos los servicios
pnpm dev
```

## 🏗️ Arquitectura

### Clean Architecture
Cada microservicio implementa 3 capas:
- **Domain**: Entidades, repositorios (interfaces), lógica de negocio
- **Application**: Casos de uso, DTOs, orquestación
- **Infrastructure**: Frameworks (Express), BD, APIs externas

### Comunicación
- **Síncrona**: API Gateway → REST endpoints (Express)
- **Asíncrona**: RabbitMQ con domain events (@shared/events)

### Stack Técnico
- **Runtime**: Node.js 18.20.8
- **Language**: TypeScript 5.7.2 (strict mode)
- **Framework**: Express 4.21.2
- **Databases**: PostgreSQL (auth, order), MongoDB (product)
- **Auth**: JWT (jsonwebtoken 9.0.2)
- **Validation**: Zod 3.24.1
- **Testing**: Jest 29.7.0 (80% coverage)
- **Linting**: ESLint + Prettier

## 📊 Servicios

### API Gateway (Port 3000)
Proxy con rate limiting y routing a microservicios.

**Endpoints:**
- `/auth/*` → Auth Service
- `/products/*` → Product Service
- `/orders/*` → Order Service
- `/notifications/*` → Notification Service
- `/payments/*` → Payment Service

### Auth Service (Port 3001)
Autenticación JWT con roles (customer/seller/admin).

**Endpoints:**
- `POST /auth/register` - Registro de usuario
- `POST /auth/login` - Login (access + refresh tokens)

### Otros Servicios
- **Product** (3002): CRUD de productos, búsqueda
- **Order** (3003): Crear, cancelar, rastrear pedidos
- **Notification** (3004): Envío de emails (nodemailer)
- **Payment** (3005): Integración con Stripe
- **Logging** (3006): Agregación de logs

## 🧪 Comandos

```bash
# Desarrollo
pnpm dev                     # Todos los servicios
pnpm --filter api-gateway dev  # Solo API Gateway

# Build
pnpm build                   # Compilar TypeScript

# Testing
pnpm test                    # Ejecutar tests
pnpm test:coverage           # Coverage report

# Linting
pnpm lint                    # Verificar código
pnpm lint:fix                # Auto-fix

# Type checking
pnpm type-check              # Verificar tipos TS
```

## 📈 Escalamiento

### Horizontal
Cada microservicio es stateless y puede escalar independientemente:
```bash
# Múltiples instancias del mismo servicio
pm2 start apps/product-service/dist/index.js -i 4
```

### Load Balancing
- **Desarrollo**: API Gateway con proxy
- **Producción**: Nginx + Docker Swarm/Kubernetes

### Caching
- Redis para sesiones JWT
- MongoDB query cache
- HTTP cache headers en API Gateway

## 🔒 Seguridad

- **Autenticación**: JWT con refresh tokens
- **Autorización**: Role-based (customer/seller/admin)
- **Validación**: Zod schemas en todos los inputs
- **Rate Limiting**: API Gateway (100 req/15min)
- **Headers**: Helmet.js (CSP, HSTS, XSS protection)
- **Secrets**: Variables de entorno (.env nunca en git)

## 📝 Alineación con CHECKPOINT 0

Este monorepo implementa la arquitectura definida en `docs/`:
- **ADR-001**: Decisión de microservicios
- **Clean Architecture**: Domain → Application → Infrastructure
- **Event-Driven**: RabbitMQ con @shared/events
- **Testing**: Coverage mínimo 80%
- **Git**: Feature branches + CI/CD
- **Code Review**: Requerido en PRs

## 🚨 Gestión de Riesgos

1. **Complejidad distribuida**: Mitigado con API Gateway centralizado
2. **Consistencia de datos**: Saga pattern en Order Service
3. **Latencia de red**: Circuit breaker + retry policies (futuro)
4. **Monitoreo**: Logging Service + health checks

## 🛠️ Próximos Pasos (CHECKPOINT 2)

- Implementar lógica completa en product-service
- Conectar repositorios a bases de datos reales
- Configurar RabbitMQ para eventos
- Dockerizar servicios
- CI/CD con GitHub Actions
- Pruebas de integración E2E

---

**Stack**: Node.js 18.20.8 | TypeScript 5.7.2 | pnpm workspaces | Clean Architecture | Microservices
