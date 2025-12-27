# Coding Standards & Guidelines

## 📋 Propósito

Define los estándares de código, convenciones de naming, y mejores prácticas para mantener un codebase consistente, legible y mantenible.

---

## 🎯 Principios Fundamentales

### 1. **KISS (Keep It Simple, Stupid)**

- Prefer soluciones simples sobre complejas
- Si parece complicado, probablemente lo es
- Código simple es código mantenible

### 2. **DRY (Don't Repeat Yourself)**

- No duplicar código
- Extraer lógica común a funciones reutilizables
- Usar abstracciones apropiadas

### 3. **YAGNI (You Aren't Gonna Need It)**

- No implementar features "por si acaso"
- Solo código que necesitas ahora
- Evitar over-engineering

### 4. **SOLID Principles**

- **S**ingle Responsibility: Una clase/función hace una cosa
- **O**pen/Closed: Abierto a extensión, cerrado a modificación
- **L**iskov Substitution: Subclases sustituyen a clases base
- **I**nterface Segregation: Interfaces pequeñas y específicas
- **D**ependency Inversion: Depender de abstracciones, no implementaciones

---

## 📝 Naming Conventions

### Variables & Constants

**camelCase** para variables:

```typescript
// ✅ Good
const userName = 'John Doe'
const orderTotal = 100.5
const isAuthenticated = true

// ❌ Bad
const user_name = 'John Doe' // snake_case (Python style)
const UserName = 'John Doe' // PascalCase (for classes)
const ORDERTOTAL = 100.5 // SCREAMING_SNAKE_CASE (for constants)
```

**SCREAMING_SNAKE_CASE** para constantes globales:

```typescript
// ✅ Good
const MAX_RETRY_ATTEMPTS = 3
const API_BASE_URL = 'https://api.example.com'
const DEFAULT_PAGE_SIZE = 20

// ❌ Bad
const maxRetryAttempts = 3 // Looks like variable
```

**Descriptive names** (no abbreviations):

```typescript
// ✅ Good
const customerOrders = await getOrders(customerId)
const totalPrice = calculateTotal(items)

// ❌ Bad
const co = await getOrders(cId) // What is 'co'?
const tp = calculateTotal(i) // What is 'tp'?
```

---

### Functions & Methods

**camelCase** + **verbs**:

```typescript
// ✅ Good
function calculateOrderTotal(items: OrderItem[]): number {}
function validateEmail(email: string): boolean {}
async function fetchUserById(id: string): Promise<User> {}

// ❌ Bad
function order_total(items) {} // snake_case
function Total(items) {} // PascalCase
function items(items) {} // Not a verb
```

**Common verb prefixes**:

- `get` - Retrieve data (sync)
- `fetch` - Retrieve data (async)
- `set` - Set value
- `calculate` - Compute value
- `validate` - Check validity
- `create` - Create new entity
- `update` - Modify existing entity
- `delete` - Remove entity
- `is/has/should` - Boolean checks

```typescript
getUser()
fetchOrders()
setUserRole()
calculateTax()
validatePassword()
createOrder()
updateInventory()
deleteProduct()
isAuthenticated()
hasPermission()
```

---

### Classes & Interfaces

**PascalCase** + **nouns**:

```typescript
// ✅ Good
class OrderService {}
class UserRepository {}
interface PaymentGateway {}
type OrderStatus = 'pending' | 'completed'

// ❌ Bad
class orderService {} // camelCase
class Order_Service {} // snake_case
interface paymentGateway {} // camelCase
```

**Interface naming**:

```typescript
// ✅ STANDARD: No prefix (TypeScript community standard)
interface User {
  id: string
  email: string
}

interface UserRepository {
  findById(id: string): Promise<User | null>
}

// ❌ AVOID: 'I' prefix (C# style, not idiomatic in TypeScript)
interface IUser {
  id: string
  email: string
}
```

**Rationale:**

- TypeScript community prefers no prefix
- Used by: NestJS, TypeORM, Prisma, tRPC, Apollo GraphQL
- Implementations use technology prefix instead: `PostgresUserRepository`

---

### Files & Folders

#### **Files: kebab-case (Node.js/TypeScript Standard)**

