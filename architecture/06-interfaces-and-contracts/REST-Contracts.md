# REST Contracts

## 📋 Propósito

Define los **estándares y convenciones REST** para todas las APIs del sistema.

## 🎯 Principios REST

### 1. Resource-Oriented

URLs representan recursos (sustantivos), no acciones (verbos)

✅ **CORRECTO**:

- `GET /api/v1/products`
- `POST /api/v1/orders`
- `PUT /api/v1/users/:id`

❌ **INCORRECTO**:

- `GET /api/v1/getAllProducts`
- `POST /api/v1/createOrder`
- `GET /api/v1/getUserById/:id`

### 2. HTTP Methods Semánticos

| Method     | Uso                         | Idempotente | Safe |
| ---------- | --------------------------- | ----------- | ---- |
| **GET**    | Leer recurso                | Sí          | Sí   |
| **POST**   | Crear recurso               | No          | No   |
| **PUT**    | Reemplazar recurso completo | Sí          | No   |
| **PATCH**  | Actualizar parcial          | No          | No   |
| **DELETE** | Eliminar recurso            | Sí          | No   |

---

## 🔤 Naming Conventions

### URLs

✅ **Plural para colecciones**: `/products`, `/orders`  
✅ **Kebab-case**: `/order-items`, `/shipping-addresses`  
✅ **Lowercase**: `/api/v1/products` (no `/API/V1/Products`)  
✅ **Jerárquico**: `/orders/:orderId/items/:itemId`

❌ **NO**: camelCase, snake_case, verbos en URLs

### Ejemplos

```
GET    /api/v1/products              # Listar productos
GET    /api/v1/products/:id          # Un producto
POST   /api/v1/products              # Crear producto
PUT    /api/v1/products/:id          # Actualizar producto completo
PATCH  /api/v1/products/:id          # Actualizar parcial
DELETE /api/v1/products/:id          # Eliminar producto

# Recursos anidados
GET    /api/v1/orders/:orderId/items
POST   /api/v1/orders/:orderId/items
```

---

## 📦 Request/Response Format

### Request Body (POST/PUT/PATCH)

```json
{
  "name": "iPhone 15 Pro",
  "price": {
    "amount": 999.99,
    "currency": "USD"
  },
  "category": "electronics",
  "attributes": {
    "color": "titanium",
    "storage": "256GB"
  }
}
```

**Reglas**:

- JSON obligatorio
- camelCase para properties
- Validación con JSON Schema o Zod

---

### Response Body (Success)

```json
{
  "id": "prod_abc123",
  "name": "iPhone 15 Pro",
  "price": {
    "amount": 999.99,
    "currency": "USD"
  },
  "createdAt": "2025-12-21T10:30:00Z",
  "updatedAt": "2025-12-21T10:30:00Z"
}
```

---

### Response Body (Error) - RFC 7807

```json
{
  "type": "https://api.example.com/errors/insufficient-stock",
  "title": "Insufficient Stock",
  "status": 400,
  "detail": "Product SKU-123 has only 5 units available, but 10 were requested",
  "instance": "/api/v1/orders",
  "correlationId": "abc-123-def-456",
  "timestamp": "2025-12-21T10:30:00Z",
  "errors": [
    {
      "field": "items[0].quantity",
      "message": "Exceeds available stock"
    }
  ]
}
```

---

## 🔢 HTTP Status Codes

### Success (2xx)

| Code               | Significado      | Uso                      |
| ------------------ | ---------------- | ------------------------ |
| **200 OK**         | Success          | GET, PUT, PATCH exitosos |
| **201 Created**    | Recurso creado   | POST exitoso             |
| **204 No Content** | Success sin body | DELETE exitoso           |

### Client Errors (4xx)

| Code                         | Significado                | Uso                         |
| ---------------------------- | -------------------------- | --------------------------- |
| **400 Bad Request**          | Request inválido           | Validación falla            |
| **401 Unauthorized**         | No autenticado             | Token faltante/inválido     |
| **403 Forbidden**            | No autorizado              | Sin permisos                |
| **404 Not Found**            | Recurso no existe          | ID inválido                 |
| **409 Conflict**             | Conflicto de estado        | Duplicate, version conflict |
| **422 Unprocessable Entity** | Validación semántica falla | Business rule violation     |
| **429 Too Many Requests**    | Rate limit excedido        | Throttling                  |

