# Constraints (Restricciones del Sistema)

## 📋 Propósito

Documenta las **limitaciones y restricciones** bajo las cuales debe diseñarse el sistema. Son decisiones NO negociables que moldean la arquitectura.

## 🎯 Qué Contiene

- Restricciones técnicas
- Restricciones de negocio
- Restricciones regulatorias
- Restricciones de tiempo y presupuesto
- Restricciones de equipo

## 🏗️ Impacto

Las constraints LIMITAN el espacio de diseño. Violarlas invalida la arquitectura.

## ⚠️ Criticidad

Ignorar constraints lleva a soluciones no viables que deben ser re-hechas.

---

## 💻 Restricciones Técnicas

### CONST-TECH-01: Stack Tecnológico Obligatorio

**Restricción**: Backend DEBE ser Node.js + TypeScript

**Justificación**:

- Experiencia del equipo actual
- Ecosistema maduro (npm, frameworks)
- Performance adecuado para caso de uso
- Full-stack JavaScript (compartir código con frontend)

**Impacto**: No se pueden usar alternativas (Python, Java, Go)

---

### CONST-TECH-02: Arquitectura de Microservicios

**Restricción**: Sistema DEBE estructurarse como microservicios independientes

**Justificación**:

- Escalabilidad independiente
- Deploy aislado (reduce riesgo)
- Ownership claro por equipo
- Tecnología heterogénea si fuera necesario

**Impacto**: No monolito, mayor complejidad operacional

---

### CONST-TECH-03: Comunicación HTTP REST + RabbitMQ

**Restricción**: Sync = REST, Async = RabbitMQ (no Kafka, no gRPC en MVP)

**Justificación**:

- REST: Universal, bien entendido por equipo
- RabbitMQ: Más simple que Kafka para volumen inicial
- YAGNI: No necesitamos Kafka hasta > 100k mensajes/seg

**Impacto**: No usar gRPC (futuro posible), no Kafka en MVP

---

### CONST-TECH-04: Bases de Datos

**Restricción**: PostgreSQL (relacional) + MongoDB (documentos), NO otras BDs en MVP

**Justificación**:

- PostgreSQL: ACID, bien conocida, tooling maduro
- MongoDB: Flexibilidad para catálogo con atributos dinámicos
- Minimizar complejidad operacional (solo 2 tipos de BD)

**Impacto**: No Redis como BD principal (solo cache), No Neo4j, No ElasticSearch como source of truth

---

### CONST-TECH-05: Cloud Provider

**Restricción**: AWS o GCP (TBD), NO on-premise, NO multi-cloud en MVP

**Justificación**:

- Managed services reducen overhead operacional
- Escalabilidad elástica
- Costo predictible
- Multi-cloud agrega complejidad innecesaria inicialmente

**Impacto**: Vendor lock-in aceptable, abstracción ligera para posible migración futura

---

### CONST-TECH-06: Contenedores y Kubernetes

**Restricción**: Todos los servicios DEBEN desplegarse en containers (Docker) sobre Kubernetes

**Justificación**:

- Portabilidad
- Scaling automático
- Rollout controlado
- Industry standard

**Impacto**: No VMs directas, no serverless puro (aunque Lambda puede usarse para casos específicos)

---

## 💰 Restricciones de Negocio

### CONST-BIZ-01: Presupuesto de Infraestructura

**Restricción**: Costo cloud < $2,000 USD/mes en primeros 6 meses

**Justificación**: Startup en fase inicial, budget limitado

**Impacto**:

- Right-sizing de recursos
- No over-provisioning
- Monitoreo estricto de costos
- Posible trade-off en redundancia (2 replicas vs 3)

---

### CONST-BIZ-02: Time to Market

**Restricción**: MVP funcional en producción en < 6 meses

**Justificación**: Ventana de oportunidad de mercado

**Impacto**:

- Priorización estricta (MoSCoW)
- NO over-engineering
- MVP con features core, iteración post-launch
- Tech debt controlado pero aceptable

---

### CONST-BIZ-03: Equipo Pequeño

**Restricción**: Máximo 5 desarrolladores backend en primeros 6 meses

**Justificación**: Limitaciones de hiring y presupuesto

**Impacto**:

- Arquitectura debe ser simple
- Automatización obligatoria (CI/CD, testing, deploy)
- Documentación crítica
- No puede haber microservicios > 8 (cada dev maneja ~2 servicios max)

---

## 📜 Restricciones Regulatorias

### CONST-REG-01: GDPR Compliance

**Restricción**: DEBE cumplir GDPR (si opera en EU)

**Requisitos**:

- Right to be forgotten
- Data portability
- Consent management
- Data breach notification (< 72 horas)

**Impacto**:

- Diseño de data model con deletion en mente
- Audit logging completo
- Encryption en reposo
- Privacy by design

---

### CONST-REG-02: PCI-DSS Compliance

**Restricción**: NUNCA almacenar datos de tarjetas (delegate a Stripe)

**Requisitos**:

- SAQ-A compliance (más simple)
- Tokenization de payment methods
- Stripe.js para captura segura (nunca tocar datos de tarjeta en nuestro backend)

**Impacto**:

- Dependencia crítica de Stripe
- No procesamiento directo de pagos
- Auditorías de seguridad obligatorias

---

### CONST-REG-03: Data Residency

**Restricción**: Datos de usuarios EU DEBEN almacenarse en EU (GDPR)

**Justificación**: Compliance GDPR

**Impacto**:

- Multi-region deployment futuro
- Estrategia de sharding por región
- Cross-region replication con restricciones

---

## ⏱️ Restricciones de Tiempo

### CONST-TIME-01: Roadmap Phases

**Restricción**: Desarrollo en 3 fases estrictas