**General rule:** All files use `kebab-case` (lowercase with hyphens)

```
user-repository.ts           // ✅ Interface
postgres-user-repository.ts  // ✅ Implementation (tech prefix)
jwt-service.ts               // ✅ Service interface
jose-jwt-service.ts          // ✅ Service implementation
auth-controller.ts           // ✅ Controller
create-order-dto.ts          // ✅ DTO (with -dto suffix)
user.ts                      // ✅ Entity (simple name, folder gives context)
```

**Exceptions:**

- **React/Vue components:** Use `PascalCase.tsx`
- **Type declaration files:** Use `kebab-case.d.ts`

```tsx
// React components (exception)
OrderSummary.tsx
UserProfile.tsx
ProductCard.tsx
```

#### **Naming Strategy: Balanced Approach**

**Interfaces & Entities:** Simple names (folder provides context)

```
domain/entities/
  user.ts                    // export class User
  refresh-token.ts           // export class RefreshToken

domain/repositories/
  user-repository.ts         // export interface UserRepository
  order-repository.ts        // export interface OrderRepository
```

**Implementations:** Technology prefix for clarity

```
infrastructure/database/repositories/
  postgres-user-repository.ts    // export class PostgresUserRepository
  mongo-order-repository.ts      // export class MongoOrderRepository

infrastructure/services/
  jose-jwt-service.ts            // export class JoseJwtService
  argon2-password-service.ts     // export class Argon2PasswordService
  rabbitmq-event-publisher.ts    // export class RabbitMQEventPublisher
```

**DTOs:** Use `-dto` suffix for clarity

```
application/dtos/
  create-user-dto.ts         // export class CreateUserDto
  update-order-dto.ts        // export class UpdateOrderDto
  user-response-dto.ts       // export class UserResponseDto
```

#### **Folder Structure (Clean Architecture)**

```
src/
├── domain/
│   ├── entities/
│   │   ├── user.ts                      # Entity class
│   │   ├── order.ts
│   │   └── order-item.ts
│   ├── repositories/
│   │   ├── user-repository.ts           # Repository interface
│   │   └── order-repository.ts
│   └── value-objects/                   # (Optional for DDD)
│       ├── email.ts
│       └── money.ts
│
├── application/
│   ├── use-cases/
│   │   ├── register-user.ts             # Use case class
│   │   ├── create-order.ts
│   │   └── get-user-by-id.ts
│   ├── services/
│   │   ├── jwt-service.ts               # Service interface
│   │   ├── password-hashing-service.ts
│   │   └── event-publisher.ts
│   └── dtos/
│       ├── register-user-dto.ts
│       ├── create-order-dto.ts
│       └── user-response-dto.ts
│
├── infrastructure/
│   ├── database/
│   │   ├── models/
│   │   │   ├── user-model.ts            # ORM model
│   │   │   └── order-model.ts
│   │   └── repositories/
│   │       ├── postgres-user-repository.ts
│   │       └── postgres-order-repository.ts
│   ├── services/
│   │   ├── jose-jwt-service.ts          # Service implementation
│   │   ├── argon2-password-service.ts
│   │   └── rabbitmq-event-publisher.ts
│   ├── http/
│   │   ├── controllers/
│   │   │   ├── auth-controller.ts
│   │   │   └── order-controller.ts
│   │   ├── routes/
│   │   │   ├── auth-routes.ts
│   │   │   └── order-routes.ts
│   │   ├── middleware/
│   │   │   ├── correlation-id.ts
│   │   │   ├── error-handler.ts
│   │   │   ├── request-logger.ts
│   │   │   └── validate-request.ts
│   │   └── schemas/
│   │       ├── auth-schemas.ts          # Validation schemas
│   │       └── order-schemas.ts
│   └── config/
│       ├── database.ts
│       └── index.ts
│
└── __tests__/
    ├── unit/
    │   ├── use-cases/
    │   │   ├── register-user.test.ts
    │   │   └── create-order.test.ts
    │   └── services/
    │       ├── jwt-service.test.ts
    │       └── password-hashing-service.test.ts
    └── e2e/
        ├── auth.e2e.test.ts
        └── orders.e2e.test.ts
```

