# Risks Register (Registro de Riesgos)

## 📋 Propósito

Registro completo de **riesgos técnicos y arquitectónicos** identificados, evaluados, priorizados y mitigados.

## 🎯 Matriz de Evaluación

**Probabilidad**: Baja (1), Media (2), Alta (3)  
**Impacto**: Bajo (1), Medio (2), Alto (3), Crítico (4)  
**Severidad**: Probabilidad × Impacto

---

## 🚨 Riesgos Críticos (Severidad 9-12)

### RISK-001: Fallo del Payment Gateway (Stripe)

**Categoría**: Dependencia Externa  
**Probabilidad**: Media (2)  
**Impacto**: Crítico (4)  
**Severidad**: **8** (Alto)

**Descripción**:  
Si Stripe API está caído o tiene latencias altas, no podemos procesar pagos, bloqueando completamente las ventas.

**Consecuencias**:

- Revenue loss directo (cada minuto sin pagos = pérdidas)
- Pérdida de confianza de usuarios
- Órdenes atascadas en estado "Pending Payment"

**Mitigaciones**:

1. ✅ **Circuit Breaker**: Abrir circuito si Stripe falla > 50% en 1 minuto
2. ✅ **Fallback a PayPal**: Si Stripe down, ofrecer PayPal como alternativa
3. ✅ **Queue de retry**: Reintento automático cada 1 min por 10 intentos
4. ✅ **Alerting**: PagerDuty si payment success rate < 95%
5. ✅ **Status page**: Comunicar a usuarios si hay issues conocidos

**Mitigaciones futuras (Post-MVP)**:

- Multi-gateway (agregar Adyen, PayPal Checkout)
- Offline payment methods (bank transfer, cash on delivery)

**Owner**: Payment Service Team  
**Fecha de revisión**: Trimestral

---

### RISK-002: Database Corruption / Data Loss

**Categoría**: Infraestructura  
**Probabilidad**: Baja (1)  
**Impacto**: Crítico (4)  
**Severidad**: **4** (Medio-Alto)

**Descripción**:  
Pérdida o corrupción de datos en PostgreSQL/MongoDB debido a fallo de hardware, bug, o error humano.

**Consecuencias**:

- Pérdida de órdenes, pagos, usuarios
- Imposibilidad de recuperar transacciones
- Pérdida de confianza total

**Mitigaciones**:

1. ✅ **Backups automatizados**: Cada 6 horas, retention 30 días
2. ✅ **Point-in-time recovery**: WAL archiving (PostgreSQL)
3. ✅ **Cross-region replication**: Backup en otra región (us-west-2)
4. ✅ **Restore testing**: DR drill trimestral
5. ✅ **Immutable backups**: Backups en S3 con versioning habilitado

**Mitigaciones en progreso**:

- [ ] Automated restore testing (mensual)
- [ ] Chaos engineering (Chaos Monkey para DB)

**Owner**: DevOps Team  
**Fecha de revisión**: Mensual

---

### RISK-003: Escalabilidad Insuficiente en Black Friday

**Categoría**: Performance / Escalabilidad  
**Probabilidad**: Alta (3)  
**Impacto**: Alto (3)  
**Severidad**: **9** (Crítico)

**Descripción**:  
Durante picos de tráfico (Black Friday, lanzamientos), sistema colapsa por falta de capacity.

**Consecuencias**:

- Downtime durante el día más importante del año
- Revenue loss masivo (millones)
- Reputación dañada permanentemente

**Mitigaciones**:

1. ✅ **Load testing previo**: k6 tests con 10× tráfico esperado
2. ✅ **Auto-scaling agresivo**: HPA con threshold bajo (60% CPU)
3. ✅ **Caching masivo**: Redis con TTL corto para catálogo
4. ✅ **CDN**: CloudFront para assets estáticos
5. ✅ **Database read replicas**: Queries pesadas a replicas
6. ✅ **Queue-based processing**: Tareas no críticas a background jobs

**Plan de Black Friday**:

- [ ] 2 semanas antes: Load test en staging
- [ ] 1 semana antes: Pre-scaling (3× instancias normales)
- [ ] Durante evento: On-call team 24/7, war room

**Owner**: Platform Team + SRE  
**Fecha de revisión**: Mensual hasta Black Friday

---

## ⚠️ Riesgos Altos (Severidad 6-8)

### RISK-004: Security Breach / Data Leak

**Categoría**: Seguridad  
**Probabilidad**: Media (2)  
**Impacto**: Crítico (4)  
**Severidad**: **8** (Alto)

**Descripción**:  
Ataque exitoso que expone datos sensibles (PII, passwords, payment info).

**Consecuencias**:

- Multas GDPR (hasta 4% revenue anual)
- Lawsuits de usuarios
- Pérdida total de confianza
- Shutdown regulatorio

**Mitigaciones**:

