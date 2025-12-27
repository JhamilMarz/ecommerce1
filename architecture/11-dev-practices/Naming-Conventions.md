# Naming Conventions — E-Commerce Platform

**Fecha:** Diciembre 2025  
**Stack:** Node.js + TypeScript + Express + Clean Architecture  
**Estándar:** TypeScript Community + Node.js Best Practices

---

## 🎯 Decisión de Estandarización

### **Convención Principal: kebab-case**

**Razón:**

- ✅ Estándar de la comunidad TypeScript/Node.js
- ✅ Compatible con sistemas de archivos case-insensitive
- ✅ Más universal que convenciones específicas de frameworks
- ✅ Usado por: Express, TypeORM, Prisma, tRPC, TypeScript Handbook

**Excepciones:**

- React/Vue components: `PascalCase.tsx`
- Classes/Interfaces/Types: `PascalCase` (dentro del archivo)
- Variables/Functions: `camelCase` (dentro del archivo)
- Constants: `SCREAMING_SNAKE_CASE` (dentro del archivo)

---

## 📁 Archivos (Files)

### **Regla General: kebab-case**

```
user-repository.ts           ✅
jwt-service.ts               ✅
auth-controller.ts           ✅
correlation-id.ts            ✅
register-user-dto.ts         ✅
```

### **Estrategia de Naming por Tipo**

#### **1. Entities (Domain Layer)**

```
domain/entities/
  user.ts                    # export class User
  refresh-token.ts           # export class RefreshToken
  order.ts                   # export class Order
  order-item.ts              # export class OrderItem
```

**Regla:** Nombre simple sin sufijos (la carpeta `entities/` da contexto)

---

#### **2. Interfaces (Domain/Application Layer)**

**SIN prefijo "I"** (TypeScript standard)

```typescript
// ✅ CORRECTO (TypeScript idiomático)
domain/repositories/
  user-repository.ts         # export interface UserRepository
  order-repository.ts        # export interface OrderRepository

application/services/
  jwt-service.ts             # export interface JwtService
  email-service.ts           # export interface EmailService

// ❌ INCORRECTO (C# style, avoid)
IUserRepository.ts           # NO usar prefijo "I"
IJwtService.ts               # NO usar prefijo "I"
```

**Rationale:**

- TypeScript tiene tipos estructurales, no nominales
- Community standard: NestJS, TypeORM, Prisma, Apollo GraphQL
- Implementations usan prefijo de tecnología: `PostgresUserRepository`

---

#### **3. Implementations (Infrastructure Layer)**

**CON prefijo de tecnología** (para claridad)

```
infrastructure/database/repositories/
  postgres-user-repository.ts      # export class PostgresUserRepository
  mongo-order-repository.ts        # export class MongoOrderRepository
  redis-cache-repository.ts        # export class RedisCacheRepository

infrastructure/services/
  jose-jwt-service.ts              # export class JoseJwtService
  argon2-password-service.ts       # export class Argon2PasswordService
  nodemailer-email-service.ts      # export class NodemailerEmailService
  rabbitmq-event-publisher.ts      # export class RabbitMQEventPublisher
  stripe-payment-service.ts        # export class StripePaymentService
```

**Prefijos comunes:**

- `postgres-`, `mongo-`, `mysql-`, `redis-` — Databases
- `jose-`, `jsonwebtoken-` — JWT libraries
- `argon2-`, `bcrypt-` — Password hashing
- `rabbitmq-`, `kafka-`, `redis-` — Message brokers
- `nodemailer-`, `sendgrid-` — Email services
- `stripe-`, `paypal-`, `mercadopago-` — Payment gateways

---

#### **4. Use Cases (Application Layer)**

```
application/use-cases/
  register-user.ts           # export class RegisterUserUseCase
  login-user.ts              # export class LoginUserUseCase
  create-order.ts            # export class CreateOrderUseCase
  get-order-by-id.ts         # export class GetOrderByIdUseCase
  update-product.ts          # export class UpdateProductUseCase
  delete-user.ts             # export class DeleteUserUseCase
```

**Regla:** Verbo + sustantivo (describe acción)

- `register-user` (no `user-register`)
- `create-order` (no `order-create`)
- `get-order-by-id` (no `order-get-by-id`)