#### **Folders: kebab-case**

```
use-cases/              ✅
domain-services/        ✅
value-objects/          ✅
__tests__/              ✅ (double underscore prefix for special folders)
```

#### **Special Prefixes/Suffixes**

**Prefixes:**

- `postgres-`, `mongo-`, `redis-` — Database implementations
- `rabbitmq-`, `kafka-` — Message broker implementations
- `stripe-`, `paypal-` — Payment gateway implementations

**Suffixes:**

- `-dto` — Data Transfer Objects
- `-model` — ORM/Database models
- `-repository` — Repository pattern
- `-service` — Service layer
- `-controller` — HTTP controllers
- `-routes` — Route definitions
- `-middleware` — Express/HTTP middleware
- `-schemas` — Validation schemas
- `.test` or `.spec` — Test files
- `.e2e.test` — End-to-end tests

#### **Examples by Layer**

**Domain Layer (Core Business Logic):**

```
domain/
├── entities/
│   ├── user.ts                    # export class User
│   ├── order.ts                   # export class Order
│   └── product.ts                 # export class Product
├── repositories/
│   ├── user-repository.ts         # export interface UserRepository
│   └── order-repository.ts        # export interface OrderRepository
└── value-objects/
    ├── email.ts                   # export class Email
    └── money.ts                   # export class Money
```

**Application Layer (Use Cases):**

```
application/
├── use-cases/
│   ├── register-user.ts           # export class RegisterUserUseCase
│   ├── login-user.ts              # export class LoginUserUseCase
│   └── create-order.ts            # export class CreateOrderUseCase
├── services/
│   ├── jwt-service.ts             # export interface JwtService
│   ├── email-service.ts           # export interface EmailService
│   └── payment-service.ts         # export interface PaymentService
└── dtos/
    ├── register-user-dto.ts       # export class RegisterUserDto
    └── create-order-dto.ts        # export class CreateOrderDto
```

**Infrastructure Layer (External Dependencies):**

```
infrastructure/
├── database/
│   ├── models/
│   │   ├── user-model.ts              # export class UserModel
│   │   └── order-model.ts             # export class OrderModel
│   └── repositories/
│       ├── postgres-user-repository.ts # export class PostgresUserRepository
│       └── mongo-order-repository.ts   # export class MongoOrderRepository
├── services/
│   ├── jose-jwt-service.ts            # export class JoseJwtService
│   ├── nodemailer-email-service.ts    # export class NodemailerEmailService
│   └── stripe-payment-service.ts      # export class StripePaymentService
└── http/
    ├── controllers/
    │   └── auth-controller.ts         # export class AuthController
    └── middleware/
        └── correlation-id.ts          # export const correlationIdMiddleware
```

---

## 🔧 TypeScript Guidelines

### Type Annotations

**Always specify types** (no implicit `any`):

```typescript
// ✅ Good
function calculateTotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + item.price, 0)
}

// ❌ Bad (implicit any)
function calculateTotal(items) {
  // items: any
  return items.reduce((sum, item) => sum + item.price, 0)
}
```

---

### Interfaces vs Types

**Use `interface`** para object shapes:

```typescript
// ✅ Good
interface User {
  id: string
  email: string
  role: UserRole
}
```

**Use `type`** para unions, primitives, tuples:

```typescript
// ✅ Good
type UserRole = 'customer' | 'seller' | 'admin'
type ID = string | number
type Coordinates = [number, number]
```

---

### Enums

**Use string enums** (más debuggable):

```typescript
// ✅ Good
enum OrderStatus {
  Pending = 'pending',
  Processing = 'processing',
  Completed = 'completed',
  Cancelled = 'cancelled',
}

// ❌ Avoid numeric enums
enum OrderStatus {
  Pending, // 0
  Processing, // 1
  Completed, // 2 (no meaning)
}
```

**Alternative: Union types** (more type-safe):

```typescript
// ✅ Even better
type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled'

// Usage
const status: OrderStatus = 'pending' // Type-safe
```

---

### Null vs Undefined

**Use `null`** para "value explicitly absent":

```typescript
// User exists but has no profile picture
const user = {
  id: '123',
  email: 'user@example.com',
  profilePicture: null, // Explicitly no picture
}
```