1. ✅ **Penetration testing**: Trimestral por firma externa
2. ✅ **OWASP ZAP scans**: Semanal automático
3. ✅ **Dependency scanning**: Snyk diario
4. ✅ **WAF**: CloudFlare para bloquear ataques comunes
5. ✅ **Encryption at rest**: AES-256 para datos sensibles
6. ✅ **No almacenar payment data**: Delegate a Stripe (PCI-DSS)
7. ✅ **Audit logging**: Todos los accesos a PII logueados

**Incident Response Plan**:

- [ ] Playbook documentado (contención, notificación, recovery)
- [ ] < 72 horas notificación GDPR
- [ ] Cyber insurance

**Owner**: Security Team  
**Fecha de revisión**: Trimestral

---

### RISK-005: Key Person Risk (Bus Factor)

**Categoría**: Equipo  
**Probabilidad**: Media (2)  
**Impacto**: Alto (3)  
**Severidad**: **6** (Alto)

**Descripción**:  
Si Tech Lead o Architect clave sale/enferma, conocimiento crítico se pierde.

**Consecuencias**:

- Decisiones arquitectónicas bloqueadas
- Onboarding lento para reemplazo
- Velocity drop significativo

**Mitigaciones**:

1. ✅ **Documentación exhaustiva**: Todo en /architecture
2. ✅ **Knowledge sharing**: Weekly architecture guild
3. ✅ **Pair programming**: Rotar parejas semanalmente
4. ✅ **Code reviews**: Al menos 2 reviewers por PR crítico
5. ✅ **Rotation**: Developers rotan entre servicios (cross-training)

**Mitigaciones en progreso**:

- [ ] Sucesión planning (identify 2nd in command)
- [ ] Video recordings de architectural decisions

**Owner**: Tech Lead + HR  
**Fecha de revisión**: Trimestral

---

### RISK-006: Vendor Lock-in (AWS)

**Categoría**: Infraestructura  
**Probabilidad**: Alta (3)  
**Impacto**: Medio (2)  
**Severidad**: **6** (Alto)

**Descripción**:  
Uso intensivo de servicios AWS propietarios hace imposible migración a otro cloud.

**Consecuencias**:

- Incrementos de precios sin alternativa
- Outages regionales nos afectan sin opción de failover
- Negociación débil con AWS

**Mitigaciones**:

1. ✅ **Abstraction layer**: No usar AWS SDK directamente en domain logic
2. ✅ **Kubernetes**: Portable entre clouds
3. ✅ **Open-source first**: PostgreSQL, Redis, RabbitMQ (no RDS, ElastiCache, SQS)
4. ⚠️ **Multi-cloud strategy (Fase 3)**: GCP como backup

**Aceptación consciente**:

- En MVP, vendor lock-in parcial es aceptable por velocidad
- Post-MVP, abstraer servicios propietarios

**Owner**: Platform Team  
**Fecha de revisión**: Anual

---

## 📊 Riesgos Medios (Severidad 3-5)

### RISK-007: Tech Debt Accumulation

**Probabilidad**: Alta (3)  
**Impacto**: Medio (2)  
**Severidad**: **6**

**Mitigación**: 20% del sprint dedicado a tech debt, no negociable

---

### RISK-008: Team Burnout (High Velocity)

**Probabilidad**: Media (2)  
**Impacto**: Alto (3)  
**Severidad**: **6**

**Mitigación**: On-call rotation justa, PTO enforcement, sustainable pace

---

### RISK-009: Microservices Overhead Complexity

**Probabilidad**: Media (2)  
**Impacto**: Medio (2)  
**Severidad**: **4**

**Mitigación**: Observability first, runbooks detallados, automation

---

### RISK-010: Dependency on Third-Party APIs (SendGrid, Logistics)

**Probabilidad**: Media (2)  
**Impacto**: Bajo (1)  
**Severidad**: **2**

**Mitigación**: Fallback providers, queue-based retry, graceful degradation

---

## 📈 Registro de Cambios

| Fecha      | Riesgo   | Cambio  | Owner         |
| ---------- | -------- | ------- | ------------- |
| 2025-12-21 | RISK-001 | Created | Payment Team  |
| 2025-12-21 | RISK-002 | Created | DevOps Team   |
| 2025-12-21 | RISK-003 | Created | Platform Team |

---

## 🔄 Proceso de Gestión de Riesgos

### Identificación

- Sprint retrospectives
- Post-mortems de incidentes
- Architecture reviews
- Security audits

### Evaluación

- Probabilidad × Impacto = Severidad
- Priorización en backlog

### Mitigación

- Plan de acción documentado
- Owner asignado
- Timeline definido

### Monitoreo

- Revisión mensual en tech all-hands
- Tracking en Jira/Notion

---

**Versión**: 1.0  
**Última actualización**: Diciembre 2025  
**Próxima revisión completa**: Marzo 2026  
**Owner**: Tech Lead + Risk Committee
