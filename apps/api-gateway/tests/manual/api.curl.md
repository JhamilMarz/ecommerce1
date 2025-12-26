# API Gateway - Manual Testing with curl

## Prerequisitos

- API Gateway corriendo en `http://localhost:3000`
- Auth Service corriendo en `http://localhost:3001`

## 1. Health Check

```bash
curl -X GET http://localhost:3000/health
```

**Respuesta esperada:**

```json
{
  "status": "ok",
  "service": "api-gateway",
  "timestamp": "2025-12-26T..."
}
```

## 2. Status / Observabilidad

```bash
curl -X GET http://localhost:3000/status
```

**Respuesta esperada:**

```json
{
  "status": "operational",
  "service": "api-gateway",
  "version": "1.0.0",
  "uptime": "120s",
  "timestamp": "2025-12-26T...",
  "memory": {
    "rss": "45MB",
    "heapTotal": "20MB",
    "heapUsed": "15MB",
    "external": "2MB"
  },
  "environment": "development",
  "upstreamServices": {
    "auth": "http://localhost:3001",
    "product": "http://localhost:3002",
    ...
  }
}
```

## 3. Auth - Register (Public, no JWT)

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "SecurePass123!",
    "role": "customer"
  }'
```

**Respuesta esperada:**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid-here",
    "email": "testuser@example.com",
    "role": "customer"
  }
}
```

## 4. Auth - Login (Public, no JWT)

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "SecurePass123!"
  }'
```

**Respuesta esperada:**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid-here",
    "email": "testuser@example.com",
    "role": "customer"
  }
}
```

**⚠️ Guardar el accessToken para los siguientes tests**

## 5. Products - List (Optional JWT)

### Sin autenticación:

```bash
curl -X GET http://localhost:3000/api/v1/products
```

### Con autenticación:

```bash
export TOKEN="eyJhbGciOiJIUzI1NiIs..."

curl -X GET http://localhost:3000/api/v1/products \
  -H "Authorization: Bearer $TOKEN"
```

**Respuesta esperada:** Lista de productos (o 503 si product-service no está corriendo)

## 6. Orders - List (JWT Required)

### Sin token (debe fallar con 401):

```bash
curl -X GET http://localhost:3000/api/v1/orders
```

**Respuesta esperada:**

```json
{
  "error": "Unauthorized",
  "message": "Missing Authorization header",
  "correlationId": "uuid-here"
}
```

### Con token válido:

```bash
export TOKEN="eyJhbGciOiJIUzI1NiIs..."

curl -X GET http://localhost:3000/api/v1/orders \
  -H "Authorization: Bearer $TOKEN"
```

**Respuesta esperada:** Lista de órdenes (o 503 si order-service no está corriendo)

## 7. Payments - Create (JWT Required)

```bash
export TOKEN="eyJhbGciOiJIUzI1NiIs..."

curl -X POST http://localhost:3000/api/v1/payments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "order-uuid-here",
    "amount": 99.99,
    "paymentMethod": "credit_card"
  }'
```

## 8. Correlation ID - Custom

```bash
curl -X GET http://localhost:3000/health \
  -H "X-Correlation-ID: my-custom-trace-id-123"
```

**Verificar:** El response header debe incluir `X-Correlation-ID: my-custom-trace-id-123`

## 9. Invalid JWT Test

```bash
curl -X GET http://localhost:3000/api/v1/orders \
  -H "Authorization: Bearer invalid-token-here"
```

**Respuesta esperada:**

```json
{
  "error": "Unauthorized",
  "message": "Invalid token",
  "correlationId": "uuid-here"
}
```

## 10. Rate Limiting Test

```bash
# Ejecutar 1001 requests para superar el límite (1000 req/15min)
for i in {1..1001}; do
  curl -X GET http://localhost:3000/health
done
```

**Respuesta esperada (en request #1001):**

```
Too many requests from this IP, please try again later.
```

## Notas

- Todos los responses incluyen el header `X-Correlation-ID`
- Los endpoints protegidos requieren header `Authorization: Bearer <token>`
- El rate limit es de 1000 requests por 15 minutos por IP
- Los logs se escriben en formato JSON estructurado con correlation ID
