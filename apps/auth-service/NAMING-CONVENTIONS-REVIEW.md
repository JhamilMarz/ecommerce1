# 🔍 Naming Conventions Review — Auth Service

**Fecha:** 26 de diciembre de 2025
**Objetivo:** Revisar convenciones de nombres contra estándares documentados en `/architecture/11-dev-practices/Coding-Standards.md`

---

## 📊 Análisis del Estado Actual

### ✅ **CUMPLE** con Convenciones

#### 1. **Entities (Domain Layer)**

```
✅ User.ts                    // PascalCase, noun
✅ RefreshToken.ts           // PascalCase, noun
```

**Standard:** ✅ Cumple con "PascalCase + nouns" para clases

---

#### 2. **Use Cases (Application Layer)**

```
✅ RegisterUserUseCase.ts    // PascalCase, descriptive
✅ LoginUserUseCase.ts
✅ RefreshTokenUseCase.ts
✅ LogoutUserUseCase.ts
✅ GetCurrentUserUseCase.ts
```

**Standard:** ✅ Cumple con "PascalCase" para clases

---

#### 3. **Services (Infrastructure Layer)**

```
✅ JwtService.ts             // PascalCase, noun
✅ PasswordHashingService.ts // PascalCase, noun
✅ RabbitMQEventPublisher.ts // PascalCase, noun
```

**Standard:** ✅ Cumple con "PascalCase" para clases

---

#### 4. **Controllers (Infrastructure Layer)**

```
✅ AuthController.ts         // PascalCase, noun
```

**Standard:** ✅ Cumple con "PascalCase" para clases

---

#### 5. **Models (Infrastructure/Database Layer)**

```
✅ UserModel.ts              // PascalCase, noun
✅ RefreshTokenModel.ts      // PascalCase, noun
```

**Standard:** ✅ Cumple con "PascalCase" para clases

---

#### 6. **Repositories (Infrastructure Layer)**

```
✅ UserRepository.ts         // PascalCase, noun
✅ RefreshTokenRepository.ts // PascalCase, noun
```

**Standard:** ✅ Cumple con "PascalCase" para clases

---

#### 7. **Middleware**

```
✅ correlation-id.ts         // kebab-case
✅ error-handler.ts          // kebab-case
✅ request-logger.ts         // kebab-case
✅ validate-request.ts       // kebab-case
```

**Standard:** ✅ Cumple con "kebab-case para archivos"

---

#### 8. **DTOs**

```
✅ register.dto.ts           // kebab-case + suffix
✅ login.dto.ts              // kebab-case + suffix
```

**Standard:** ✅ Cumple con "kebab-case" para archivos

---

### ⚠️ **INCONSISTENCIAS DETECTADAS**

#### 1. **Interfaces con Prefijo "I"**

**Estado Actual:**

```
⚠️ IJwtService.ts            // Prefijo "I" (C# style)
⚠️ IPasswordHashingService.ts // Prefijo "I" (C# style)
⚠️ IEventPublisher.ts        // Prefijo "I" (C# style)
⚠️ IUserRepository.ts        // Prefijo "I" (C# style)
⚠️ IRefreshTokenRepository.ts // Prefijo "I" (C# style)
```

**Standard Documentado:**

```typescript
// Option 1: No prefix (preferred)
interface User {
  id: string
  email: string
}

// Option 2: 'I' prefix (C# style, less common in TypeScript)
interface IUser {
  id: string
  email: string
}
```

**Problema:**

- El documento dice **"Option 1: No prefix (preferred)"**
- TypeScript/Node.js community prefiere **SIN prefijo "I"**
- El prefijo "I" es estilo C#, menos común en TS

**Impacto:**

- 🟡 **Medio** — No rompe funcionalidad, pero no es idiomático TypeScript
- Proyecto pequeño: No crítico
- Proyecto a gran escala: Debe corregirse para consistencia

---

#### 2. **Nombres de Archivos de Interfaces**

**Estado Actual:**

```
⚠️ IUserRepository.ts        // PascalCase con "I"
⚠️ IJwtService.ts            // PascalCase con "I"
```

**Standard Documentado:**

```
✅ user-repository.ts         // kebab-case preferred
✅ jwt-service.ts             // kebab-case preferred
```

**Problema:**

- Archivos deberían ser **kebab-case** según estándar
- Solo componentes React usan PascalCase en archivos

**Impacto:**

- 🟡 **Medio** — Inconsistencia con estándar de archivos

---

#### 3. **Errores Personalizados**

**Estado Actual:**

```
✅ unauthorized.error.ts     // kebab-case + suffix
✅ conflict.error.ts         // kebab-case + suffix
```

