# TEST-AUTH.md — Auth Service Testing Guide

## 1. Propósito del Servicio

El **Auth Service** es el microservicio responsable de autenticación y autorización en el sistema e-commerce. Implementa JWT con refresh tokens rotativos, hash de passwords con Argon2, roles de usuario (customer/seller/admin), y comunicación asíncrona vía RabbitMQ para eventos de autenticación.

**Funcionalidades principales:**

- Registro seguro con validación de password fuerte
- Login con generación de access + refresh tokens
- Token refresh con rotación automática
- Logout single/multi-device
- Consulta de usuario actual

## 2. Setup

### Prerequisites

- **Node.js 18.20.8** (fixed version)
- **PostgreSQL 14+** con database `auth_db`
- **RabbitMQ 3.11+** corriendo en puerto 5672
- **pnpm 9.15.0**

### Instalación

```bash
# Desde el root del monorepo
cd apps/auth-service

# Instalar dependencias
pnpm install

# Crear archivo .env (copiar de .env.example)
cp .env.example .env
```

## 3. Variables de Entorno

Configurar en `.env`:

```bash
# Server
NODE_ENV=development
AUTH_SERVICE_PORT=3001
AUTH_SERVICE_HOST=0.0.0.0

# JWT Secrets (CAMBIAR EN PRODUCCIÓN)
JWT_ACCESS_SECRET=your-super-secret-access-key-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars
JWT_ACCESS_EXPIRES_IN=900          # 15 minutos
JWT_REFRESH_EXPIRES_IN=604800      # 7 días

# PostgreSQL
AUTH_DB_HOST=localhost
AUTH_DB_PORT=5432
AUTH_DB_NAME=auth_db
AUTH_DB_USER=postgres
AUTH_DB_PASSWORD=postgres

# RabbitMQ
RABBITMQ_URL=amqp://localhost:5672
RABBITMQ_EXCHANGE=auth.events

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000        # 15 min
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGIN=*
```

## 4. Cómo Ejecutarlo

### Development

```bash
pnpm dev
```

Esto inicia el servicio en modo watch con hot reload.

### Production Build

```bash
pnpm build
pnpm start
```

### Verificar Health

```bash
curl http://localhost:3001/health
# Respuesta esperada: {"status":"ok","service":"auth-service"}
```

## 5. Cómo Probarlo Manualmente

### A. Tests con curl

Ver documentación completa en `tests/manual/api.curl.md` (11 escenarios).

**Flujo básico:**

```bash
# 1. Registrar usuario
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!@#"}'

# 2. Login
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!@#"}'

# Guardar tokens de la respuesta
export ACCESS_TOKEN="..."
export REFRESH_TOKEN="..."

# 3. Refresh token
curl -X POST http://localhost:3001/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}"
```

### B. Tests con Postman

1. Importar colección: `tests/postman/Auth.postman_collection.json`
2. Importar environment: `tests/postman/Local.postman_environment.json`
3. Ejecutar requests en orden (auto-captura de tokens configurada)

**Features:**

- Auto-extracción de `accessToken`, `refreshToken`, `userId`
- Tests automáticos con assertions
- Variables de colección actualizadas automáticamente

### C. Tests Automatizados

```bash
# Unit tests
pnpm test

# Coverage report
pnpm test:coverage

# Watch mode
pnpm test:watch
```

**Coverage targets:**

- Use Cases: >= 85%
- Services: >= 80%
- Repositories: >= 75%
- Overall: >= 80%

## 6. Cómo Validar Seguridad

### Password Strength

El servicio valida:

- Mínimo 8 caracteres
- Al menos 1 mayúscula
- Al menos 1 minúscula
- Al menos 1 número
- Al menos 1 carácter especial

```bash
# ❌ Rechazado
curl -X POST .../register -d '{"email":"test@test.com","password":"weak"}'

# ✅ Aceptado
curl -X POST .../register -d '{"email":"test@test.com","password":"Strong123!@#"}'
```

### Token Security

- **Access token:** 15 minutos (corta duración)
- **Refresh token:** 7 días (larga duración)
- Secrets separados para access/refresh
- Issuer: `auth-service`
- Audience: `api-gateway` (access) / `auth-service` (refresh)
- Algoritmo: HS256

### Password Hashing

- **Algoritmo:** Argon2id (recomendado por OWASP)
- **Memory cost:** 64 MB
- **Time cost:** 3 iterations
- **Parallelism:** 4 threads

### Rate Limiting

- **Window:** 15 minutos
- **Max requests:** 100 por IP
- **Endpoints protegidos:** /register, /login, /refresh

### SQL Injection Protection

- Sequelize ORM con prepared statements
- Validación Joi en todos los inputs
- Email lowercase normalizado

### Correlation ID

Cada request tiene UUID v4 para trazabilidad en logs.

## 7. Integración con API Gateway

En producción, el Auth Service NO debe exponerse directamente. El flujo es:

```
Client → API Gateway → Auth Service
```

**Headers forwarded by Gateway:**

- `X-Correlation-ID` (tracing)
- `X-User-Id` (para endpoints protegidos como /me, /logout)

**Endpoints públicos** (sin auth):

- POST /api/v1/auth/register
- POST /api/v1/auth/login
- POST /api/v1/auth/refresh

**Endpoints protegidos** (requieren JWT validado por Gateway):

- GET /api/v1/auth/me
- POST /api/v1/auth/logout

## 8. Troubleshooting

**Error:** `ECONNREFUSED PostgreSQL`

- Verificar que PostgreSQL está corriendo
- Verificar credenciales en .env

**Error:** `ECONNREFUSED RabbitMQ`

- Verificar que RabbitMQ está corriendo
- Verificar RABBITMQ_URL en .env

**Error:** `Too many requests`

- Rate limiting activado
- Esperar 15 minutos o cambiar IP

**Error:** `Invalid or expired refresh token`

- Token revocado (logout)
- Token expirado (>7 días)
- Token inválido (manipulado)

## 9. Arquitectura Interna

**Clean Architecture aplicada:**

```
Domain Layer:
- entities/User.ts (UserRole enum, validation methods)
- entities/RefreshToken.ts (expiration logic)
- repositories/I*.ts (interfaces)

Application Layer:
- use-cases/*.ts (business logic)
- interfaces/I*.ts (service contracts)

Infrastructure Layer:
- database/ (Sequelize models, repositories)
- services/ (JWT, Argon2)
- messaging/ (RabbitMQ publisher)
- http/ (Controllers, routes, schemas)
- middleware/ (correlation-id, logger, error-handler, validation)
```

**Dependency Injection:**
Manual DI container en `index.ts` con inversión de dependencias correcta.

## 10. Próximos Pasos

Después de validar este servicio:

- ✅ Integrar con API Gateway (CHECKPOINT 2)
- ⏳ Implementar Product Service (CHECKPOINT 4)
- ⏳ Implementar Order Service con Saga pattern (CHECKPOINT 5)
