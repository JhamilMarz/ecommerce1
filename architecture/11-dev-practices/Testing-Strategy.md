# Testing Strategy

## 📋 Propósito

Define la **estrategia completa de testing**: tipos de tests, herramientas, coverage targets, CI/CD integration.

## 🎯 Testing Pyramid

```
                    /\
                   /  \
                  / E2E \      (10% - Pocos, lentos, costosos)
                 /______\
                /        \
               / Integration\  (20% - Moderados)
              /____________\
             /              \
            /   Unit Tests   \  (70% - Muchos, rápidos, baratos)
           /__________________\
```

---

## 🧪 Tipos de Tests

### 1. Unit Tests (70% del total)

**Objetivo**: Testar funciones, clases, métodos aisladamente

**Herramientas**:

- Jest (test runner + assertions)
- ts-jest (TypeScript support)

**Qué testar**:
✅ Domain logic (entities, value objects, aggregates)  
✅ Use cases  
✅ Utilities y helpers  
✅ Validaciones

**Mock dependencies**:
✅ Repositories (mock)  
✅ External services (mock)  
✅ Event bus (mock)

**Coverage target**: > 85%

**Ejemplo**:

```typescript
describe('Order Aggregate', () => {
  test('should calculate total correctly', () => {
    const order = new Order();
    order.addLine(productId, 2, new Money(10, 'USD'));
    order.addLine(productId2, 1, new Money(5, 'USD'));

    expect(order.calculateTotal()).toEqual(new Money(25, 'USD'));
  });

  test('should throw error when confirming empty order', () => {
    const order = new Order();

    expect(() => order.confirm()).toThrow(new OrderEmptyError());
  });
});
```

---

### 2. Integration Tests (20% del total)

**Objetivo**: Testar integración entre capas (API → Use Case → Repository → DB)

**Herramientas**:

- Supertest (HTTP testing)
- Testcontainers (Docker containers para DB real)

**Qué testar**:
✅ API endpoints completos  
✅ Database queries reales  
✅ Message queue publishing/consuming  
✅ External API integrations (mocked o sandbox)

**Coverage target**: > 70%

**Ejemplo**:

```typescript
describe('POST /api/v1/orders', () => {
  let app: Express;
  let dbContainer: PostgreSqlContainer;

  beforeAll(async () => {
    dbContainer = await new PostgreSqlContainer().start();
    app = createApp({ dbUrl: dbContainer.getConnectionUri() });
  });

  afterAll(async () => {
    await dbContainer.stop();
  });

  test('should create order successfully', async () => {
    const response = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        customerId: 'cust-123',
        lines: [{ productId: 'prod-1', quantity: 2 }],
      });

    expect(response.status).toBe(201);
    expect(response.body.id).toBeDefined();

    // Verify in DB
    const order = await orderRepository.findById(response.body.id);
    expect(order).toBeDefined();
    expect(order.lines).toHaveLength(1);
  });
});
```

---

### 3. E2E Tests (10% del total)

**Objetivo**: Testar flujos completos de usuario desde UI hasta DB

**Herramientas**:

- Playwright (browser automation)
- Cypress (alternativa)

**Qué testar**:
✅ Happy paths críticos (registro → login → compra)  
✅ Flujos de negocio end-to-end

**Frecuencia**: Daily en staging, before release

**Coverage target**: Core user journeys (no necesita 100%)

**Ejemplo**:

```typescript
test('User can complete full purchase flow', async ({ page }) => {
  // 1. Register
  await page.goto('/register');
  await page.fill('[name=email]', 'test@example.com');
  await page.fill('[name=password]', 'SecurePass123!');
  await page.click('button[type=submit]');

  // 2. Add product to cart
  await page.goto('/products/prod-1');
  await page.click('button:text("Add to Cart")');

  // 3. Checkout
  await page.click('a:text("Cart")');
  await page.click('button:text("Checkout")');

  // 4. Payment
  await fillStripeTestCard(page);
  await page.click('button:text("Pay")');

  // 5. Verify success
  await expect(page.locator('text=Order confirmed')).toBeVisible();
});
```

---

### 4. Contract Tests (Para APIs entre servicios)

**Objetivo**: Verificar que producer y consumer de API están alineados

**Herramientas**:

- Pact (consumer-driven contracts)

**Ejemplo**:

```typescript
// Consumer side (Order Service)
const orderServiceConsumer = new Pact({
  consumer: 'OrderService',
  provider: 'InventoryService',
});

test('can check stock availability', async () => {
  await orderServiceConsumer.addInteraction({
    state: 'product has stock',
    uponReceiving: 'a request to check stock',
    withRequest: {
      method: 'GET',
      path: '/api/v1/inventory/SKU-123/availability',
    },
    willRespondWith: {
      status: 200,
      body: { available: true, quantity: 10 },
    },
  });

  const available = await inventoryClient.checkStock('SKU-123');
  expect(available).toBe(true);
});
```

---

### 5. Performance Tests (Load Testing)

**Objetivo**: Validar que sistema soporta carga esperada

**Herramientas**:

- k6 (load testing)
- Artillery (alternativa)

**Escenarios**:

- Normal load: 100 RPS sostenido por 10 minutos
- Peak load: 500 RPS por 5 minutos
- Stress test: Incremento gradual hasta fallo

**Frecuencia**: Semanal en staging, before major releases

**Ejemplo**:

```javascript
// k6 script
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up to 100 RPS
    { duration: '5m', target: 100 }, // Stay at 100 RPS
    { duration: '2m', target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'], // 95% requests < 200ms
    http_req_failed: ['rate<0.01'], // Error rate < 1%
  },
};

export default function () {
  const res = http.get('https://api.example.com/products');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });
  sleep(1);
}
```

---

### 6. Security Tests

**Objetivo**: Detectar vulnerabilidades de seguridad

**Herramientas**:

- OWASP ZAP (penetration testing)
- Snyk (dependency scanning)
- Trivy (container scanning)

**Qué testar**:
✅ SQL injection  
✅ XSS  
✅ CSRF  
✅ Authentication bypass  
✅ Authorization flaws  
✅ Known CVEs en dependencies

**Frecuencia**: Weekly automated scans

---

## 📊 Coverage Targets

| Tipo                            | Target             | Enforcement              |
| ------------------------------- | ------------------ | ------------------------ |
| Unit Tests                      | > 80%              | CI blocks merge if < 80% |
| Integration Tests               | > 70%              | Warning if < 70%         |
| E2E Tests                       | Core flows covered | Manual review            |
| Critical paths (Order, Payment) | > 95%              | Mandatory                |

---

## 🔧 Herramientas y Setup

### Jest Configuration

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.test.ts',
    '!src/infrastructure/**', // Excluir código de infra
  ],
};
```

### CI/CD Integration (GitHub Actions)

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit

      - name: Run integration tests
        run: npm run test:integration

      - name: Check coverage
        run: npm run test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
```

---

## 🚀 Best Practices

### ✅ DO

1. **AAA Pattern** (Arrange, Act, Assert)

```typescript
test('should do something', () => {
  // Arrange
  const sut = new MyClass();

  // Act
  const result = sut.doSomething();

  // Assert
  expect(result).toBe(expected);
});
```

2. **One assertion per test** (cuando posible)
3. **Descriptive test names**: `should throw error when user is suspended`
4. **Test behavior, not implementation**
5. **Use factories/builders para test data**

```typescript
// Test data factory
class OrderBuilder {
  private order = new Order();

  withLine(productId: string, quantity: number) {
    this.order.addLine(productId, quantity, new Money(10, 'USD'));
    return this;
  }

  build() {
    return this.order;
  }
}

test('order with multiple lines', () => {
  const order = new OrderBuilder()
    .withLine('prod-1', 2)
    .withLine('prod-2', 1)
    .build();

  expect(order.lines).toHaveLength(2);
});
```

### ❌ DON'T

1. **No tests compartiendo estado**: Cada test debe ser independiente
2. **No asertar implementación interna**: `expect(mock.called).toBe(true)` ❌
3. **No tests flaky**: Si falla intermitentemente, es un mal test
4. **No skip tests**: Fixear o remover, no dejar skippeados

---

## 📈 Métricas de Testing

### Métricas que trackear:

- **Coverage %** (meta: > 80%)
- **Test execution time** (meta: < 5 min para unit, < 15 min total)
- **Flaky test rate** (meta: 0%)
- **Build failure rate por tests** (meta: < 5%)

### Dashboard: Codecov / SonarQube

---

## 🔄 Test Maintenance

### Refactoring de Tests

- Si cambia el código, actualizar tests inmediatamente
- Eliminar tests obsoletos
- Refactorizar tests cuando domain logic cambia

### Test Smells (Señales de mal diseño):

🚨 Tests muy largos (> 50 líneas)  
🚨 Setup complejo (many mocks)  
🚨 Duplicación entre tests  
🚨 Tests que testean framework, no nuestro código

---

**Versión**: 1.0  
**Última actualización**: Diciembre 2025  
**Responsable**: QA Lead + Tech Lead