**Use `undefined`** para "value not initialized":

```typescript
// Optional property
interface User {
  id: string
  email: string
  phoneNumber?: string // undefined if not provided
}
```

**Avoid mixing**:

```typescript
// ❌ Bad
const user = {
  profilePicture: null,
  phoneNumber: undefined, // Inconsistent
}

// ✅ Good
const user = {
  profilePicture: null,
  phoneNumber: null, // Consistent
}
```

---

### Async/Await

**Always use async/await** (no raw Promises):

```typescript
// ✅ Good
async function getUser(id: string): Promise<User> {
  const user = await userRepo.findById(id)

  if (!user) {
    throw new NotFoundError('User not found')
  }

  return user
}

// ❌ Bad
function getUser(id: string): Promise<User> {
  return userRepo.findById(id).then((user) => {
    if (!user) {
      throw new NotFoundError('User not found')
    }
    return user
  })
}
```

---

## 🏗️ Code Structure

### Function Size

**Max 20-30 lines** per function:

```typescript
// ✅ Good (small, focused)
function calculateOrderTotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0)
}

function applyDiscount(total: number, discountPercent: number): number {
  return total * (1 - discountPercent / 100)
}

// ❌ Bad (too long, doing multiple things)
function processOrder(orderData: any) {
  // 100 lines of validation, calculation, database calls, email sending...
}
```

**Extract long functions**:

```typescript
// Before (long function)
async function createOrder(data: CreateOrderDto) {
  // Validate items (20 lines)
  // Calculate total (15 lines)
  // Reserve inventory (25 lines)
  // Process payment (30 lines)
  // Save order (10 lines)
  // Send email (15 lines)
}

// After (extracted)
async function createOrder(data: CreateOrderDto) {
  validateOrderItems(data.items)
  const total = calculateOrderTotal(data.items)
  await reserveInventory(data.items)
  await processPayment(total, data.paymentMethod)
  const order = await saveOrder(data)
  await sendOrderConfirmationEmail(order)
  return order
}
```

---

### Early Returns

**Prefer early returns** (reduce nesting):

```typescript
// ✅ Good (early returns)
function processOrder(order: Order): void {
  if (!order.items.length) {
    throw new Error('Order has no items')
  }

  if (order.total <= 0) {
    throw new Error('Order total must be positive')
  }

  if (!order.customerId) {
    throw new Error('Customer ID required')
  }

  // Process order
  saveOrder(order)
}

// ❌ Bad (nested if)
function processOrder(order: Order): void {
  if (order.items.length > 0) {
    if (order.total > 0) {
      if (order.customerId) {
        // Process order (deeply nested)
        saveOrder(order)
      } else {
        throw new Error('Customer ID required')
      }
    } else {
      throw new Error('Order total must be positive')
    }
  } else {
    throw new Error('Order has no items')
  }
}
```

---

### Single Responsibility

**One function = one responsibility**:

```typescript
// ❌ Bad (multiple responsibilities)
async function createOrder(data: CreateOrderDto) {
  const order = await orderRepo.save(data)
  await emailService.send(order.customerId, 'Order created')
  await analyticsService.track('order_created', order)
  await inventoryService.reserve(order.items)
  return order
}

// ✅ Good (separated)
async function createOrder(data: CreateOrderDto): Promise<Order> {
  const order = await saveOrder(data)
  await publishOrderCreatedEvent(order) // Event handles email, analytics, inventory
  return order
}

async function saveOrder(data: CreateOrderDto): Promise<Order> {
  return orderRepo.save(data)
}

async function publishOrderCreatedEvent(order: Order): Promise<void> {
  await eventBus.publish('order.created', order)
}
```

---

## 💬 Comments

### When to Comment

**DO comment**:
✅ Complex algorithms  
✅ Business logic reasoning  
✅ Workarounds for bugs (with issue link)  
✅ Public API documentation (JSDoc)

**DON'T comment**:
❌ Obvious code  
❌ What code does (code should be self-explanatory)  
❌ Commented-out code (delete it, Git remembers)

---

### Good Comments

