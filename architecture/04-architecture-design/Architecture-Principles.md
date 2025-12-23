# Architecture Principles

## 📋 Propósito

Define los **principios rectores** que guían TODAS las decisiones arquitectónicas. Son mandamientos no negociables que aseguran consistencia y calidad.

## 🎯 Qué Contiene

- Principios técnicos
- Justificación de cada principio
- Ejemplos de aplicación
- Trade-offs asociados

---

## 🏛️ Principios Fundamentales

### 1. YAGNI (You Aren't Gonna Need It)

**Principio**: No construir features o abstracción hasta que sea absolutamente necesario

**Justificación**: Evita over-engineering, reduce complejidad, acelera delivery

**Aplicación**:
✅ MVP con features mínimas viables  
✅ Abstracciones solo cuando se identifican 3+ casos de uso reales  
✅ No diseñar para escala de millones si hoy tenemos cientos

**Anti-Ejemplo**:
❌ Implementar sharding de DB en MVP (no hay volumen que lo justifique)  
❌ Service mesh (Istio) cuando tenemos 8 servicios simples

---

### 2. KISS (Keep It Simple, Stupid)

**Principio**: Preferir soluciones simples sobre soluciones complejas

**Justificación**: Simplicidad = mantenibilidad, menos bugs, onboarding rápido

**Aplicación**:
✅ REST sobre gRPC (más universal)  
✅ PostgreSQL antes que BD exótica (NoSQL cuando haya justificación real)  
✅ Monorepo de microservicios antes que repos aislados (menos overhead inicial)

**Anti-Ejemplo**:
❌ Event sourcing cuando CRUD simple basta  
❌ GraphQL Federation cuando REST simple funciona

---

### 3. DRY (Don't Repeat Yourself) - Aplicado Con Criterio

**Principio**: No duplicar lógica de negocio, pero permitir duplicación de código infraestructural si desacopla

**Justificación**: Evita inconsistencias en business logic, pero no crea acoplamiento innecesario

**Aplicación**:
✅ Shared libraries para: validation schemas, DTOs, error handling  
✅ Duplicar modelos de datos entre servicios (cada uno su schema)  
✅ Centralizar authentication logic (IAM Service)

**Trade-off Consciente**:
⚠️ Duplicar DTOs entre frontend y backend (evita acoplamiento tight)  
⚠️ Cada servicio su propio Dockerfile (customización sin dep)

---

### 4. Single Responsibility Principle (SRP)

**Principio**: Cada componente (servicio, clase, función) debe tener UNA razón para cambiar

**Justificación**: Facilita testing, mantenimiento, ownership

**Aplicación - Servicios**:
✅ Order Service: SOLO gestión de órdenes  
✅ Payment Service: SOLO procesamiento de pagos  
❌ NO "OrderAndPaymentService"

**Aplicación - Código**:
✅ Controllers: Recibir request, validar, llamar use case, retornar response  
✅ Use Cases: Orquestar lógica de negocio  
✅ Repositories: Persistencia  
❌ NO Controllers con business logic directa

---

### 5. Dependency Inversion Principle (DIP)

**Principio**: Depender de abstracciones (interfaces), no de implementaciones concretas

**Justificación**: Testability, intercambiabilidad de dependencias

**Aplicación**:

```typescript
// ✅ CORRECTO
interface IPaymentGateway {
  processPayment(amount: number): Promise<PaymentResult>;
}

class OrderService {
  constructor(private paymentGateway: IPaymentGateway) {}
}

// ❌ INCORRECTO
class OrderService {
  constructor(private stripeClient: Stripe) {} // Acoplado a Stripe
}
```

---

### 6. Fail Fast

**Principio**: Detectar y reportar errores lo antes posible

**Justificación**: Debugging más fácil, errores no se propagan

**Aplicación**:
✅ Validar input al inicio de la función (Zod schemas)  
✅ Lanzar excepción si pre-condición no se cumple  
✅ Health checks que fallen rápido si dependency down

**Ejemplo**:

```typescript
// ✅ CORRECTO
function createOrder(userId: string, items: Item[]) {
  if (!userId) throw new ValidationError('userId is required');
  if (items.length === 0) throw new ValidationError('items cannot be empty');
  // ... continuar con lógica
}

// ❌ INCORRECTO (falla después de procesamiento)
function createOrder(userId: string, items: Item[]) {
  const order = buildOrder(userId, items); // Procesa sin validar
  if (!order.userId) throw new Error('Invalid order'); // Muy tarde
}
```

---

### 7. Defense in Depth (Seguridad en Capas)

**Principio**: Múltiples capas de seguridad, no confiar en una sola

**Justificación**: Si una capa falla, otras protegen

**Aplicación**:
✅ API Gateway (rate limiting) + Service level (auth) + DB (encryption)  
✅ Network policies (Kubernetes) + RBAC + JWT  
✅ Input validation + SQL parameterization + Audit logs

---

### 8. Design for Failure

**Principio**: Asumir que TODO fallará eventualmente

**Justificación**: Sistemas distribuidos SIEMPRE tienen fallos parciales

**Aplicación**:
✅ Circuit breakers para external APIs  
✅ Retry con exponential backoff  
✅ Timeout en TODAS las llamadas externas  
✅ Fallbacks (cache stale data si DB down)  
✅ Graceful degradation (funcionalidad reducida > downtime total)

**Ejemplo**: Si servicio de recomendaciones cae, mostrar productos populares

---

### 9. Observability First

**Principio**: Instrumentar logs, metrics, traces DESDE EL INICIO

**Justificación**: Imposible debuggear producción sin observabilidad

