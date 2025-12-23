# Non-Functional Requirements (NFRs)

## 📋 Propósito

Define **CÓMO debe comportarse el sistema** en términos de calidad: performance, escalabilidad, seguridad, disponibilidad. Son tan críticos como los funcionales.

## 🎯 Qué Contiene

- Requisitos de performance
- Escalabilidad y capacity
- Disponibilidad y confiabilidad
- Seguridad
- Mantenibilidad y operabilidad
- Usabilidad

## 🏗️ Impacto

- **Arquitectura**: NFRs dictan decisiones técnicas fundamentales
- **Infraestructura**: Definen recursos necesarios
- **Costos**: Impactan directamente en presupuesto

## ⚠️ Criticidad

NFRs ignorados causan colapsos en producción. NO son "nice to have", son OBLIGATORIOS.

---

## ⚡ Performance

### NFR-PERF-01: API Response Time

**Requisito**: P95 de latencia < 200ms para operaciones de lectura, < 500ms para escritura

**Medición**: Prometheus histograms por endpoint

**Justificación**: Google research: cada 100ms extra reduce conversión ~1%

**Estrategias**:

- Caching con Redis (TTL configurable)
- Database indexing optimizado
- Query optimization (EXPLAIN ANALYZE)
- CDN para assets estáticos

---

### NFR-PERF-02: Database Query Performance

**Requisito**: 95% de queries < 50ms, 99% < 100ms

**Medición**: Slow query log, APM (New Relic)

**Estrategias**:

- Índices en columnas de búsqueda frecuente
- Materialized views para consultas complejas
- Connection pooling (PgBouncer)
- Read replicas para queries pesadas

---

### NFR-PERF-03: Page Load Time (Frontend)

**Requisito**: First Contentful Paint < 1.5s, Time to Interactive < 3s

**Medición**: Lighthouse CI en pipeline

**Estrategias**:

- Code splitting y lazy loading
- Image optimization (WebP, lazy load)
- CDN con edge caching
- Service Worker para offline support

---

## 📈 Scalability

### NFR-SCALE-01: Horizontal Scaling

**Requisito**: Sistema debe escalar de 100 a 10,000 RPS sin cambios arquitectónicos

**Medición**: Load testing con k6

**Estrategias**:

- Stateless services (JWT, no sticky sessions)
- Database sharding preparado (no implementado en MVP)
- Message queue para desacoplar
- Auto-scaling en Kubernetes (HPA)

**Configuración HPA**:

```yaml
# Escalar cuando CPU > 70%
minReplicas: 2
maxReplicas: 20
targetCPUUtilizationPercentage: 70
```

---

### NFR-SCALE-02: Database Capacity

**Requisito**: Soportar 10M productos, 1M usuarios, 100K órdenes/día

**Crecimiento esperado**: 50% anual

**Estrategias**:

- PostgreSQL: Partitioning por fecha (orders)
- MongoDB: Sharding por SKU (catalog)
- Archival: Mover data antigua (> 2 años) a cold storage
- Monitoring de storage (alerta cuando > 80%)

---

### NFR-SCALE-03: Message Queue Throughput

**Requisito**: RabbitMQ debe procesar 1,000 mensajes/segundo con latencia < 10ms

**Medición**: RabbitMQ management metrics

**Estrategias**:

- Cluster de 3 nodos (alta disponibilidad)
- Queue durability solo para mensajes críticos
- Prefetch optimizado por consumer
- Dead letter queues para retry

---

## 🛡️ Availability & Reliability

### NFR-AVAIL-01: System Uptime

**Requisito**: 99.9% uptime mensual = ~43 minutos downtime/mes

**Medición**: Uptime monitoring (Pingdom, StatusPage)

**Estrategias**:

- Multi-AZ deployment (AWS)
- Health checks y auto-restart
- Rolling updates (zero downtime)
- Circuit breakers para dependencias externas

---

### NFR-AVAIL-02: Database Availability

**Requisito**: PostgreSQL con failover automático < 30 segundos

**Estrategias**:

- PostgreSQL replication (1 master, 2 replicas)
- Automated failover (Patroni + etcd)
- Connection pooling con retry logic
- Backup cada 6 horas, retencion 30 días

---

### NFR-RELI-01: Data Durability

**Requisito**: RPO (Recovery Point Objective) = 15 minutos, RTO (Recovery Time Objective) = 1 hora

**Medición**: Disaster recovery drills trimestrales

**Estrategias**:

- WAL archiving continuo (PostgreSQL)
- Point-in-time recovery (PITR)
- Cross-region backup replication
- Automated restore testing

---

### NFR-RELI-02: Message Delivery Guarantee

**Requisito**: At-least-once delivery para eventos críticos (orders, payments)

**Estrategias**:

- Persistent queues en RabbitMQ
- Publisher confirms + Consumer acks
- Idempotency keys en APIs
- Retry con exponential backoff

---

## 🔐 Security

### NFR-SEC-01: Authentication & Authorization

**Requisito**: JWT con RS256, tokens expirados en 24h, refresh tokens en 30 días

**Estrategias**:

- OAuth2 + OpenID Connect
- MFA obligatorio para admins
- Rate limiting: 100 req/min por IP
- Password hashing con bcrypt (cost factor 12)

---

### NFR-SEC-02: Data Encryption

**Requisito**: TLS 1.3 en tránsito, AES-256 en reposo para datos sensibles

**Estrategias**:

- Cert-manager para TLS automático (Let's Encrypt)
- Database encryption at rest (AWS RDS)
- Secrets management (HashiCorp Vault)
- PII tokenization para minimizar exposure

---

### NFR-SEC-03: Vulnerability Management

**Requisito**: Zero CVEs críticos sin parchar por > 48 horas

**Estrategias**:

- Dependabot alerts automáticos
- OWASP ZAP scans semanales
- Container scanning (Trivy) en CI/CD
- Penetration testing trimestral

---

### NFR-SEC-04: Audit Logging

**Requisito**: Todos los eventos sensibles logueados con tamper-proof storage

**Eventos a loguear**:

- Login/logout
- Cambios de permisos
- Acceso a PII
- Transacciones financieras
- Cambios de configuración

**Retention**: 5 años (compliance)

---

## 🔍 Observability

### NFR-OBS-01: Logging

**Requisito**: Structured JSON logs, centralizados en < 10 segundos

**Niveles**: ERROR, WARN, INFO, DEBUG

**Estrategias**:

- Loki para agregación
- Correlation ID en todos los logs (distributed tracing)
- Log sampling para reducir volumen (sample 10% de DEBUG)
- Retention: 30 días hot, 90 días cold, 1 año archive

---

### NFR-OBS-02: Metrics

**Requisito**: Métricas RED (Rate, Errors, Duration) + USE (Utilization, Saturation, Errors)

**Estrategias**:

- Prometheus scraping cada 15 segundos
- Grafana dashboards por servicio
- SLI dashboards para executive review
- Alerting en Alertmanager + PagerDuty

---

### NFR-OBS-03: Distributed Tracing

**Requisito**: 100% de requests traced con < 1% overhead

**Estrategias**:

- OpenTelemetry SDK en todos los servicios
- Jaeger backend para visualización
- Trace sampling inteligente (errors = 100%, success = 10%)
- Baggage propagation para context

---

## 🛠️ Maintainability

### NFR-MAINT-01: Code Quality

**Requisito**: SonarQube Quality Gate MUST PASS

**Métricas**:

- Code coverage > 80%
- Duplicación < 3%
- Complejidad ciclomática < 15 por función
- Zero critical bugs

---

### NFR-MAINT-02: Documentation

**Requisito**: Toda API documentada con OpenAPI 3.0, actualización automática

**Estrategias**:

- Swagger/OpenAPI en runtime
- Postman collections generadas automáticamente
- README por microservicio
- ADRs para decisiones arquitectónicas

---

### NFR-MAINT-03: Deployment Speed

**Requisito**: Deploy to production < 15 minutos desde merge a main

**Estrategias**:

- CI/CD pipeline optimizado
- Incremental builds (Docker layer caching)
- Parallel testing
- Blue-green deployment

---

## 🎨 Usability (Backend-focused)

### NFR-USE-01: API Developer Experience

**Requisito**: Developers pueden integrar API en < 2 horas

**Estrategias**:

- API design-first (OpenAPI spec)
- SDKs generados automáticamente
- Sandbox environment con data seed
- Comprehensive error messages (RFC 7807)

---

### NFR-USE-02: Error Handling

**Requisito**: Errores claros, accionables, con correlation ID

**Formato estándar**:

```json
{
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "Product SKU-123 has only 5 units available",
    "correlationId": "abc-123-def",
    "timestamp": "2025-12-21T10:30:00Z",
    "details": {
      "sku": "SKU-123",
      "available": 5,
      "requested": 10
    }
  }
}
```

---

## 🌍 Compliance

### NFR-COMP-01: GDPR Compliance

**Requisito**: Right to be forgotten, data portability, consent management

**Estrategias**:

- User data export API
- Account deletion cascade
- Cookie consent management
- Privacy by design

---

### NFR-COMP-02: PCI-DSS Compliance

**Requisito**: Never store card data, delegate to PCI-compliant gateway (Stripe)

**Estrategias**:

- Stripe.js para captura segura
- Tokenization de payment methods
- Regular security audits
- SAQ-A compliance

---

## 📊 Capacity Planning

### Volúmenes Esperados (12 meses)

| Métrica          | MVP (Mes 3) | Growth (Mes 6) | Scale (Mes 12) |
| ---------------- | ----------- | -------------- | -------------- |
| Usuarios activos | 1,000       | 10,000         | 50,000         |
| Productos        | 5,000       | 50,000         | 200,000        |
| Órdenes/día      | 100         | 1,000          | 10,000         |
| RPS (peak)       | 50          | 500            | 2,000          |
| Database size    | 1 GB        | 10 GB          | 100 GB         |
| Logs/día         | 5 GB        | 50 GB          | 200 GB         |

---

**Versión**: 1.0  
**Última actualización**: Diciembre 2025  
**Aprobado por**: Tech Lead & Product Owner
