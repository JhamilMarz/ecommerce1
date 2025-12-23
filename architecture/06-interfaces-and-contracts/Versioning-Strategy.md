# Versioning Strategy

## 📋 Propósito

Define la **estrategia de versionado de APIs** para mantener backward compatibility y permitir evolución sin romper clientes existentes.

## 🎯 Estrategia: URL Path Versioning

**Método elegido**: Versión en la URL path

**Formato**: `/api/v{major}/resource`

**Ejemplo**:

- `/api/v1/products`
- `/api/v2/products`

### Por qué URL Path (vs otras opciones)

✅ **Pros**:

- Explícito y fácil de entender
- Cache-friendly
- Fácil de testear (diferentes URLs)
- Compatible con API Gateway routing
- Developer-friendly (visible en browser)

❌ **Alternativas descartadas**:

- Header versioning (`Accept: application/vnd.api+json; version=1`) → Más complejo, menos visible
- Query param (`/api/products?version=1`) → Interfiere con otros params, feo

---

## 📊 Semantic Versioning (API)

**Format**: `v{MAJOR}`

Solo incrementamos MAJOR version cuando hay **breaking changes**.

### Breaking Changes (Requieren nueva versión)

❌ **Breaking**:

- Remover endpoint
- Remover campo de response
- Cambiar tipo de dato de campo
- Cambiar semántica de operación
- Hacer campo obligatorio (antes opcional)
- Cambiar status code de success

### Non-Breaking Changes (Mismo versión)

✅ **Non-Breaking**:

- Agregar nuevo endpoint
- Agregar campo opcional a request
- Agregar nuevo campo a response
- Deprecar campo (pero mantenerlo)
- Mejorar performance
- Fix de bugs

---

## 🔄 Lifecycle de Versiones

### Fases

```
Active → Deprecated → Retired
  |         |           |
  |         |           └─ No disponible (410 Gone)
  |         └─ Warning header pero funcional
  └─ Versión actual, full support
```

### Timeline

| Fase           | Duración   | Support Level                            |
| -------------- | ---------- | ---------------------------------------- |
| **Active**     | Indefinida | Full support, nuevas features            |
| **Deprecated** | 6 meses    | Mantener funcionando, no features nuevas |
| **Retired**    | -          | 410 Gone, redirect docs a nueva versión  |

### Ejemplo

- **2025-01-01**: v2 lanzada → v1 pasa a Deprecated
- **2025-07-01**: v1 pasa a Retired (410 Gone)

---

## 📢 Comunicación de Deprecation

### 1. Response Header

```http
HTTP/1.1 200 OK
Deprecation: true
Sunset: Sat, 01 Jul 2025 00:00:00 GMT
Link: </api/v2/products>; rel="alternate"
```

### 2. Response Body Warning (Opcional)

```json
{
  "data": [...],
  "_meta": {
    "deprecated": true,
    "sunsetDate": "2025-07-01",
    "alternateVersion": "/api/v2/products",
    "deprecationNotice": "This endpoint will be retired on July 1, 2025. Please migrate to v2."
  }
}
```

### 3. Email a Developers

6 meses antes de retirement:

```
Subject: [Action Required] API v1 Deprecation Notice

Dear Developer,

We've detected your app is still using API v1 endpoints.
These will be retired on July 1, 2025.

Affected endpoints:
- GET /api/v1/products (use /api/v2/products instead)
- POST /api/v1/orders (use /api/v2/orders instead)

Migration guide: https://docs.ecommerce.com/migration-v1-to-v2

Questions? Reply to this email.
```

---

## 🚀 Rolling Out New Version

### Phase 1: Beta (Semana 1-2)

- `/api/v2-beta/products` disponible
- Solo para early adopters
- Feedback loop

### Phase 2: Stable Release (Semana 3)

- `/api/v2/products` en production
- v1 sigue activa
- Announcement a todos los developers

### Phase 3: Deprecation Notice (Día 1 de v2)

- v1 pasa a deprecated inmediatamente
- Headers de deprecation activos
- Countdown de 6 meses

### Phase 4: Retirement (6 meses después)

- v1 retorna 410 Gone
- Redirect docs a v2

---

## 🔀 Backward Compatibility Techniques

### 1. Additive Changes

✅ **Agregar campo opcional**:

```json
// v1 response
{ "id": 1, "name": "Product" }

// v1 con nuevo campo (backward compatible)
{ "id": 1, "name": "Product", "category": "electronics" }
```

Clientes de v1 ignoran campo nuevo.

---

### 2. Default Values

✅ **Nuevo campo obligatorio en v2, opcional en v1**:

```typescript
// v1 handler
function createProduct(data: ProductV1) {
  const product = {
    ...data,
    category: data.category || 'uncategorized', // Default
  };
  return productRepo.save(product);
}
```

---

### 3. Field Aliasing

✅ **Renombrar campo sin breaking**:

```json
// v1 response (old name)
{ "product_id": 123 }

// v2 response (new name + alias)
{
  "id": 123,
  "product_id": 123  // Alias para backward compat
}
```

Deprecar `product_id` en v2, remover en v3.

---

### 4. Response Transformers

Para mantener v1 funcionando mientras internamente usamos v2:

```typescript
// v1 controller
router.get('/api/v1/products/:id', async (req, res) => {
  // Internamente usa v2 use case
  const product = await getProductV2UseCase.execute(req.params.id);

  // Transforma response a formato v1
  const v1Response = transformToV1(product);
  res.json(v1Response);
});

function transformToV1(productV2: ProductV2): ProductV1 {
  return {
    product_id: productV2.id, // id → product_id
    product_name: productV2.name, // name → product_name
    price: productV2.price.amount, // Money object → number
  };
}
```

---

## 🧪 Testing Multiple Versions

### Integration Tests por Versión

```typescript
describe('Product API v1', () => {
  test('GET /api/v1/products/:id', async () => {
    const res = await request(app).get('/api/v1/products/123').expect(200);

    expect(res.body).toHaveProperty('product_id'); // v1 field name
  });
});

describe('Product API v2', () => {
  test('GET /api/v2/products/:id', async () => {
    const res = await request(app).get('/api/v2/products/123').expect(200);

    expect(res.body).toHaveProperty('id'); // v2 field name
    expect(res.body.price).toHaveProperty('amount'); // v2 Money object
  });
});
```

---

## 📖 Migration Guide (Ejemplo)

**Migration Guide: v1 → v2**

### Breaking Changes

#### 1. Product ID field renamed

```diff
- product_id
+ id
```

**Migration**:

```javascript
// Before (v1)
const productId = product.product_id;

// After (v2)
const productId = product.id;
```

#### 2. Price is now Money object

```diff
- "price": 99.99
+ "price": { "amount": 99.99, "currency": "USD" }
```

**Migration**:

```javascript
// Before (v1)
const price = product.price;

// After (v2)
const price = product.price.amount;
```

#### 3. Category is now required

```diff
POST /api/v1/products
- { "name": "Product" }  // category optional

POST /api/v2/products
+ { "name": "Product", "category": "electronics" }  // required
```

---

## 🛠️ Implementation

### API Gateway Routing

```yaml
# Kong config
services:
  - name: product-service-v1
    url: http://product-service:3000
    routes:
      - name: products-v1
        paths:
          - /api/v1/products
        plugins:
          - name: response-transformer
            config:
              add:
                headers:
                  - 'Deprecation: true'
                  - 'Sunset: Sat, 01 Jul 2025 00:00:00 GMT'

  - name: product-service-v2
    url: http://product-service:3000
    routes:
      - name: products-v2
        paths:
          - /api/v2/products
```

### Service Layer

```typescript
// routes/v1/products.ts
router.get(
  '/api/v1/products/:id',
  warnDeprecation('2025-07-01', '/api/v2/products'),
  async (req, res) => {
    const product = await productService.getById(req.params.id);
    res.json(transformToV1(product));
  }
);

// routes/v2/products.ts
router.get('/api/v2/products/:id', async (req, res) => {
  const product = await productService.getById(req.params.id);
  res.json(product); // Formato v2 nativo
});
```

---

## 📊 Monitoring

### Métricas a Trackear

```
api_requests_total{version="v1", endpoint="/products"} 12500
api_requests_total{version="v2", endpoint="/products"} 45000
```

**Alertas**:

- ⚠️ Si v1 usage > 20% después de 3 meses de v2 → Contactar usuarios
- 🚨 Si v1 usage > 10% a 1 mes del retirement → Extender deprecation

### Dashboard

```
┌─────────────────────────────────────┐
│  API Version Distribution           │
├─────────────────────────────────────┤
│  v1: ████░░░░░░ 25% (deprecated)    │
│  v2: █████████░ 75%                 │
│                                     │
│  Sunset date: 2025-07-01           │
│  Days remaining: 45                 │
└─────────────────────────────────────┘
```

---

## ✅ Checklist: Releasing New Version

- [ ] Changelog detallado escrito
- [ ] Migration guide publicado
- [ ] Breaking changes documentados
- [ ] Tests de v1 y v2 pasando
- [ ] Deprecation headers configurados
- [ ] Email a developers enviado
- [ ] Dashboard de adoption configurado
- [ ] Rollback plan documentado

---

**Versión**: 1.0  
**Última actualización**: Diciembre 2025