```typescript
// ✅ Good: Explain WHY, not WHAT
// Retry 3 times because payment gateway is flaky under high load
// See issue: https://github.com/company/app/issues/123
for (let i = 0; i < 3; i++) {
  try {
    return await paymentGateway.charge(amount)
  } catch (error) {
    if (i === 2) throw error
  }
}
```

```typescript
// ✅ Good: Document complex algorithm
/**
 * Calculate order total using tiered discount:
 * - $0-$100: 0% discount
 * - $100-$500: 5% discount
 * - $500+: 10% discount
 */
function calculateTotal(items: OrderItem[]): number {
  const subtotal = items.reduce((sum, item) => sum + item.price, 0)

  if (subtotal >= 500) return subtotal * 0.9
  if (subtotal >= 100) return subtotal * 0.95
  return subtotal
}
```

---

### Bad Comments

```typescript
// ❌ Bad: Obvious comment
// Increment i by 1
i++

// ❌ Bad: What instead of Why
// Loop through items
for (const item of items) {
  // Calculate price
  const price = item.price * item.quantity
}

// ❌ Bad: Commented-out code (DELETE IT!)
// const oldCalculation = items.reduce(...)
const newCalculation = items.reduce(...)
```

---

### JSDoc (Public APIs)

````typescript
/**
 * Creates a new order and reserves inventory.
 *
 * @param data - Order creation data
 * @returns Created order with ID
 * @throws {ValidationError} If order data is invalid
 * @throws {InsufficientInventoryError} If items out of stock
 *
 * @example
 * ```typescript
 * const order = await createOrder({
 *   customerId: '123',
 *   items: [{ productId: 'abc', quantity: 2 }]
 * })
 * ```
 */
async function createOrder(data: CreateOrderDto): Promise<Order> {
  // ...
}
````

---

## ❌ Error Handling

### Custom Error Classes

```typescript
// Define custom errors
export class NotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

// Usage
async function getUser(id: string): Promise<User> {
  const user = await userRepo.findById(id)

  if (!user) {
    throw new NotFoundError(`User ${id} not found`)
  }

  return user
}

// Catch specific errors
try {
  const user = await getUser('123')
} catch (error) {
  if (error instanceof NotFoundError) {
    return res.status(404).json({ error: error.message })
  }
  throw error
}
```

---

### Never Swallow Errors

```typescript
// ❌ Bad (swallow error)
try {
  await saveOrder(order)
} catch (error) {
  // Silent failure!
}

// ❌ Bad (log but don't handle)
try {
  await saveOrder(order)
} catch (error) {
  console.log(error) // Log but continue?
}

// ✅ Good (handle or rethrow)
try {
  await saveOrder(order)
} catch (error) {
  logger.error({ error, orderId: order.id }, 'Failed to save order')
  throw error // Let caller handle
}
```

---

## 🧪 Testing

### Test File Naming

```
order.service.ts
order.service.spec.ts  // Unit tests

order.controller.ts
order.controller.spec.ts

order.integration.spec.ts  // Integration tests
```

---

### Test Structure (AAA Pattern)

```typescript
describe('OrderService', () => {
  describe('createOrder', () => {
    it('should create order with valid data', async () => {
      // Arrange
      const orderData = {
        customerId: '123',
        items: [{ productId: 'abc', quantity: 2 }],
      }

      // Act
      const order = await orderService.createOrder(orderData)

      // Assert
      expect(order).toBeDefined()
      expect(order.id).toBeTruthy()
      expect(order.customerId).toBe('123')
      expect(order.items).toHaveLength(1)
    })

    it('should throw ValidationError if items empty', async () => {
      // Arrange
      const orderData = { customerId: '123', items: [] }

      // Act & Assert
      await expect(orderService.createOrder(orderData)).rejects.toThrow(ValidationError)
    })
  })
})
```

---

## 📦 Imports

### Order

```typescript
// 1. Node.js built-in modules
import fs from 'fs'
import path from 'path'

// 2. External dependencies
import express from 'express'
import { z } from 'zod'

// 3. Internal modules (absolute imports)
import { OrderService } from '@/orders/application/order.service'
import { UserRepository } from '@/users/infrastructure/user.repository'

// 4. Relative imports (same module)
import { CreateOrderDto } from './dtos/create-order.dto'
import { OrderEntity } from './domain/order.entity'
```