**Standard:** ✅ Cumple con "kebab-case"

Pero el contenido debería verificarse:

```typescript
// Debería ser:
export class UnauthorizedError extends Error {} // PascalCase
```

---

## 🎯 Recomendaciones para Sistema a Gran Escala

### 1. **Interfaces: Eliminar Prefijo "I"**

**Razón:**

- TypeScript tiene sistema de tipos estructural, no nominal
- Community standard es SIN prefijo
- Más limpio y moderno
- Usado por: NestJS, TypeORM, Prisma, Apollo GraphQL

**Cambios Sugeridos:**

```typescript
// ❌ ANTES (C# style)
interface IUserRepository {
  findById(id: string): Promise<User | null>
}

class UserRepository implements IUserRepository {
  // ...
}

// ✅ DESPUÉS (TypeScript idiomático)
interface UserRepository {
  findById(id: string): Promise<User | null>
}

class PostgresUserRepository implements UserRepository {
  // ...
}
```

**Estrategia de Nombres:**

- **Interface:** Nombre genérico (`UserRepository`, `JwtService`)
- **Implementation:** Nombre específico con tecnología (`PostgresUserRepository`, `JoseJwtService`)

**Ejemplo Real:**

```typescript
// Domain Layer (interfaces)
interface UserRepository { ... }
interface PaymentGateway { ... }
interface MessageBroker { ... }

// Infrastructure Layer (implementations)
class PostgresUserRepository implements UserRepository { ... }
class StripePaymentGateway implements PaymentGateway { ... }
class RabbitMQMessageBroker implements MessageBroker { ... }
```

---

### 2. **Nombres de Archivos: kebab-case**

**Cambios Sugeridos:**

```bash
# Domain Layer
src/domain/repositories/
  user-repository.ts              # ✅ interface UserRepository
  refresh-token-repository.ts     # ✅ interface RefreshTokenRepository

# Application Layer
src/application/interfaces/
  jwt-service.ts                  # ✅ interface JwtService
  password-hashing-service.ts     # ✅ interface PasswordHashingService
  event-publisher.ts              # ✅ interface EventPublisher

# Infrastructure Layer
src/infrastructure/database/repositories/
  postgres-user-repository.ts     # ✅ class PostgresUserRepository
  postgres-refresh-token-repository.ts

src/infrastructure/services/
  jose-jwt-service.ts             # ✅ class JoseJwtService (o JwtServiceImpl)
  argon2-password-service.ts      # ✅ class Argon2PasswordService
  rabbitmq-event-publisher.ts     # ✅ class RabbitMQEventPublisher
```

---

### 3. **Estructura de Carpetas Recomendada (Clean Architecture)**

```
src/
├── domain/
│   ├── entities/
│   │   ├── user.ts                    # ✅ export class User
│   │   └── refresh-token.ts           # ✅ export class RefreshToken
│   ├── repositories/
│   │   ├── user-repository.ts         # ✅ export interface UserRepository
│   │   └── refresh-token-repository.ts
│   └── value-objects/                 # (opcional, para DDD estricto)
│       ├── email.ts
│       └── password.ts
│
├── application/
│   ├── use-cases/
│   │   ├── register-user.use-case.ts  # ✅ export class RegisterUserUseCase
│   │   ├── login-user.use-case.ts
│   │   ├── refresh-token.use-case.ts
│   │   ├── logout-user.use-case.ts
│   │   └── get-current-user.use-case.ts
│   ├── services/                      # Application services (interfaces)
│   │   ├── jwt-service.ts             # ✅ export interface JwtService
│   │   ├── password-hashing-service.ts
│   │   └── event-publisher.ts
│   └── dtos/
│       ├── register-user.dto.ts
│       ├── login-user.dto.ts
│       └── user-response.dto.ts
│
├── infrastructure/
│   ├── database/
│   │   ├── models/
│   │   │   ├── user.model.ts          # ✅ export class UserModel
│   │   │   └── refresh-token.model.ts
│   │   ├── repositories/
│   │   │   ├── postgres-user-repository.ts    # ✅ implements UserRepository
│   │   │   └── postgres-refresh-token-repository.ts
│   │   └── index.ts                   # Sequelize connection
│   ├── services/
│   │   ├── jose-jwt-service.ts        # ✅ implements JwtService
│   │   ├── argon2-password-service.ts # ✅ implements PasswordHashingService
│   │   └── rabbitmq-event-publisher.ts # ✅ implements EventPublisher
│   ├── http/
│   │   ├── controllers/
│   │   │   └── auth.controller.ts     # ✅ export class AuthController
│   │   ├── routes/
│   │   │   └── auth.routes.ts         # ✅ export function createAuthRoutes()
│   │   └── schemas/
│   │       └── auth.schemas.ts        # ✅ Joi schemas
│   ├── middleware/
│   │   ├── correlation-id.middleware.ts
│   │   ├── error-handler.middleware.ts
│   │   ├── request-logger.middleware.ts
│   │   └── validate-request.middleware.ts
│   └── config/
│       └── index.ts                   # Config object
│
└── __tests__/
    ├── unit/
    │   ├── use-cases/
    │   │   ├── register-user.use-case.test.ts
    │   │   └── login-user.use-case.test.ts
    │   └── services/
    │       ├── jwt-service.test.ts
    │       └── password-hashing-service.test.ts
    └── e2e/
        └── auth.e2e.test.ts
```