### Server Errors (5xx)

| Code                          | Significado                 | Uso                   |
| ----------------------------- | --------------------------- | --------------------- |
| **500 Internal Server Error** | Error inesperado            | Bug, exception        |
| **502 Bad Gateway**           | Upstream error              | Dependency down       |
| **503 Service Unavailable**   | Servicio temporalmente down | Maintenance, overload |
| **504 Gateway Timeout**       | Upstream timeout            | Dependency lento      |

---

## 🔍 Query Parameters

### Paginación

```
GET /api/v1/products?page=2&limit=20

Response:
{
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrevious": true
  }
}
```

**Defaults**: page=1, limit=20, max_limit=100

---

### Filtrado

```
GET /api/v1/products?category=electronics&minPrice=100&maxPrice=500
```

**Convenciones**:

- camelCase para query params
- Arrays: `?tags=sale&tags=featured` o `?tags=sale,featured`
- Ranges: `minPrice`, `maxPrice`, `startDate`, `endDate`

---

### Ordenamiento

```
GET /api/v1/products?sort=price          # Ascendente
GET /api/v1/products?sort=-price         # Descendente (-)
GET /api/v1/products?sort=category,-price  # Multi-campo
```

---

### Campos Específicos (Sparse Fieldsets)

```
GET /api/v1/products?fields=id,name,price

Response:
{
  "data": [
    { "id": "1", "name": "iPhone", "price": 999 }
  ]
}
```

**Beneficio**: Reduce payload, mejora performance

---

## 🔗 HATEOAS (Hypermedia)

**Opcional** - Agregar links para navegación:

```json
{
  "id": "order_123",
  "status": "confirmed",
  "total": 150.0,
  "_links": {
    "self": { "href": "/api/v1/orders/order_123" },
    "payment": { "href": "/api/v1/payments/pay_456" },
    "cancel": { "href": "/api/v1/orders/order_123/cancel", "method": "POST" }
  }
}
```

---

## 🔐 Security Headers

### Request Headers Obligatorios

```
Authorization: Bearer <jwt_token>
Content-Type: application/json
X-Request-ID: <uuid>         # Para tracing
X-Idempotency-Key: <uuid>    # Para POST/PUT críticos
```

### Response Headers

```
Content-Type: application/json; charset=utf-8
X-Request-ID: <uuid>         # Echo del request
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640098800
```

---

## ⚡ Idempotency

Para operaciones críticas (payments, orders), usar `Idempotency-Key`:

```http
POST /api/v1/orders
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json

{
  "customerId": "cust_123",
  "items": [...]
}
```

**Backend**:

- Guardar idempotency key + response en cache (Redis, 24h)
- Si mismo key llega, retornar cached response
- Previene duplicate orders por retry

---

## 📝 OpenAPI Specification

**Obligatorio**: Todas las APIs DEBEN tener spec OpenAPI 3.0

```yaml
openapi: 3.0.0
info:
  title: Product API
  version: 1.0.0
paths:
  /products:
    get:
      summary: List products
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            default: 1
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ProductList'
```

**Beneficios**:

- Auto-generación de docs (Swagger UI)
- Contract testing
- Client SDK generation

---

## 🧪 API Testing Standards

### Contract Tests (Pact)

Asegurar que producer y consumer están alineados

### Integration Tests

```typescript
describe('GET /api/v1/products', () => {
  test('returns paginated products', async () => {
    const res = await request(app)
      .get('/api/v1/products?page=1&limit=10')
      .expect(200);

    expect(res.body.data).toHaveLength(10);
    expect(res.body.pagination.page).toBe(1);
  });
});
```

---

## 📊 Performance Optimization

### ETags para Caching

```http
# Request
GET /api/v1/products/123
If-None-Match: "686897696a7c876b7e"

# Response (si no cambió)
HTTP/1.1 304 Not Modified
ETag: "686897696a7c876b7e"
```

### Compression

```http
Accept-Encoding: gzip, deflate, br
Content-Encoding: gzip
```

---

**Versión**: 1.0  
**Última actualización**: Diciembre 2025