---

### Absolute Imports

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": "./src",
    "paths": {
      "@/*": ["*"],
      "@orders/*": ["orders/*"],
      "@users/*": ["users/*"]
    }
  }
}
```

```typescript
// Instead of
import { OrderService } from '../../../orders/application/order.service'

// Use
import { OrderService } from '@orders/application/order.service'
```

---

## 🔒 Security

### No Hardcoded Secrets

```typescript
// ❌ Bad
const JWT_SECRET = 'super-secret-key'
const DATABASE_URL = 'postgresql://user:password@host/db'

// ✅ Good
const JWT_SECRET = process.env.JWT_SECRET
const DATABASE_URL = process.env.DATABASE_URL

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable required')
}
```

---

### Validate All Inputs

```typescript
// ❌ Bad
app.post('/api/orders', async (req, res) => {
  const order = await orderService.create(req.body) // No validation!
  res.json(order)
})

// ✅ Good
const CreateOrderSchema = z.object({
  customerId: z.string().uuid(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().min(1).max(100),
      })
    )
    .min(1),
})

app.post('/api/orders', async (req, res) => {
  const data = CreateOrderSchema.parse(req.body) // Validates!
  const order = await orderService.create(data)
  res.json(order)
})
```

---

## ✅ Linting & Formatting

### ESLint Configuration

```javascript
// .eslintrc.js
module.exports = {
  parser: '@typescript-eslint/parser',
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/explicit-function-return-type': 'warn',
    'no-console': 'warn',
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'prefer-const': 'error',
    'no-var': 'error',
  },
}
```

---

### Prettier Configuration

```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always"
}
```

---

### Run Before Commit

```bash
# Lint
pnpm run lint

# Auto-fix
pnpm run lint:fix

# Format
pnpm run format
```

---

### Husky (Pre-commit Hooks)

```bash
# Install
pnpm add -D husky lint-staged

# Enable Git hooks
pnpm dlx husky install
```

```javascript
// .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npx lint-staged
```

```json
// package.json
{
  "lint-staged": {
    "*.ts": ["eslint --fix", "prettier --write", "pnpm run test:related"]
  }
}
```

---

## � Dependency Management

### Exact Versions (OBLIGATORIO)

**REGLA**: Todas las dependencias DEBEN usar versiones exactas en `package.json`

**❌ PROHIBIDO**: Rangos de versiones con `^`, `~`, `>=`, `*`

```json
// ❌ BAD - Rangos de versiones
{
  "dependencies": {
    "express": "^4.21.2",      // ❌ Permite 4.x.x
    "sequelize": "~6.37.5",    // ❌ Permite 6.37.x
    "winston": ">=3.17.0",     // ❌ Permite 3.x.x o superior
    "typescript": "*"          // ❌ Permite cualquier versión
  }
}

// ✅ GOOD - Versiones exactas
{
  "dependencies": {
    "express": "4.21.2",       // ✅ Solo 4.21.2
    "sequelize": "6.37.5",     // ✅ Solo 6.37.5
    "winston": "3.17.0",       // ✅ Solo 3.17.0
    "typescript": "5.7.2"      // ✅ Solo 5.7.2
  }
}
```

### Justificación

**Problema con rangos de versiones**:

- **Builds no reproducibles**: Diferentes devs obtienen diferentes versiones
- **Bugs introducidos silenciosamente**: Dependencias actualizadas sin control
- **CI/CD inconsistente**: Deploy puede tener versiones diferentes a local
- **Debugging imposible**: "Funciona en mi máquina" por versiones diferentes

**Ejemplo real del problema**:

```bash
# Dev A instala hoy (obtiene express@4.21.2)
pnpm install

# Dev B instala mañana (obtiene express@4.22.0 - nueva versión con bug)
pnpm install

# Bug solo aparece en máquina de Dev B
# Causa: express 4.22.0 tiene breaking change no documentado
```

### Estrategia de Actualización

**NO actualizar automáticamente**, usar proceso controlado:

1. **Verificar updates disponibles**:

```bash
pnpm outdated
```

2. **Actualizar una a la vez en branch separado**:

```bash
# Actualizar una dependencia específica
pnpm update express --latest