---

### 4. **Convenciones de Implementaciones (Implementations)**

**Estrategias de Naming:**

#### Opción A: Prefijo con Tecnología (Recomendado)

```typescript
// Interface
interface UserRepository { ... }

// Implementations
class PostgresUserRepository implements UserRepository { ... }
class MongoUserRepository implements UserRepository { ... }
class InMemoryUserRepository implements UserRepository { ... }
```

#### Opción B: Sufijo "Impl" (Genérico)

```typescript
// Interface
interface UserRepository { ... }

// Implementation
class UserRepositoryImpl implements UserRepository { ... }
```

#### Opción C: Sin Sufijo (Solo si 1 implementación)

```typescript
// Si SOLO hay una implementación y no planeas más:
class UserRepository { ... }
```

**Recomendación:** **Opción A** para proyectos a gran escala

- Más descriptivo
- Permite múltiples implementaciones
- Fácil identificar tecnología

---

### 5. **Comparación con Frameworks Enterprise**

#### **NestJS** (más popular Node.js enterprise)

```typescript
// ✅ SIN prefijo "I"
export interface UserService {
  findById(id: string): Promise<User>
}

@Injectable()
export class UserServiceImpl implements UserService {
  // ...
}

// Archivos
user.service.ts // interface
user.service.impl.ts // implementation
```

#### **TypeORM** (ORM popular)

```typescript
// ✅ SIN prefijo "I"
export interface Repository<T> {
  save(entity: T): Promise<T>
}

export class PostgresRepository<T> implements Repository<T> {
  // ...
}
```

#### **Prisma**

```typescript
// ✅ SIN prefijo "I"
export interface UserRepository {
  create(data: CreateUserData): Promise<User>
}
```

**Conclusión:** El ecosistema TypeScript/Node.js moderno **NO usa prefijo "I"**

---

## 📋 Plan de Refactorización Sugerido

### **Fase 1: Interfaces (Crítico para escalabilidad)**

```bash
# 1. Renombrar archivos (kebab-case)
mv IUserRepository.ts → user-repository.ts
mv IJwtService.ts → jwt-service.ts
mv IPasswordHashingService.ts → password-hashing-service.ts
mv IEventPublisher.ts → event-publisher.ts
mv IRefreshTokenRepository.ts → refresh-token-repository.ts

# 2. Renombrar interfaces (quitar "I")
export interface IUserRepository → export interface UserRepository
export interface IJwtService → export interface JwtService
# ... etc
```

### **Fase 2: Implementations (Agregar especificidad)**

```bash
# 3. Renombrar implementations
UserRepository.ts → PostgresUserRepository.ts
  export class UserRepository → export class PostgresUserRepository

RefreshTokenRepository.ts → PostgresRefreshTokenRepository.ts
  export class RefreshTokenRepository → export class PostgresRefreshTokenRepository

JwtService.ts → JoseJwtService.ts  # (o JwtServiceImpl si prefieres genérico)
  export class JwtService → export class JoseJwtService

PasswordHashingService.ts → Argon2PasswordService.ts
  export class PasswordHashingService → export class Argon2PasswordService
```

### **Fase 3: Imports & DI Container**

```typescript
// Actualizar imports en index.ts
import { UserRepository } from './domain/repositories/user-repository'
import { PostgresUserRepository } from './infrastructure/database/repositories/postgres-user-repository'
import { JwtService } from './application/services/jwt-service'
import { JoseJwtService } from './infrastructure/services/jose-jwt-service'

// DI Container
const userRepository: UserRepository = new PostgresUserRepository()
const jwtService: JwtService = new JoseJwtService()
```

---

## 🎯 Convenciones Completas para Proyecto a Gran Escala

### **1. Archivos**

