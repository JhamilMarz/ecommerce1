# TEST-GATEWAY.md

## Propósito

API Gateway es el punto de entrada único del sistema e-commerce. Centraliza seguridad (JWT), observabilidad (correlation ID, logs estructurados) y routing hacia 5 microservicios: Auth, Products, Orders, Payments, Notifications.

## Qué Hace

- **Versionado**: Todas las rutas bajo `/api/v1` para evolución controlada
- **Seguridad JWT**: Valida tokens Bearer, protege rutas sensibles, forward user claims a servicios downstream
- **Observabilidad**: Correlation ID único por request (X-Correlation-ID), logs JSON estructurados (method, path, status, duration)
- **Routing**: Proxy transparente a microservicios con headers enriquecidos (X-User-Id, X-User-Email, X-User-Role, X-Correlation-ID)
- **Salud**: Endpoints `/health` (uptime check) y `/status` (métricas operacionales)

## Cómo Instalar

```bash
cd apps/api-gateway
pnpm install
```

## Variables de Entorno

Crear `.env` en `apps/api-gateway/`:

```env
NODE_ENV=development
PORT=3000
JWT_SECRET=your-super-secret-key-change-in-production

# Microservices URLs
AUTH_SERVICE_URL=http://localhost:3001
PRODUCTS_SERVICE_URL=http://localhost:3002
ORDERS_SERVICE_URL=http://localhost:3003
PAYMENTS_SERVICE_URL=http://localhost:3004
NOTIFICATIONS_SERVICE_URL=http://localhost:3005
```

## Cómo Ejecutar

```bash
# Development mode con watch
pnpm dev

# Production build
pnpm build
pnpm start
```

## Cómo Probar

### Tests Automatizados

```bash
# Unit + Integration tests
pnpm test

# Coverage report (objetivo 80%+)
pnpm test:coverage
```

### Tests Manuales

**Opción 1: Curl**

- Ver `tests/manual/api.curl.md` para 10 escenarios de prueba

**Opción 2: Postman**

- Importar `tests/postman/API-Gateway.postman_collection.json`
- Importar environment `tests/postman/Local.postman_environment.json`
- Ejecutar colección completa con tests automatizados:
  1. Health & Status (público)
  2. Auth Register/Login (captura tokens automáticamente)
  3. Products (opcional JWT)
  4. Orders (JWT requerido)
  5. Payments (JWT requerido)

## Integración con Arquitectura

Gateway implementa **Capa de Infraestructura** (Clean Architecture Layer 4):

- Middlewares en `infrastructure/middleware/`: correlation-id, request-logger, jwt-validation
- Routes en `infrastructure/routes/`: config de proxying con `http-proxy-middleware`
- Config en `infrastructure/config/`: variables centralizadas

Principios aplicados: **SOLID** (SRP en middlewares), **KISS** (lógica simple sin sobre-ingeniería), **DRY** (reutilización de JWT middleware), **YAGNI** (solo lo necesario), **SINE** (seguridad integrada desde diseño).

**Flujo de Request**:

1. Correlation ID middleware genera/propaga ID único
2. Request logger captura entrada
3. Helmet + CORS aplican headers de seguridad
4. Body parsers procesan JSON
5. JWT middleware valida autenticación (si aplica)
6. Router proxy forward a microservicio con headers enriquecidos
7. Request logger captura respuesta con duration
8. Error handler maneja excepciones centralizadas