# Verificar que todo funciona
pnpm test
pnpm build

# Commit con mensaje descriptivo
git commit -m "chore(deps): update express 4.21.2 → 4.22.0"
```

3. **Testing exhaustivo**:

- [ ] Unit tests pasan
- [ ] Integration tests pasan
- [ ] E2E tests pasan
- [ ] Build exitoso
- [ ] Smoke test en staging

4. **Actualizar package.json con versión exacta**:

```json
{
  "dependencies": {
    "express": "4.22.0" // Sin ^, ~, >=
  }
}
```

### Lock Files

**OBLIGATORIO** commitear `pnpm-lock.yaml`:

```bash
# .gitignore - NO ignorar lock file
# pnpm-lock.yaml  ❌ NUNCA descomentar esta línea
```

**Razón**: Lock file asegura mismas versiones en todos los ambientes

### Monorepo - Versiones Consistentes

**OBLIGATORIO**: Misma versión de dependencias compartidas en todos los servicios

```json
// ❌ BAD - Versiones inconsistentes
// auth-service/package.json
{
  "dependencies": {
    "winston": "3.17.0"
  }
}

// product-service/package.json
{
  "dependencies": {
    "winston": "3.14.0"  // ❌ Diferente versión
  }
}

// ✅ GOOD - Versión consistente
// Usar workspace protocol o version exacta compartida
// root package.json
{
  "dependencies": {
    "winston": "3.17.0"
  }
}

// auth-service, product-service usan la del root
```

### Dependabot / Renovate

**SI usamos** herramientas de actualización automática:

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: 'npm'
    directory: '/'
    schedule:
      interval: 'monthly' # NO weekly - muy frecuente
    versioning-strategy: 'increase'
    open-pull-requests-limit: 3
    reviewers:
      - 'tech-leads'
    labels:
      - 'dependencies'
      - 'requires-testing'
```

**Reglas**:

- ✅ PRs de actualización requieren **code review obligatorio**
- ✅ Todas las actualizaciones pasan por **staging primero**
- ✅ **NO merge automático** de dependabot PRs
- ✅ Actualizar major versions en **sprint dedicado**

### Security Updates (Excepción)

**ÚNICO caso** donde actualizar rápidamente:

```bash
# CVE crítico detectado
pnpm audit

# Actualizar dependencia vulnerable INMEDIATAMENTE
pnpm update <vulnerable-package> --latest

# Verificar que fix funciona
pnpm test

# Deploy urgente a producción
```

### Package.json Template

```json
{
  "name": "@ecommerce/service-name",
  "version": "1.0.0",
  "engines": {
    "node": "18.20.8", // ✅ Versión exacta
    "pnpm": "9.15.0" // ✅ Versión exacta
  },
  "dependencies": {
    "express": "4.21.2", // ✅ Sin ^ ~ >= *
    "sequelize": "6.37.5",
    "winston": "3.17.0"
  },
  "devDependencies": {
    "typescript": "5.7.2",
    "jest": "29.7.0",
    "@types/node": "18.19.68"
  }
}
```

---

## �📊 Code Quality Metrics

### SonarQube Targets

| Metric                   | Target              |
| ------------------------ | ------------------- |
| **Code Coverage**        | ≥ 80%               |
| **Duplicated Code**      | < 3%                |
| **Cognitive Complexity** | < 15 per function   |
| **Security Hotspots**    | 0                   |
| **Code Smells**          | < 10 per 1000 lines |
| **Technical Debt**       | < 5%                |

---

## ✅ Checklist (Before Committing)

- [ ] Code passes lint (`pnpm run lint`)
- [ ] Code is formatted (`pnpm run format`)
- [ ] Tests pass (`pnpm test`)
- [ ] Test coverage ≥ 80%
- [ ] No console.log() or debug code
- [ ] No hardcoded secrets
- [ ] All inputs validated
- [ ] Errors handled properly
- [ ] Functions < 30 lines
- [ ] Variables have descriptive names
- [ ] Comments explain WHY (not WHAT)
- [ ] No commented-out code

---

**Última actualización**: Diciembre 2025