**Aplicación Obligatoria**:
✅ Structured JSON logs con correlation ID  
✅ Métricas RED (Rate, Errors, Duration) en todos los endpoints  
✅ Distributed tracing (OpenTelemetry)  
✅ Dashboards por servicio  
✅ Alertas configuradas antes de deploy a prod

**Anti-Ejemplo**:
❌ "Lo agregamos después cuando tengamos problemas"

---

### 10. API-First Design

**Principio**: Diseñar API antes de implementar (OpenAPI spec)

**Justificación**: Contrato claro, frontend puede trabajar en paralelo, genera docs automáticamente

**Workflow**:

1. Escribir OpenAPI spec
2. Review con Product Owner y Frontend
3. Generar mocks automáticos
4. Implementar backend
5. Validar contra spec en CI/CD

---

### 11. Immutability Where Possible

**Principio**: Preferir estructuras inmutables

**Justificación**: Thread-safety, debugging más fácil, menos bugs

**Aplicación**:
✅ `const` por defecto en TypeScript  
✅ Immutable DTOs  
✅ Event sourcing para auditoría (eventos inmutables)

---

### 12. Explicit Over Implicit

**Principio**: Preferir configuración explícita sobre convención mágica

**Justificación**: Menos sorpresas, más predecible

**Aplicación**:
✅ Dependency injection explícita  
✅ Config como código (no magia framework)  
✅ Error handling explícito (no catch-all silencioso)

**Ejemplo**:

```typescript
// ✅ CORRECTO (explícito)
class UserService {
  constructor(
    private userRepository: IUserRepository,
    private eventBus: IEventBus
  ) {}
}

// ❌ INCORRECTO (inyección mágica framework-specific)
@Injectable()
class UserService {
  // Dependencias inyectadas por decoradores
}
```

---

### 13. Backward Compatibility

**Principio**: Cambios en APIs deben ser backward-compatible o versioned

**Justificación**: Clientes existentes no deben romperse

**Aplicación**:
✅ API versioning: `/v1/orders`, `/v2/orders`  
✅ Additive changes (agregar campos opcionales)  
✅ Deprecated fields mantener por 6 meses  
❌ NO remover campos sin deprecation period

---

### 14. Test in Production (Controlled)

**Principio**: Producción es el único ambiente que refleja realidad

**Justificación**: Staging nunca replica prod exactamente

**Aplicación Segura**:
✅ Feature flags (enable/disable en runtime)  
✅ Canary deployments (1% → 10% → 50% → 100%)  
✅ A/B testing controlado  
✅ Monitoring intensivo durante rollout  
✅ Rollback automático si error rate > 1%

**NO significa**:
❌ Deploy sin testing previo  
❌ Experimentar sin controles

---

### 15. Documentation as Code

**Principio**: Documentación vive junto al código, en Git

**Justificación**: Documentación separada se desactualiza

**Aplicación**:
✅ README por microservicio  
✅ ADRs (Architecture Decision Records) en `/docs/adr`  
✅ OpenAPI specs generadas desde código  
✅ Runbooks en Markdown versionado

---

## 🚫 Anti-Patterns Prohibidos

### ❌ 1. Premature Optimization

**No optimizar sin medir primero**  
Ejemplo: NO agregar Redis cache si endpoint es 50ms

### ❌ 2. God Services / God Classes

**No servicios que hacen todo**  
Ejemplo: NO "CoreBusinessService" con 50 métodos

### ❌ 3. Leaky Abstractions

**Abstracciones que exponen detalles de implementación**  
Ejemplo: NO retornar Prisma models directamente, usar DTOs

### ❌ 4. Silenced Errors

**No catch-all que ignoran errores**

```typescript
// ❌ PROHIBIDO
try {
  // ...
} catch (e) {
  console.log(e); // Log y continuar = ocultar error
}
```

### ❌ 5. Shared Mutable State

**No estado compartido entre servicios**  
Ejemplo: NO variables globales, NO shared database write

---

## 🎯 Principios de Decisión

### Cuando Evaluar Tradeoffs:

1. **Simplicidad vs Performance**: Preferir simplicidad hasta que performance sea problema medido
2. **Consistencia vs Disponibilidad**: E-commerce prefiere Disponibilidad (eventual consistency OK)
3. **Autonomía vs Estandarización**: Autonomía de equipos, pero estándares en cross-cutting concerns (auth, logging)

### Matriz de Decisión:

| Criterio       | Peso | ¿Cómo medir?                      |
| -------------- | ---- | --------------------------------- |
| Mantenibilidad | 30%  | Code coverage, complexity metrics |
| Performance    | 25%  | P95 latency, throughput           |
| Time to Market | 20%  | Lead time, deployment frequency   |
| Costo          | 15%  | Cloud spend, license fees         |
| Escalabilidad  | 10%  | Load testing results              |

---

## ✅ Checklist de Compliance

Al diseñar cualquier componente, verificar:

- [ ] Cumple YAGNI (¿realmente lo necesitamos HOY?)
- [ ] Es simple (¿podría ser más simple?)
- [ ] Single responsibility (¿hace UNA cosa bien?)
- [ ] Testeable (¿puede testearse aisladamente?)
- [ ] Observable (¿logs, metrics, traces?)
- [ ] Seguro (¿validación, auth, encryption?)
- [ ] Fault-tolerant (¿qué pasa si falla?)
- [ ] Documentado (¿README, ADR si es decisión importante?)

---

**Versión**: 1.0  
**Última actualización**: Diciembre 2025  
**Aprobado por**: Software Architect & Tech Lead  
**Revisión obligatoria**: En cada code review
