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
const userName = 'John Doe';
const orderTotal = 100.5;
const isAuthenticated = true;

// ❌ Bad
const user_name = 'John Doe'; // snake_case (Python style)
const UserName = 'John Doe'; // PascalCase (for classes)
const ORDERTOTAL = 100.5; // SCREAMING_SNAKE_CASE (for constants)
```

**SCREAMING_SNAKE_CASE** para constantes globales:

```typescript
// ✅ Good
const MAX_RETRY_ATTEMPTS = 3;
const API_BASE_URL = 'https://api.example.com';
const DEFAULT_PAGE_SIZE = 20;

// ❌ Bad
const maxRetryAttempts = 3; // Looks like variable
```

**Descriptive names** (no abbreviations):

```typescript
// ✅ Good
const customerOrders = await getOrders(customerId);
const totalPrice = calculateTotal(items);

// ❌ Bad
const co = await getOrders(cId); // What is 'co'?
const tp = calculateTotal(i); // What is 'tp'?
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
getUser();
fetchOrders();
setUserRole();
calculateTax();
validatePassword();
createOrder();
updateInventory();
deleteProduct();
isAuthenticated();
hasPermission();
```

---

### Classes & Interfaces

**PascalCase** + **nouns**:

```typescript
// ✅ Good
class OrderService {}
class UserRepository {}
interface PaymentGateway {}
type OrderStatus = 'pending' | 'completed';

// ❌ Bad
class orderService {} // camelCase
class Order_Service {} // snake_case
interface paymentGateway {} // camelCase
```

**Interface naming**:

```typescript
// Option 1: No prefix (preferred)
interface User {
  id: string;
  email: string;
}

// Option 2: 'I' prefix (C# style, less common in TypeScript)
interface IUser {
  id: string;
  email: string;
}
```

---

### Files & Folders

**kebab-case** para archivos:

```
order-service.ts
user-repository.ts
create-order.dto.ts
order.entity.ts
```

**PascalCase** para componentes (React):

```
OrderSummary.tsx
UserProfile.tsx
ProductCard.tsx
```

**Folder structure**:

```
src/
├─ orders/
│  ├─ application/
│  │  ├─ create-order.use-case.ts
│  │  └─ get-order.use-case.ts
│  ├─ domain/
│  │  ├─ order.entity.ts
│  │  ├─ order-item.entity.ts
│  │  └─ order.repository.ts
│  ├─ infrastructure/
│  │  ├─ order.repository.impl.ts
│  │  └─ order.controller.ts
│  └─ dtos/
│     ├─ create-order.dto.ts
│     └─ order-response.dto.ts
```

---

## 🔧 TypeScript Guidelines

### Type Annotations

**Always specify types** (no implicit `any`):

```typescript
// ✅ Good
function calculateTotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// ❌ Bad (implicit any)
function calculateTotal(items) {
  // items: any
  return items.reduce((sum, item) => sum + item.price, 0);
}
```

---

### Interfaces vs Types

**Use `interface`** para object shapes:

```typescript
// ✅ Good
interface User {
  id: string;
  email: string;
  role: UserRole;
}
```

**Use `type`** para unions, primitives, tuples:

```typescript
// ✅ Good
type UserRole = 'customer' | 'seller' | 'admin';
type ID = string | number;
type Coordinates = [number, number];
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
type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled';

// Usage
const status: OrderStatus = 'pending'; // Type-safe
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
};
```

**Use `undefined`** para "value not initialized":

```typescript
// Optional property
interface User {
  id: string;
  email: string;
  phoneNumber?: string; // undefined if not provided
}
```

**Avoid mixing**:

```typescript
// ❌ Bad
const user = {
  profilePicture: null,
  phoneNumber: undefined, // Inconsistent
};

// ✅ Good
const user = {
  profilePicture: null,
  phoneNumber: null, // Consistent
};
```

---

### Async/Await

**Always use async/await** (no raw Promises):

```typescript
// ✅ Good
async function getUser(id: string): Promise<User> {
  const user = await userRepo.findById(id);

  if (!user) {
    throw new NotFoundError('User not found');
  }

  return user;
}

// ❌ Bad
function getUser(id: string): Promise<User> {
  return userRepo.findById(id).then((user) => {
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return user;
  });
}
```

---

## 🏗️ Code Structure

### Function Size

**Max 20-30 lines** per function:

```typescript
// ✅ Good (small, focused)
function calculateOrderTotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function applyDiscount(total: number, discountPercent: number): number {
  return total * (1 - discountPercent / 100);
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
  validateOrderItems(data.items);
  const total = calculateOrderTotal(data.items);
  await reserveInventory(data.items);
  await processPayment(total, data.paymentMethod);
  const order = await saveOrder(data);
  await sendOrderConfirmationEmail(order);
  return order;
}
```

---

### Early Returns

**Prefer early returns** (reduce nesting):

```typescript
// ✅ Good (early returns)
function processOrder(order: Order): void {
  if (!order.items.length) {
    throw new Error('Order has no items');
  }

  if (order.total <= 0) {
    throw new Error('Order total must be positive');
  }

  if (!order.customerId) {
    throw new Error('Customer ID required');
  }

  // Process order
  saveOrder(order);
}