```
kebab-case.ts               # General rule
kebab-case.entity.ts        # Domain entities
kebab-case.use-case.ts      # Use cases
kebab-case.repository.ts    # Repositories (interfaces)
kebab-case.service.ts       # Services (interfaces)
kebab-case.dto.ts           # DTOs
kebab-case.model.ts         # Database models
kebab-case.controller.ts    # Controllers
kebab-case.middleware.ts    # Middleware
kebab-case.test.ts          # Tests
kebab-case.e2e.test.ts      # E2E tests
```

### **2. Clases**

```typescript
PascalCase // Classes
User // Entities
RegisterUserUseCase // Use Cases
PostgresUserRepository // Implementations
AuthController // Controllers
UserModel // Database models
```

### **3. Interfaces**

```typescript
PascalCase // NO "I" prefix
UserRepository // Repository interface
JwtService // Service interface
PaymentGateway // Gateway interface
```

### **4. Functions**

```typescript
camelCase                   // Functions
calculateTotal()
validateEmail()
async fetchUserById()
createAuthRoutes()          // Factory functions
```

### **5. Variables & Constants**

```typescript
camelCase // Variables
const userName = 'John'
const orderTotal = 100

SCREAMING_SNAKE_CASE // Constants
const MAX_RETRY_ATTEMPTS = 3
const API_BASE_URL = 'https://api.com'
```

### **6. Folders**

```
kebab-case/                 # All folders
use-cases/
repositories/
database/
middleware/
```

---

## ⚙️ Configuración ESLint Recomendada

```javascript
// .eslintrc.js
module.exports = {
  rules: {
    // Naming conventions
    '@typescript-eslint/naming-convention': [
      'error',
      // Interfaces: PascalCase, NO "I" prefix
      {
        selector: 'interface',
        format: ['PascalCase'],
        custom: {
          regex: '^I[A-Z]',
          match: false, // Prohibit "I" prefix
        },
      },
      // Classes: PascalCase
      {
        selector: 'class',
        format: ['PascalCase'],
      },
      // Variables: camelCase
      {
        selector: 'variable',
        format: ['camelCase', 'UPPER_CASE'],
      },
      // Functions: camelCase
      {
        selector: 'function',
        format: ['camelCase'],
      },
      // Type aliases: PascalCase
      {
        selector: 'typeAlias',
        format: ['PascalCase'],
      },
      // Enums: PascalCase
      {
        selector: 'enum',
        format: ['PascalCase'],
      },
    ],

    // File naming (requiere plugin)
    'unicorn/filename-case': [
      'error',
      {
        case: 'kebabCase',
        ignore: ['\\.tsx$'], // Allow PascalCase for React components
      },
    ],
  },
}
```

---

## 🚀 Beneficios de Seguir Convenciones

### **1. Consistencia**

- Código predecible
- Fácil navegación
- Menos "cognitive load"

### **2. Colaboración**

- Onboarding más rápido
- Code reviews más fáciles
- Menos debates sobre estilo

### **3. Tooling**

- Mejor autocomplete
- Mejor refactoring automático
- Menos false positives en linters

### **4. Escalabilidad**

- Estructura clara para nuevos features
- Fácil encontrar código relacionado
- Menos colisiones de nombres

### **5. Community Alignment**

- Código familiar para devs externos
- Fácil integración con librerías
- Mejor para open source

---

## ✅ Resumen Ejecutivo

### **Estado Actual: 7/10**

- ✅ PascalCase en clases (correcto)
- ✅ kebab-case en middleware (correcto)
- ✅ Estructura Clean Architecture (correcto)
- ⚠️ Prefijo "I" en interfaces (C# style, no idiomático TS)
- ⚠️ Archivos de interfaces en PascalCase (debería ser kebab-case)
- ⚠️ Implementations sin especificar tecnología (Postgres, Argon2, etc.)

### **Cambios Recomendados (Prioridad):**

1. 🔴 **Alta:** Eliminar prefijo "I" de interfaces
2. 🟡 **Media:** Renombrar archivos a kebab-case
3. 🟡 **Media:** Agregar especificidad a implementations (Postgres, Argon2, etc.)
4. 🟢 **Baja:** Reorganizar carpetas (opcional)

### **Impacto:**

- Pequeño proyecto (1-2 devs): **Opcional**
- Proyecto mediano (3-10 devs): **Recomendado**
- Proyecto grande (10+ devs): **Crítico**

---

## 📚 Referencias

1. [TypeScript Handbook - Interfaces](https://www.typescriptlang.org/docs/handbook/interfaces.html)
2. [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)
3. [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
4. [NestJS Style Guide](https://docs.nestjs.com/)
5. [Clean Architecture in TypeScript](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)

---

**Última actualización:** 26 de diciembre de 2025