---

#### **5. DTOs (Data Transfer Objects)**

**CON sufijo `-dto`** (para claridad)

```
application/dtos/
  register-user-dto.ts       # export class RegisterUserDto
  login-user-dto.ts          # export class LoginUserDto
  create-order-dto.ts        # export class CreateOrderDto
  update-product-dto.ts      # export class UpdateProductDto
  user-response-dto.ts       # export class UserResponseDto
  order-response-dto.ts      # export class OrderResponseDto
```

**Rationale:** DTOs son transitorios y necesitan identificarse fácilmente

---

#### **6. Models (Database/ORM Layer)**

**CON sufijo `-model`** (para distinguir de entities)

```
infrastructure/database/models/
  user-model.ts              # export class UserModel (Sequelize)
  order-model.ts             # export class OrderModel
  product-model.ts           # export class ProductModel
  refresh-token-model.ts     # export class RefreshTokenModel
```

**Diferencia Entity vs Model:**

- **Entity** (domain): Business logic, domain rules
- **Model** (infrastructure): ORM/database mapping

---

#### **7. Controllers (HTTP Layer)**

```
infrastructure/http/controllers/
  auth-controller.ts         # export class AuthController
  user-controller.ts         # export class UserController
  order-controller.ts        # export class OrderController
  product-controller.ts      # export class ProductController
```

---

#### **8. Routes**

```
infrastructure/http/routes/
  auth-routes.ts             # export function createAuthRoutes()
  user-routes.ts             # export function createUserRoutes()
  order-routes.ts            # export function createOrderRoutes()
  index.ts                   # Aggregates all routes
```

---

#### **9. Middleware**

```
infrastructure/http/middleware/
  correlation-id.ts          # export const correlationIdMiddleware
  error-handler.ts           # export const errorHandler
  request-logger.ts          # export const requestLoggerMiddleware
  validate-request.ts        # export function validateRequest
  rate-limiter.ts            # export const rateLimiterMiddleware
  authenticate.ts            # export const authenticateMiddleware
```

---

#### **10. Schemas (Validation)**

```
infrastructure/http/schemas/
  auth-schemas.ts            # export const registerSchema, loginSchema
  order-schemas.ts           # export const createOrderSchema
  product-schemas.ts         # export const updateProductSchema
```

---

#### **11. Config**

```
infrastructure/config/
  database.ts                # export const databaseConfig
  jwt.ts                     # export const jwtConfig
  rabbitmq.ts                # export const rabbitmqConfig
  index.ts                   # export const config (aggregated)
```

---

#### **12. Tests**

```
__tests__/
  unit/
    use-cases/
      register-user.test.ts         # Unit test
      create-order.test.ts
    services/
      jwt-service.test.ts
      password-hashing-service.test.ts
  integration/
    repositories/
      user-repository.integration.test.ts
  e2e/
    auth.e2e.test.ts                # End-to-end test
    orders.e2e.test.ts
```

**Sufijos:**

- `.test.ts` — Unit/Integration tests (Jest default)
- `.spec.ts` — Alternative (Angular style)
- `.e2e.test.ts` — End-to-end tests
- `.integration.test.ts` — Integration tests (explicit)

---

## 📂 Carpetas (Folders)

### **Regla: kebab-case**

```
use-cases/              ✅
domain-services/        ✅
value-objects/          ✅
database/               ✅
http/                   ✅
middleware/             ✅
__tests__/              ✅
```

### **Estructura Completa del Proyecto**

```
apps/
├── auth-service/
│   └── src/
│       ├── domain/
│       │   ├── entities/
│       │   ├── repositories/
│       │   └── value-objects/
│       ├── application/
│       │   ├── use-cases/
│       │   ├── services/
│       │   └── dtos/
│       ├── infrastructure/
│       │   ├── database/
│       │   │   ├── models/
│       │   │   └── repositories/
│       │   ├── services/
│       │   ├── messaging/
│       │   ├── http/
│       │   │   ├── controllers/
│       │   │   ├── routes/
│       │   │   ├── middleware/
│       │   │   └── schemas/
│       │   ├── config/
│       │   └── logger/
│       ├── __tests__/
│       │   ├── unit/
│       │   ├── integration/
│       │   └── e2e/
│       └── index.ts
│
├── product-service/
├── order-service/
├── api-gateway/
└── notification-service/

packages/
├── common/
│   └── src/
│       ├── errors/
│       ├── types/
│       └── utils/
├── logger/
├── database/
└── messaging/
```