// ❌ Bad (nested if)
function processOrder(order: Order): void {
  if (order.items.length > 0) {
    if (order.total > 0) {
      if (order.customerId) {
        // Process order (deeply nested)
        saveOrder(order);
      } else {
        throw new Error('Customer ID required');
      }
    } else {
      throw new Error('Order total must be positive');
    }
  } else {
    throw new Error('Order has no items');
  }
}
```

---

### Single Responsibility

**One function = one responsibility**:

```typescript
// ❌ Bad (multiple responsibilities)
async function createOrder(data: CreateOrderDto) {
  const order = await orderRepo.save(data);
  await emailService.send(order.customerId, 'Order created');
  await analyticsService.track('order_created', order);
  await inventoryService.reserve(order.items);
  return order;
}

// ✅ Good (separated)
async function createOrder(data: CreateOrderDto): Promise<Order> {
  const order = await saveOrder(data);
  await publishOrderCreatedEvent(order); // Event handles email, analytics, inventory
  return order;
}

async function saveOrder(data: CreateOrderDto): Promise<Order> {
  return orderRepo.save(data);
}

async function publishOrderCreatedEvent(order: Order): Promise<void> {
  await eventBus.publish('order.created', order);
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
    return await paymentGateway.charge(amount);
  } catch (error) {
    if (i === 2) throw error;
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
  const subtotal = items.reduce((sum, item) => sum + item.price, 0);

  if (subtotal >= 500) return subtotal * 0.9;
  if (subtotal >= 100) return subtotal * 0.95;
  return subtotal;
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
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Usage
async function getUser(id: string): Promise<User> {
  const user = await userRepo.findById(id);

  if (!user) {
    throw new NotFoundError(`User ${id} not found`);
  }

  return user;
}

// Catch specific errors
try {
  const user = await getUser('123');
} catch (error) {
  if (error instanceof NotFoundError) {
    return res.status(404).json({ error: error.message });
  }
  throw error;
}
```

---

### Never Swallow Errors

```typescript
// ❌ Bad (swallow error)
try {
  await saveOrder(order);
} catch (error) {
  // Silent failure!
}

// ❌ Bad (log but don't handle)
try {
  await saveOrder(order);
} catch (error) {
  console.log(error); // Log but continue?
}

// ✅ Good (handle or rethrow)
try {
  await saveOrder(order);
} catch (error) {
  logger.error({ error, orderId: order.id }, 'Failed to save order');
  throw error; // Let caller handle
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
      };

      // Act
      const order = await orderService.createOrder(orderData);

      // Assert
      expect(order).toBeDefined();
      expect(order.id).toBeTruthy();
      expect(order.customerId).toBe('123');
      expect(order.items).toHaveLength(1);
    });

    it('should throw ValidationError if items empty', async () => {
      // Arrange
      const orderData = { customerId: '123', items: [] };

      // Act & Assert
      await expect(orderService.createOrder(orderData)).rejects.toThrow(
        ValidationError
      );
    });
  });
});
```

---

## 📦 Imports

### Order

```typescript
// 1. Node.js built-in modules
import fs from 'fs';
import path from 'path';

// 2. External dependencies
import express from 'express';
import { z } from 'zod';

// 3. Internal modules (absolute imports)
import { OrderService } from '@/orders/application/order.service';
import { UserRepository } from '@/users/infrastructure/user.repository';

// 4. Relative imports (same module)
import { CreateOrderDto } from './dtos/create-order.dto';
import { OrderEntity } from './domain/order.entity';
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
import { OrderService } from '../../../orders/application/order.service';

// Use
import { OrderService } from '@orders/application/order.service';
```

---

## 🔒 Security

### No Hardcoded Secrets

```typescript
// ❌ Bad
const JWT_SECRET = 'super-secret-key';
const DATABASE_URL = 'postgresql://user:password@host/db';

// ✅ Good
const JWT_SECRET = process.env.JWT_SECRET;
const DATABASE_URL = process.env.DATABASE_URL;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable required');
}
```

---

### Validate All Inputs

```typescript
// ❌ Bad
app.post('/api/orders', async (req, res) => {
  const order = await orderService.create(req.body); // No validation!
  res.json(order);
});

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
});

app.post('/api/orders', async (req, res) => {
  const data = CreateOrderSchema.parse(req.body); // Validates!
  const order = await orderService.create(data);
  res.json(order);
});
```

---

## ✅ Linting & Formatting

### ESLint Configuration

```javascript
// .eslintrc.js
module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/explicit-function-return-type': 'warn',
    'no-console': 'warn',
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'prefer-const': 'error',
    'no-var': 'error',
  },
};
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

## 📊 Code Quality Metrics

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
