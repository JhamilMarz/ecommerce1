# CHECKPOINT TEMPLATES

Templates detallados para implementación por fases.

---

## FASE A — CORE (Domain + Application)

### Alcance

✓ Domain Layer (Entities + Repository Interfaces)  
✓ Application Layer (Use Cases + Service Interfaces)  
✓ Configuration básica (config, logger)

### Estructura de Archivos

```
src/
├── domain/
│   ├── entities/
│   │   ├── [Entity1].ts
│   │   └── [Entity2].ts
│   └── repositories/
│       ├── I[Entity1]Repository.ts
│       └── I[Entity2]Repository.ts
│
├── application/
│   ├── interfaces/
│   │   ├── I[Service1].ts
│   │   └── I[Service2].ts
│   └── use-cases/
│       ├── [UseCase1].ts
│       ├── [UseCase2].ts
│       └── [UseCase3].ts
│
└── infrastructure/
    ├── config/
    │   └── index.ts
    └── logger/
        └── index.ts
```

### Entregables Mínimos

- [ ] Todas las entities con métodos de dominio
- [ ] Interfaces de repositorios completas
- [ ] Todos los use cases implementados
- [ ] Interfaces de servicios de infraestructura
- [ ] Config y logger básico

### Tests Requeridos

- [ ] Unit tests de cada use case
- [ ] Coverage >= 80% de use cases
- [ ] Mock de repositories
- [ ] Validación de lógica de negocio

### Criterios de Aceptación

- ✅ Lógica de negocio completamente independiente
- ✅ Cero dependencias de frameworks
- ✅ Interfaces claras para inversión de dependencias
- ✅ Tests pasan sin base de datos real

---

## FASE B — INFRASTRUCTURE DATA

### Alcance

✓ Database setup (Sequelize/Prisma/MongoDB)  
✓ Models con migraciones  
✓ Repository implementations  
✓ External services (JWT, Hashing, etc.)

### Estructura de Archivos

```
src/infrastructure/
├── database/
│   ├── index.ts                    # Connection setup
│   ├── models/
│   │   ├── [Model1].ts
│   │   └── [Model2].ts
│   ├── repositories/
│   │   ├── [Entity1]Repository.ts
│   │   └── [Entity2]Repository.ts
│   └── migrations/
│       └── [timestamp]-create-tables.js
│
└── services/
    ├── JwtService.ts
    ├── PasswordHashingService.ts
    └── [OtherService].ts
```

### Entregables Mínimos

- [ ] Sequelize/Prisma configurado y conectado
- [ ] Models con constraints e indexes
- [ ] Repositories implementados
- [ ] Services de infraestructura (JWT, hashing, etc.)
- [ ] Migraciones ejecutables

### Tests Requeridos

- [ ] Integration tests de repositories con DB real/mock
- [ ] Unit tests de services (JWT, hashing)
- [ ] Coverage >= 75% de repositories
- [ ] Validación de constraints de DB

### Criterios de Aceptación

- ✅ Conexión a base de datos funciona
- ✅ CRUD operations ejecutables
- ✅ Transacciones funcionan correctamente
- ✅ Services cumplen contratos de interfaces

---

## FASE C — INFRASTRUCTURE HTTP + MESSAGING

### Alcance

✓ Controllers  
✓ Routes con validación  
✓ Middlewares (auth, rate limit, cors, etc.)  
✓ Event Publisher/Consumer (RabbitMQ)  
✓ Server setup

### Estructura de Archivos

```
src/
├── infrastructure/
│   ├── http/
│   │   ├── [Controller].ts
│   │   ├── routes.ts
│   │   └── schemas.ts
│   │
│   ├── middleware/
│   │   ├── correlation-id.ts
│   │   ├── request-logger.ts
│   │   ├── error-handler.ts
│   │   └── validate-request.ts
│   │
│   └── messaging/
│       ├── RabbitMQEventPublisher.ts
│       └── [Consumer].ts (si aplica)
│
├── types/
│   └── express.d.ts
│
└── index.ts                        # Server entry point
```

### Entregables Mínimos

- [ ] Controllers con manejo de errores
- [ ] Routes con rate limiting
- [ ] Validation schemas (Joi/Zod)
- [ ] Middlewares de seguridad
- [ ] Event publisher configurado
- [ ] Server con graceful shutdown

### Tests Requeridos