---

## 🎨 Sufijos y Prefijos (Cheat Sheet)

### **Prefijos (Implementations)**

| Prefijo       | Uso                       | Ejemplo                       |
| ------------- | ------------------------- | ----------------------------- |
| `postgres-`   | PostgreSQL implementation | `postgres-user-repository.ts` |
| `mongo-`      | MongoDB implementation    | `mongo-product-repository.ts` |
| `redis-`      | Redis implementation      | `redis-cache-repository.ts`   |
| `mysql-`      | MySQL implementation      | `mysql-order-repository.ts`   |
| `jose-`       | JOSE library (JWT)        | `jose-jwt-service.ts`         |
| `argon2-`     | Argon2 library            | `argon2-password-service.ts`  |
| `bcrypt-`     | Bcrypt library            | `bcrypt-password-service.ts`  |
| `rabbitmq-`   | RabbitMQ                  | `rabbitmq-event-publisher.ts` |
| `kafka-`      | Apache Kafka              | `kafka-event-publisher.ts`    |
| `nodemailer-` | Nodemailer                | `nodemailer-email-service.ts` |
| `stripe-`     | Stripe payment            | `stripe-payment-service.ts`   |

### **Sufijos**

| Sufijo              | Uso                     | Ejemplo                                   |
| ------------------- | ----------------------- | ----------------------------------------- |
| `-dto`              | Data Transfer Object    | `register-user-dto.ts`                    |
| `-model`            | Database model          | `user-model.ts`                           |
| `-repository`       | Repository pattern      | `user-repository.ts`                      |
| `-service`          | Service layer           | `jwt-service.ts`                          |
| `-controller`       | HTTP controller         | `auth-controller.ts`                      |
| `-routes`           | Route definitions       | `auth-routes.ts`                          |
| `-middleware`       | HTTP middleware         | `correlation-id-middleware.ts` (opcional) |
| `-schemas`          | Validation schemas      | `auth-schemas.ts`                         |
| `.test`             | Test file               | `register-user.test.ts`                   |
| `.spec`             | Test file (alternative) | `register-user.spec.ts`                   |
| `.e2e.test`         | E2E test                | `auth.e2e.test.ts`                        |
| `.integration.test` | Integration test        | `user-repository.integration.test.ts`     |

---

## 💡 Ejemplos Prácticos

### **Auth Service (Completo)**

```
apps/auth-service/src/
├── domain/
│   ├── entities/
│   │   ├── user.ts                         # export class User
│   │   └── refresh-token.ts                # export class RefreshToken
│   └── repositories/
│       ├── user-repository.ts              # export interface UserRepository
│       └── refresh-token-repository.ts     # export interface RefreshTokenRepository
│
├── application/
│   ├── use-cases/
│   │   ├── register-user.ts                # export class RegisterUserUseCase
│   │   ├── login-user.ts                   # export class LoginUserUseCase
│   │   ├── refresh-token.ts                # export class RefreshTokenUseCase
│   │   ├── logout-user.ts                  # export class LogoutUserUseCase
│   │   └── get-current-user.ts             # export class GetCurrentUserUseCase
│   ├── services/
│   │   ├── jwt-service.ts                  # export interface JwtService
│   │   ├── password-hashing-service.ts     # export interface PasswordHashingService
│   │   └── event-publisher.ts              # export interface EventPublisher
│   └── dtos/
│       ├── register-user-dto.ts            # export class RegisterUserDto
│       └── login-user-dto.ts               # export class LoginUserDto
│
├── infrastructure/
│   ├── database/
│   │   ├── models/
│   │   │   ├── user-model.ts               # export class UserModel
│   │   │   └── refresh-token-model.ts      # export class RefreshTokenModel
│   │   ├── repositories/
│   │   │   ├── postgres-user-repository.ts       # export class PostgresUserRepository
│   │   │   └── postgres-refresh-token-repository.ts
│   │   └── index.ts                        # Sequelize connection
│   ├── services/
│   │   ├── jose-jwt-service.ts             # export class JoseJwtService
│   │   ├── argon2-password-service.ts      # export class Argon2PasswordService
│   │   └── rabbitmq-event-publisher.ts     # export class RabbitMQEventPublisher
│   ├── http/
│   │   ├── controllers/
│   │   │   └── auth-controller.ts          # export class AuthController
│   │   ├── routes/
│   │   │   └── auth-routes.ts              # export function createAuthRoutes
│   │   ├── middleware/
│   │   │   ├── correlation-id.ts           # export const correlationIdMiddleware
│   │   │   ├── error-handler.ts            # export const errorHandler
│   │   │   ├── request-logger.ts           # export const requestLoggerMiddleware
│   │   │   └── validate-request.ts         # export function validateRequest
│   │   └── schemas/
│   │       └── auth-schemas.ts             # Joi validation schemas
│   ├── config/
│   │   └── index.ts                        # export const config
│   └── logger/
│       └── index.ts                        # export const logger
│
└── __tests__/
    ├── unit/
    │   ├── use-cases/
    │   │   ├── register-user.test.ts
    │   │   └── login-user.test.ts
    │   └── services/
    │       ├── jwt-service.test.ts
    │       └── password-hashing-service.test.ts
    └── e2e/
        └── auth.e2e.test.ts
```