**Fase 1 - MVP (Meses 0-6)**:

- Features mínimas viables (MoSCoW: Must Have)
- No optimización prematura
- Tech debt documentado pero aceptable

**Fase 2 - Growth (Meses 6-12)**:

- Features adicionales (Should Have)
- Optimización de performance
- Reducción de tech debt

**Fase 3 - Scale (Meses 12-18)**:

- Features avanzadas (Could Have)
- Preparación para escala masiva
- Multi-region

**Impacto**: NO construir para Fase 3 en Fase 1 (YAGNI)

---

### CONST-TIME-02: Sprint Duration

**Restricción**: Sprints de 2 semanas, NO negociable

**Justificación**: Balance entre planning overhead y flexibilidad

**Impacto**:

- Features deben ser entregables en 2 semanas
- Épicas deben dividirse
- Reviews y retrospectives cada 2 semanas

---

## 👥 Restricciones de Equipo

### CONST-TEAM-01: Experiencia del Equipo

**Restricción**: Equipo tiene experiencia en Node.js/TypeScript, NO en Java/C#

**Justificación**: Realidad del equipo actual

**Impacto**:

- Stack debe alinearse con experiencia
- Curva de aprendizaje mínima
- NO adoptar tecnologías exóticas sin justificación fuerte

---

### CONST-TEAM-02: Ubicación Distribuida

**Restricción**: Equipo 100% remoto, zonas horarias UTC-3 a UTC+1

**Justificación**: Remote-first company

**Impacto**:

- Comunicación async prioritaria
- Documentación exhaustiva obligatoria
- Overlap de 4 horas diarias para sync
- Tooling para colaboración (Slack, Notion, Figma)

---

### CONST-TEAM-03: On-Call Rotation

**Restricción**: DEBE haber on-call 24/7 desde producción

**Justificación**: E-commerce no puede estar offline

**Impacto**:

- Rotación de 1 semana
- Runbooks detallados
- Alerting inteligente (no fatiga)
- Compensación de on-call

---

## 🔒 Restricciones de Seguridad

### CONST-SEC-01: Zero Trust Architecture

**Restricción**: NO confiar en red interna, autenticación/autorización en cada request

**Justificación**: Best practice de seguridad moderna

**Impacto**:

- JWT en comunicación service-to-service
- mTLS para comunicación crítica
- No "security by obscurity"

---

### CONST-SEC-02: Secret Management

**Restricción**: NO secrets en código ni env vars (usar Vault o AWS Secrets Manager)

**Justificación**: Evitar leaks

**Impacto**:

- Secrets inyectados en runtime
- Rotación automática de secrets
- Auditoría de accesos

---

## 📦 Restricciones de Deployment

### CONST-DEPLOY-01: Immutable Infrastructure

**Restricción**: NO modificar infraestructura en vivo, siempre deploy nuevo

**Justificación**: Consistencia, reproducibilidad

**Impacto**:

- Blue-green deployment
- Rollback = redeploy versión anterior
- Infrastructure as Code obligatorio

---

### CONST-DEPLOY-02: Zero Downtime Deployments

**Restricción**: Deploy DEBE ser sin downtime

**Justificación**: E-commerce 24/7

**Impacto**:

- Rolling updates
- Health checks antes de traffic routing
- Backward-compatible database migrations

---

## 🧪 Restricciones de Testing

### CONST-TEST-01: Test Coverage Mínimo

**Restricción**: Code coverage > 80% obligatorio para merge

**Justificación**: Calidad de código, confianza en deploys

**Impacto**:

- CI pipeline bloquea si coverage < 80%
- Unit tests obligatorios
- Integration tests para flujos críticos

---

### CONST-TEST-02: Testing en Pipeline

**Restricción**: TODO test debe ejecutarse en CI/CD automáticamente

**Justificación**: Evitar "funciona en mi máquina"

**Impacto**:

- Ambientes de testing reproducibles (Docker)
- Test time < 15 minutos (parallel execution)
- Flaky tests = broken builds

---

## 🚫 Anti-Patterns Prohibidos

### NO hacer:

❌ Monorepo (por ahora, repos independientes por microservicio)  
❌ Shared database entre microservicios  
❌ Sincronous calls en cadena (max 2 niveles)  
❌ Logs sin estructura (solo structured JSON)  
❌ Deployments manuales (todo via CI/CD)  
❌ Secrets en Git  
❌ Código sin tests  
❌ APIs sin versionado

---

## 📊 Matriz de Constraints por Impacto

| Constraint                    | Severidad | Negociable | Owner         |
| ----------------------------- | --------- | ---------- | ------------- |
| CONST-TECH-01 (Node.js)       | Alta      | NO         | Tech Lead     |
| CONST-TECH-02 (Microservices) | Alta      | NO         | Architect     |
| CONST-BIZ-01 (Budget)         | Media     | Parcial    | CFO           |
| CONST-BIZ-02 (6 meses)        | Alta      | NO         | Product Owner |
| CONST-REG-01 (GDPR)           | Crítica   | NO         | Legal         |
| CONST-REG-02 (PCI-DSS)        | Crítica   | NO         | Legal         |
| CONST-TEAM-01 (Experiencia)   | Media     | NO         | Tech Lead     |

---

## 🔄 Revisión de Constraints

**Frecuencia**: Trimestral

**Proceso**:

1. Validar si constraints siguen vigentes
2. Evaluar impacto de cambios
3. Documentar excepciones justificadas
4. Actualizar ADRs si hay cambios mayores

---

**Versión**: 1.0  
**Última actualización**: Diciembre 2025  
**Aprobado por**: Tech Lead, Product Owner, Legal  
**Próxima revisión**: Marzo 2026