- [ ] E2E tests de todos los endpoints
- [ ] Tests de middlewares
- [ ] Tests de validación de inputs
- [ ] Coverage >= 75% de controllers
- [ ] Tests de integración con RabbitMQ

### Criterios de Aceptación

- ✅ Todos los endpoints responden correctamente
- ✅ Validación rechaza inputs inválidos
- ✅ Rate limiting funciona
- ✅ Events se publican a RabbitMQ
- ✅ Graceful shutdown funciona

---

## FASE D — TESTING + DOCUMENTATION

### Alcance

✓ Tests faltantes  
✓ Coverage >= 80% total  
✓ Manual testing  
✓ Documentación completa

### Estructura de Archivos

```
[service]/
├── src/__tests__/             # Tests existentes
│
├── tests/
│   ├── manual/
│   │   └── api.curl.md
│   └── postman/
│       ├── [Service].postman_collection.json
│       └── Environment.postman_environment.json
│
├── TEST-[SERVICE].md
└── CHECKPOINT-X-VALIDATION.md
```

### Entregables Mínimos

- [ ] Unit tests completos (100% use cases)
- [ ] Integration tests completos (100% repositories)
- [ ] E2E tests completos (100% endpoints)
- [ ] Coverage >= 80% total
- [ ] Manual tests (curl: 10+ escenarios)
- [ ] Postman collection completa
- [ ] TEST-[SERVICE].md (500 palabras)
- [ ] CHECKPOINT-X-VALIDATION.md

### Tests por Tipo

#### Unit Tests

```typescript
// Use Cases
describe('[UseCase]', () => {
  it('should execute successfully with valid input')
  it('should throw error with invalid input')
  it('should call repository methods correctly')
})

// Services
describe('[Service]', () => {
  it('should perform operation correctly')
  it('should handle errors properly')
})
```

#### Integration Tests

```typescript
// Repositories
describe('[Repository]', () => {
  it('should create entity in database')
  it('should find entity by id')
  it('should update entity')
  it('should delete entity')
})
```

#### E2E Tests

```typescript
// Endpoints
describe('[Endpoint]', () => {
  it('should return 200 with valid request')
  it('should return 400 with invalid input')
  it('should return 401 without auth')
  it('should return 500 on server error')
})
```

### Manual Tests Structure (api.curl.md)

````markdown
# API Manual Tests - [Service]

## Prerequisites

- Service running on port [PORT]
- [Other requirements]

## 1. [Test Name]

**Endpoint:** [METHOD] /api/v1/[path]
**Description:** [What this tests]

### Request

```bash
curl -X [METHOD] http://localhost:[PORT]/api/v1/[path] \
  -H "Content-Type: application/json" \
  -d '{...}'
```
````

### Expected Response

```json
{...}
```

### Notes

- [Important details]

````

### Postman Collection Structure

```json
{
  "info": { "name": "[Service] API" },
  "variable": [
    { "key": "baseUrl", "value": "http://localhost:[PORT]" },
    { "key": "token", "value": "" }
  ],
  "item": [
    {
      "name": "[Endpoint Category]",
      "item": [
        {
          "name": "[Request Name]",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test('Status is 200', () => {",
                  "  pm.response.to.have.status(200);",
                  "});"
                ]
              }
            }
          ],
          "request": {...}
        }
      ]
    }
  ]
}
````

### TEST-[SERVICE].md Structure (500 palabras)

```markdown
# TEST-[SERVICE].md

## Propósito

[Qué hace este servicio]

## Setup

[Cómo instalar y configurar]

## Variables de Entorno

[Lista de env vars requeridas]

## Cómo Ejecutarlo

[Comandos para dev y production]

## Cómo Probarlo

### Tests Automatizados

[Comandos de test]

### Tests Manuales

[Instrucciones de curl/Postman]

## Integración con Arquitectura

[Cómo se integra con otros servicios]

## Riesgos y Consideraciones

[Qué tener en cuenta]
```

### CHECKPOINT-X-VALIDATION.md Structure

```markdown
# CHECKPOINT X — [SERVICE] VALIDATION

## Resumen Ejecutivo

[Qué se implementó]

## Arquitectura Aplicada

[Clean Architecture layers]

## Seguridad

[Medidas de seguridad implementadas]

## Observabilidad

[Logging, tracing, metrics]

## Testing

[Coverage, tests ejecutados]

## Integración con Gateway

[Cómo se comunica con API Gateway]

## Riesgos Detectados