---

## 🔄 Migración desde Código Existente

### **Cambios Requeridos en Auth Service**

```bash
# Domain Layer
IUserRepository.ts                → user-repository.ts
IRefreshTokenRepository.ts        → refresh-token-repository.ts
User.ts                           → user.ts
RefreshToken.ts                   → refresh-token.ts

# Application Layer
IJwtService.ts                    → jwt-service.ts
IPasswordHashingService.ts        → password-hashing-service.ts
IEventPublisher.ts                → event-publisher.ts
RegisterUserUseCase.ts            → register-user.ts
LoginUserUseCase.ts               → login-user.ts
RefreshTokenUseCase.ts            → refresh-token.ts
LogoutUserUseCase.ts              → logout-user.ts
GetCurrentUserUseCase.ts          → get-current-user.ts
register.dto.ts                   → register-user-dto.ts
login.dto.ts                      → login-user-dto.ts

# Infrastructure Layer
JwtService.ts                     → jose-jwt-service.ts
PasswordHashingService.ts         → argon2-password-service.ts
RabbitMQEventPublisher.ts         → rabbitmq-event-publisher.ts
UserRepository.ts                 → postgres-user-repository.ts
RefreshTokenRepository.ts         → postgres-refresh-token-repository.ts
UserModel.ts                      → user-model.ts
RefreshTokenModel.ts              → refresh-token-model.ts
AuthController.ts                 → auth-controller.ts
routes.ts                         → auth-routes.ts
schemas.ts                        → auth-schemas.ts
```

### **Cambios en Clases e Interfaces**

```typescript
// ANTES
export interface IUserRepository { ... }
export class UserRepository implements IUserRepository { ... }

// DESPUÉS
export interface UserRepository { ... }
export class PostgresUserRepository implements UserRepository { ... }
```

---

## ✅ Checklist de Implementación

### **Para Nuevos Archivos:**

- [ ] Usar kebab-case para nombre de archivo
- [ ] Interface sin prefijo "I"
- [ ] Implementation con prefijo de tecnología
- [ ] DTOs con sufijo `-dto`
- [ ] Models con sufijo `-model`
- [ ] Tests con sufijo `.test.ts` o `.e2e.test.ts`

### **Para Código Existente:**

- [ ] Renombrar archivos a kebab-case
- [ ] Eliminar prefijo "I" de interfaces
- [ ] Agregar prefijo de tecnología a implementations
- [ ] Actualizar todos los imports
- [ ] Ejecutar tests para validar
- [ ] Actualizar documentación

---

## 📚 Referencias

1. [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
2. [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)
3. [NestJS Naming Conventions](https://docs.nestjs.com/)
4. [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
5. [Clean Architecture by Uncle Bob](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)

---

**Última actualización:** 26 de diciembre de 2025
