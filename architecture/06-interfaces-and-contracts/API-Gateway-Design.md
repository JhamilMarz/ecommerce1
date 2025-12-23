# API Gateway Design

## 📋 Propósito

Define el diseño del **API Gateway** como punto de entrada único para todas las peticiones de clientes externos.

## 🎯 Responsabilidades del API Gateway

### 1. Routing

Enrutar peticiones a los microservicios correspondientes

### 2. Authentication

Validar JWT tokens antes de pasar request al backend

### 3. Rate Limiting

Proteger contra abuso y DDoS

### 4. Request/Response Transformation

Agregar headers, transform payloads si necesario

### 5. API Composition (BFF Pattern)

Agregar múltiples backend calls en una sola response

---

## 🏗️ Tech Stack

**Gateway**: Kong Gateway (open source) o AWS API Gateway

**Por qué Kong**:
✅ Open source, cloud-agnostic  
✅ Plugin ecosystem rico  
✅ Alta performance (Nginx core)  
✅ Kubernetes-native (Ingress controller)

**Alternativa**: AWS API Gateway (si full AWS stack)

---

## 🔀 Routing Rules

### Service Discovery

```yaml
# Kong declarative config
services:
  - name: iam-service
    url: http://iam-service.default.svc.cluster.local:3000
    routes:
      - name: auth-routes
        paths:
          - /api/v1/auth
          - /api/v1/users

  - name: catalog-service
    url: http://catalog-service.default.svc.cluster.local:3000
    routes:
      - name: product-routes
        paths:
          - /api/v1/products
          - /api/v1/categories

  - name: order-service
    url: http://order-service.default.svc.cluster.local:3000
    routes:
      - name: order-routes
        paths:
          - /api/v1/orders
          - /api/v1/cart
```

---

## 🔐 Authentication Plugin

### JWT Validation

```yaml
plugins:
  - name: jwt
    config:
      uri_param_names:
        - jwt
      header_names:
        - Authorization
      key_claim_name: iss
      secret_is_base64: false
      anonymous: null
      run_on_preflight: true
```

**Flow**:

1. Client envía `Authorization: Bearer <token>`
2. Kong extrae token
3. Valida firma con public key
4. Si válido, pasa request a backend con header `X-User-Id`
5. Si inválido, retorna 401

---

## 🚦 Rate Limiting

### Límites por Endpoint

```yaml
plugins:
  - name: rate-limiting
    route: auth-routes
    config:
      minute: 5 # 5 requests/minuto para login
      policy: local
      fault_tolerant: true

  - name: rate-limiting
    route: product-routes
    config:
      minute: 100 # 100 requests/minuto para catálogo
      hour: 1000
      policy: redis # Usar Redis para distributed rate limiting
```

**Políticas**:

- **Login**: 5 req/min (prevenir brute force)
- **API pública**: 100 req/min por IP
- **API autenticada**: 1000 req/min por usuario

---

## 🔄 CORS Configuration

```yaml
plugins:
  - name: cors
    config:
      origins:
        - https://app.ecommerce.com
        - https://admin.ecommerce.com
      methods:
        - GET
        - POST
        - PUT
        - PATCH
        - DELETE
      headers:
        - Authorization
        - Content-Type
        - X-Request-ID
      exposed_headers:
        - X-RateLimit-Limit
        - X-RateLimit-Remaining
      credentials: true
      max_age: 3600
```

---

## 📊 Logging & Monitoring

### Request Logging

```yaml
plugins:
  - name: file-log
    config:
      path: /var/log/kong/access.log
      reopen: true

  - name: prometheus
    config:
      per_consumer: true
```

**Métricas expuestas**:

- Request rate por servicio
- Latency (P50, P95, P99)
- Error rate (4xx, 5xx)
- Upstream health

---

## 🔧 Health Checks

```yaml
# Kong health checks para upstream services
upstreams:
  - name: order-service-upstream
    healthchecks:
      active:
        http_path: /health
        healthy:
          interval: 5
          successes: 2
        unhealthy:
          interval: 5
          http_failures: 3
          timeouts: 2
```

---

## 🚀 API Composition (BFF)

Para reducir round trips, el gateway puede componer responses:

**Ejemplo**: GET /api/v1/orders/:id (full details)

```javascript
// Gateway plugin custom
async function composeOrderDetails(orderId) {
  const [order, customer, shipping] = await Promise.all([
    http.get(`http://order-service/orders/${orderId}`),
    http.get(`http://customer-service/customers/${order.customerId}`),
    http.get(`http://shipping-service/shipments?orderId=${orderId}`),
  ]);

  return {
    ...order,
    customer: {
      name: customer.name,
      email: customer.email,
    },
    shipping: shipping,
  };
}
```

**Trade-off**: Agrega lógica al gateway (aumenta complejidad), pero mejora performance del cliente

---

## 📈 Caching

```yaml
plugins:
  - name: proxy-cache
    route: product-routes
    config:
      strategy: memory
      content_type:
        - application/json
      cache_ttl: 300 # 5 minutos
      cache_control: false
```

**Qué cachear**:
✅ Catálogo de productos (TTL: 5 min)  
✅ Categorías (TTL: 1 hora)  
❌ Órdenes (datos sensibles, cambian constantemente)  
❌ Carrito (usuario-específico)

---

## 🔒 Security Headers

```yaml
plugins:
  - name: response-transformer
    config:
      add:
        headers:
          - 'X-Frame-Options: DENY'
          - 'X-Content-Type-Options: nosniff'
          - 'X-XSS-Protection: 1; mode=block'
          - 'Strict-Transport-Security: max-age=31536000'
```

---

## 🌐 Multi-Region (Fase 3)

Para deployment global:

```
                  GeoDNS (Route 53)
                        |
        ┌───────────────┼───────────────┐
        |               |               |
   [US Gateway]    [EU Gateway]   [APAC Gateway]
        |               |               |
   US Services     EU Services    APAC Services
```

---

**Versión**: 1.0  
**Última actualización**: Diciembre 2025
