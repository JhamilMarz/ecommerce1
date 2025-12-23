# ADR-001: Adopción de Arquitectura de Microservicios

**Status**: Accepted  
**Date**: 2025-12-21  
**Deciders**: Tech Lead, Software Architect, Product Owner  
**Technical Story**: Definir estilo arquitectónico del sistema

---

## Context

Estamos construyendo una plataforma de e-commerce desde cero (greenfield). Necesitamos decidir el estilo arquitectónico que guiará todo el desarrollo.

### Opciones Consideradas:

1. Monolito Modular
2. Arquitectura de Microservicios
3. Serverless (Functions as a Service)

---

## Decision

**Adoptamos Arquitectura de Microservicios** con los siguientes bounded contexts como servicios independientes:

- IAM Service
- Catalog Service
- Inventory Service
- Customer Service
- Order Service
- Payment Service
- Shipping Service
- Notification Service

---

## Rationale (Justificación)

### Por qué SI Microservicios:

✅ **Escalabilidad Independiente**:  
El tráfico no es uniforme. En Black Friday, Order Service necesita 10x más recursos que Customer Service. Con microservicios, escalamos solo lo necesario, reduciendo costos.

✅ **Deploy Independiente**:  
Podemos desplegar cambios en Payment Service sin tocar Order Service. Reduce blast radius y permite mayor frecuencia de deploys (objetivo: 5+ deploys/semana).

✅ **Autonomía de Equipos**:  
Plan de crecimiento a 15 developers en 12 meses. Microservicios permiten equipos pequeños (3-4 devs) con ownership completo, manteniendo velocidad (Conway's Law).

✅ **Tolerancia a Fallos**:  
Si Notification Service cae, el sistema sigue funcionando (emails quedan en cola). En monolito, un bug de memoria en notificaciones tira TODO el sistema.

✅ **Tecnología Heterogénea (Futuro)**:  
Aunque iniciamos con Node.js en todos, la arquitectura permite cambiar el stack de servicios específicos si fuera necesario (ej: Go para servicio de alta performance).

✅ **Alineación con DDD**:  
Nuestro análisis de dominio identificó 8 bounded contexts claros. Microservicios mapean naturalmente a estos contextos.

### Por qué NO Monolito:

❌ **Escalabilidad**: Escalar TODO el monolito es ineficiente  
❌ **Deploy Risk**: Un cambio pequeño requiere redeploy completo  
❌ **Team Scaling**: Equipos grandes en un codebase generan conflictos de merge, code reviews lentos  
❌ **Tech Debt**: Monolitos tienden a Big Ball of Mud con el tiempo

### Por qué NO Serverless Puro:

❌ **Cold Start Latency**: Inaceptable para e-commerce (objetivo P95 < 200ms)  
❌ **Vendor Lock-in**: Fuerte acoplamiento a AWS Lambda o GCP Functions  
❌ **Debugging Complejo**: Distributed tracing más difícil  
❌ **Costo Impredecible**: Para tráfico constante, Kubernetes es más económico

**Nota**: Usaremos serverless para casos puntuales (image processing, batch jobs), no como arquitectura principal.

---

## Consequences

### Positivas:

✅ Sistema escalable y resiliente  
✅ Equipos autónomos y veloces  
✅ Deploy frecuente y seguro  
✅ Fallos aislados

### Negativas (Aceptadas):

⚠️ **Complejidad Operacional**: Necesitamos Kubernetes, service mesh (futuro), distributed tracing

- **Mitigación**: Invertir en observability desde día 1, herramientas maduras (Prometheus, Grafana)

⚠️ **Eventual Consistency**: No hay transacciones ACID globales

- **Mitigación**: Saga pattern para flujos que requieren coordinación (order + payment + inventory)

⚠️ **Network Latency**: Comunicación inter-servicio añade latencia

- **Mitigación**: Minimizar llamadas síncronas, usar eventos, caching agresivo

⚠️ **Testing E2E Complejo**: Testar flujos que cruzan servicios es más complejo

- **Mitigación**: Contract testing (Pact), test environments con todos los servicios, feature flags

### Riesgos:

🚨 **Distributed Monolith**: Riesgo de crear microservicios con alta dependencia (peor de ambos mundos)

- **Mitigación**: Diseño cuidadoso de bounded contexts, evitar llamadas síncronas en cadena

🚨 **Over-Engineering Inicial**: Tentación de crear demasiados servicios

- **Mitigación**: Iniciar con servicios core (8), YAGNI riguroso

---

## Implementation Details

### Fases:

**Fase 1 (MVP - 6 meses)**: 8 microservicios core  
**Fase 2 (Growth)**: Posible split de servicios si crecen > 50k LOC  
**Fase 3 (Scale)**: Service mesh (Istio) si complejidad lo justifica

### Tech Stack:

- **Runtime**: Node.js + TypeScript (experiencia del equipo)
- **Communication**: REST (sync) + RabbitMQ (async)
- **Orchestration**: Kubernetes
- **Observability**: Prometheus + Grafana + Loki + Jaeger

### Governance:

- Cada servicio DEBE tener su BD propia (no shared database)
- APIs DEBEN ser RESTful y versionadas (`/v1/`)
- Eventos DEBEN seguir schema registry (JSON Schema)
- Health checks (`/health`) y metrics (`/metrics`) obligatorios

---

## Alternatives Considered

### Alternativa 1: Monolito Modular

**Pros**: Más simple inicialmente, transacciones ACID fáciles  
**Cons**: No escala con equipo, deploy riesgoso  
**Por qué no**: No alinea con plan de growth de equipo y negocio

### Alternativa 2: Serverless Puro

**Pros**: Zero ops de infraestructura, auto-scaling infinito  
**Cons**: Cold start, vendor lock-in, costo alto para tráfico constante  
**Por qué no**: E-commerce requiere latencias predecibles y consistentes

---

## Related ADRs

- ADR-002: [Database per Service Pattern](ADR-002-database-per-service.md)
- ADR-003: [Event-Driven Communication Strategy](ADR-003-event-driven-communication.md)
- ADR-004: [Saga Pattern for Distributed Transactions](ADR-004-saga-pattern.md)

---

## References

- [Martin Fowler - Microservices](https://martinfowler.com/articles/microservices.html)
- [Sam Newman - Building Microservices](https://samnewman.io/books/building_microservices/)
- [Bounded-Context-Map.md](../../02-context/Bounded-Context-Map.md)

---

**Author**: Software Architect  
**Reviewers**: Tech Lead, DevOps Lead, Product Owner  
**Next Review**: Q2 2026 (post-MVP evaluation)