[Issues encontrados y mitigación]

## Próximos Pasos

[Qué sigue en próximo checkpoint]
```

### Criterios de Aceptación

- ✅ `pnpm test:coverage` pasa con >= 80%
- ✅ Curl tests ejecutables sin errores
- ✅ Postman collection importable
- ✅ Documentación completa y clara
- ✅ No hay TODOs ni código comentado
- ✅ Validation report generado

---

## Checklist de Validación por Fase

### Al Finalizar Fase A

```
□ Domain entities creadas
□ Repository interfaces definidas
□ Use cases implementados
□ Service interfaces definidas
□ Tests unitarios de use cases pasan
□ Coverage >= 80% de use cases
□ Cero dependencias de frameworks
```

### Al Finalizar Fase B

```
□ Database conectada
□ Models creados con indexes
□ Repositories implementados
□ Services implementados
□ Tests de repositories pasan
□ Coverage >= 75% de repositories
□ Migraciones ejecutables
```

### Al Finalizar Fase C

```
□ Controllers implementados
□ Routes configuradas
□ Middlewares funcionando
□ Event publisher conectado
□ Server arranca sin errores
□ Tests E2E pasan
□ Coverage >= 75% de controllers
```

### Al Finalizar Fase D

```
□ Coverage total >= 80%
□ Todos los tests pasan
□ Manual tests documentados
□ Postman collection creada
□ TEST-[SERVICE].md completo
□ CHECKPOINT-X-VALIDATION.md completo
□ Confirmación para próximo checkpoint
```

---

## Estimación de Tiempo

| Fase             | Archivos  | Tiempo Estimado | Turnos         |
| ---------------- | --------- | --------------- | -------------- |
| A - Core         | 8-12      | 2-3 horas       | 1 turno        |
| B - Data         | 6-10      | 2-3 horas       | 1 turno        |
| C - HTTP         | 8-12      | 2-3 horas       | 1 turno        |
| D - Tests + Docs | 5-8       | 2-4 horas       | 1-2 turnos     |
| **TOTAL**        | **27-42** | **8-13 horas**  | **4-5 turnos** |

---

## Prompts Sugeridos por Fase

### Fase A

```
Implementa CHECKPOINT X.A — [SERVICE] CORE

CONTEXTO:
- Nuevo microservicio basado en Clean Architecture
- Stack: TypeScript + Node 18.20.8

ALCANCE:
1. Domain Layer: [listar entities]
2. Application Layer: [listar use cases]
3. Configuration básica

ENTREGABLES:
- Entities con lógica de negocio
- Repository interfaces
- Use cases con validación
- Tests unitarios coverage >= 80%

VALIDACIÓN:
- Tests pasan sin DB real
- Cero dependencias de frameworks
```

### Fase B

```
Implementa CHECKPOINT X.B — [SERVICE] INFRASTRUCTURE DATA

CONTEXTO:
- Fase X.A completada
- Domain y Application layers listos

ALCANCE:
1. Sequelize setup + models
2. Repository implementations
3. Services (JWT, hashing, etc.)

ENTREGABLES:
- DB conectada
- CRUD operations funcionales
- Tests de repositories >= 75%

VALIDACIÓN:
- Conexión exitosa
- Tests con DB real/mock pasan
```

### Fase C

```
Implementa CHECKPOINT X.C — [SERVICE] INFRASTRUCTURE HTTP

CONTEXTO:
- Fases X.A y X.B completadas
- Core + Data layers listos

ALCANCE:
1. Controllers + Routes
2. Middlewares de seguridad
3. RabbitMQ publisher
4. Server setup

ENTREGABLES:
- Endpoints funcionales
- Rate limiting activo
- Tests E2E >= 75%

VALIDACIÓN:
- Server arranca
- Endpoints responden
- Events se publican
```

### Fase D

```
Implementa CHECKPOINT X.D — [SERVICE] TESTING + DOCS

CONTEXTO:
- Fases X.A, X.B, X.C completadas
- Servicio funcional end-to-end

ALCANCE:
1. Tests faltantes
2. Manual testing
3. Documentación completa

ENTREGABLES:
- Coverage >= 80% total
- api.curl.md + Postman
- TEST-[SERVICE].md
- CHECKPOINT-X-VALIDATION.md

VALIDACIÓN:
- `pnpm test:coverage` pasa
- Manual tests ejecutables
- Documentación completa
```
