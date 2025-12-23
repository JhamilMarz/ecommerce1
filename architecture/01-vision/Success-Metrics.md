# Success Metrics

## 📋 Propósito del Documento

Define las **métricas concretas y medibles** que determinarán si el sistema cumple su propósito. Establece umbrales objetivos de éxito o fallo. Es el contrato de calidad entre el equipo técnico y el negocio.

## 🎯 Qué Debe Contener

- Métricas técnicas (SLIs, SLOs, SLAs)
- Métricas de negocio (conversión, revenue, engagement)
- Métricas de calidad (bugs, performance, disponibilidad)
- Umbrales de alerta y umbrales críticos
- Frecuencia de medición y ownership

## 🏗️ Impacto en la Arquitectura

- **Observabilidad**: Define qué instrumentar (logs, métricas, trazas)
- **Alerting**: Establece qué monitorear proactivamente
- **Testing**: Determina qué validar antes de deploy
- **Capacity planning**: Guía decisiones de escalamiento

## ⚠️ Criticidad en Sistemas de Gran Escala

Sin métricas claras:

- No se sabe cuándo el sistema está fallando
- Los problemas se detectan cuando ya impactaron usuarios
- No hay datos para justificar mejoras técnicas
- Imposible hacer post-mortems objetivos

---

## 📊 Categorías de Métricas

### 1. Service Level Indicators (SLIs)

**Definición**: Métricas técnicas cuantitativas del comportamiento del servicio.

### 2. Service Level Objectives (SLOs)

**Definición**: Umbrales objetivo para los SLIs. Son compromisos internos del equipo.

### 3. Service Level Agreements (SLAs)

**Definición**: Compromisos contractuales con clientes. Violarlos tiene penalizaciones económicas.

**Relación**: `SLA < SLO < Realidad` (el SLO debe tener margen vs el SLA)

---

## 🎯 Métricas de Disponibilidad

### SLI: Availability

**Fórmula**: `(Requests exitosos / Total requests) × 100`

**Targets**:

- **SLO**: 99.9% uptime mensual = ~43 minutos downtime/mes
- **SLA**: 99.5% uptime mensual = ~3.6 horas downtime/mes
- **Target ideal**: 99.95% uptime

**Ventana de medición**: Rolling 30 días

**Exclusiones** (no cuentan contra disponibilidad):

- Mantenimientos programados (notificados 72h antes)
- Ataques DDoS masivos
- Fallos de proveedores críticos (AWS outage regional)

**Penalizaciones por incumplimiento de SLA**:

- 99.5% - 99.0%: 10% crédito del mes
- 99.0% - 98.0%: 25% crédito del mes
- < 98.0%: 50% crédito del mes

**Instrumentación**:

```typescript
// Healthcheck endpoint obligatorio en cada microservicio
GET /health → 200 OK (healthy) | 503 Service Unavailable (unhealthy)
```

**Monitoreo**: Prometheus + Alertmanager + PagerDuty

---

## ⚡ Métricas de Performance

### SLI: Request Latency

**Fórmula**: Percentil 95 (P95) del tiempo de respuesta del API

**Targets por tipo de operación**:

| Operación        | P95 Target | P99 Target | Criticidad |
| ---------------- | ---------- | ---------- | ---------- |
| GET /products    | < 100ms    | < 300ms    | Alta       |
| POST /orders     | < 200ms    | < 500ms    | Crítica    |
| POST /payments   | < 500ms    | < 1000ms   | Crítica    |
| GET /orders/:id  | < 150ms    | < 400ms    | Media      |
| Admin operations | < 1000ms   | < 2000ms   | Baja       |

**Justificación de targets**:

- Google recomienda < 200ms para buena UX
- Cada 100ms de latencia reduce conversión ~1%
- Operaciones críticas (checkout) toleran más latencia

**Instrumentación**:

```typescript
// Middleware de timing en cada request
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    metrics.histogram('http_request_duration_ms', duration, {
      method: req.method,
      route: req.route?.path,
      status: res.statusCode,
    });
  });
  next();
});
```

**Alertas**:

- **Warning**: P95 > target por 10 minutos consecutivos
- **Critical**: P95 > 2× target por 5 minutos consecutivos

---

## 🔥 Métricas de Throughput

### SLI: Requests per Second (RPS)

**Descripción**: Capacidad de procesamiento del sistema

**Targets**:

- **Mínimo aceptable**: 100 RPS sostenido
- **Target operativo**: 500 RPS sostenido
- **Picos esperados**: 2,000 RPS durante 15 minutos (Black Friday)

**Crecimiento esperado**: +20% mensual en primeros 6 meses

**Dimensionamiento**:

- Cada instancia de microservicio: ~50 RPS
- Auto-scaling: escalar cuando CPU > 70% por 3 minutos
- Mínimo 2 réplicas por servicio (alta disponibilidad)

**Instrumentación**:

```typescript
// Counter de requests por endpoint
metrics.counter('http_requests_total', {
  method: req.method,
  route: req.route?.path,
  status: res.statusCode,
});
```

---

## 💥 Métricas de Error Rate

### SLI: Error Rate

**Fórmula**: `(Requests con 5xx / Total requests) × 100`

**Targets**:

- **SLO**: < 0.1% error rate (99.9% success rate)
- **SLA**: < 1% error rate (99% success rate)
- **Target ideal**: < 0.01% error rate

**Clasificación de errores**:

| Código        | Tipo           | Cuenta contra SLO? | Acción               |
| ------------- | -------------- | ------------------ | -------------------- |
| 4xx (400-499) | Client error   | NO                 | Log para analytics   |
| 429           | Rate limiting  | NO                 | Esperado bajo ataque |
| 5xx (500-599) | Server error   | SÍ                 | Alerta inmediata     |
| Timeout       | Infrastructure | SÍ                 | Investigar latencia  |

**Instrumentación**:

```typescript
// Error tracking
metrics.counter('http_errors_total', {
  method: req.method,
  route: req.route?.path,
  status: res.statusCode,
  error_type: error.constructor.name,
});
```

**Alertas**:

- **Warning**: Error rate > 0.5% por 5 minutos
- **Critical**: Error rate > 1% por 2 minutos
- **Page**: Error rate > 5% inmediatamente

---

## 🔄 Métricas de Deployment

### DORA Metrics

Medición de la madurez de ingeniería del equipo.

#### 1. Deployment Frequency

**Target**: Al menos **5 deploys/semana** en producción

**Medición**: Conteo de merges a rama `main` que llegan a producción

**Benchmark**:

- Elite: Multiple deploys/día
- High: 1-6 deploys/semana ← **Nuestro target**
- Medium: 1-4 deploys/mes
- Low: < 1 deploy/mes

#### 2. Lead Time for Changes

**Target**: < **2 horas** desde commit hasta producción

**Medición**: Timestamp del commit → timestamp del deploy exitoso

**Componentes**:

- Build time: < 10 minutos
- Test time: < 15 minutos
- Review time: < 4 horas (humano)
- Deploy time: < 5 minutos

#### 3. Change Failure Rate

**Target**: < **5%** de deploys causan incidente

**Medición**: (Deploys con rollback o hotfix / Total deploys) × 100

**Prevención**:

- Testing automatizado > 80% coverage
- Feature flags para kill-switch
- Canary deployments (10% → 50% → 100%)

#### 4. Mean Time To Recovery (MTTR)

**Target**: < **1 hora** desde detección hasta resolución

**Medición**: Timestamp alerta → timestamp servicio restaurado

**Estrategias**:

- Rollback automatizado en < 5 minutos
- Runbooks detallados por tipo de incidente
- On-call rotation con escalation clara

---

## 📈 Métricas de Negocio

### Conversion Rate

**Fórmula**: `(Órdenes completadas / Sesiones con productos vistos) × 100`

**Target**: > 3% conversión

**Tracking**:

- Google Analytics + custom events
- Funnel: Landing → Product View → Add to Cart → Checkout → Payment → Success

**Correlación con métricas técnicas**:

- Latencia P95 < 200ms → +1.5% conversión
- Error rate > 1% → -5% conversión
- Downtime → -100% conversión durante ventana

### Average Order Value (AOV)

**Fórmula**: `Total revenue / Número de órdenes`

**Target**: > $50 USD

**Métricas relacionadas**:

- Productos por orden: > 2.5
- Uso de descuentos: < 30% de órdenes

### Customer Lifetime Value (CLV)

**Fórmula**: `(Valor promedio de orden × Frecuencia de compra × Vida del cliente)`

**Target**: > $500 USD

**Tracking**: Cohort analysis mensual

---

## 🧪 Métricas de Calidad del Código

### Code Coverage

**Target**: > **80%** líneas cubiertas por tests

**Medición**: Jest/Vitest coverage reports

**Desglose por tipo de test**:

- Unit tests: > 85% coverage
- Integration tests: > 70% coverage
- E2E tests: Core flows cubiertos

**Enforcement**: CI/CD bloquea merge si coverage < 80%

### Technical Debt Ratio

**Fórmula**: `(Esfuerzo para remediar / Esfuerzo de desarrollo total) × 100`

**Target**: < **5%** (deuda bajo control)

**Medición**: SonarQube analysis

**Umbrales**:

- < 5%: Excelente (verde)
- 5-10%: Aceptable (amarillo)
- 10-20%: Preocupante (naranja)
- \> 20%: Crítico (rojo) - Bloquear features

### Bug Density

**Fórmula**: `Bugs encontrados en producción / 1000 líneas de código`

**Target**: < **0.5 bugs/KLOC**

**Clasificación**:

- **P0 - Critical**: Sistema down o pérdida de datos
- **P1 - High**: Feature principal rota
- **P2 - Medium**: Bug menor con workaround
- **P3 - Low**: Mejora cosmética

---

## 🔐 Métricas de Seguridad

### Security Incidents

**Target**: **0 incidentes críticos de seguridad** al año

**Clasificación**:

- **Critical**: Data breach, credenciales expuestas
- **High**: Vulnerabilidad explotable detectada
- **Medium**: Configuración insegura sin explotación
- **Low**: Dependencia con CVE no crítico

**Medición**:

- OWASP ZAP scans semanales
- Dependabot alerts automáticos
- Penetration testing trimestral

### Mean Time To Patch (MTTP)

**Target**: < **24 horas** para vulnerabilidades críticas

**Proceso**:

1. Detección de CVE
2. Evaluación de impacto
3. Patch aplicado
4. Despliegue a producción
5. Validación

---

## 📉 Umbrales y Alerting

### Niveles de Severidad

| Nivel         | Condición             | Notificación        | SLA de respuesta |
| ------------- | --------------------- | ------------------- | ---------------- |
| **INFO**      | Métricas normales     | Dashboard           | N/A              |
| **WARNING**   | Tendencia preocupante | Slack               | 1 hora           |
| **ERROR**     | Umbral superado       | Slack + Email       | 30 minutos       |
| **CRITICAL**  | Servicio degradado    | PagerDuty (on-call) | 15 minutos       |
| **EMERGENCY** | Outage total          | PagerDuty + Phone   | 5 minutos        |

### Configuración de Alertas

```yaml
# Ejemplo de alerta en Prometheus
groups:
  - name: api_latency
    interval: 30s
    rules:
      - alert: HighLatency
        expr: histogram_quantile(0.95, http_request_duration_ms) > 200
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: 'API latency P95 > 200ms'

      - alert: CriticalLatency
        expr: histogram_quantile(0.95, http_request_duration_ms) > 500
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: 'API latency P95 > 500ms - Immediate action required'
```

---

## 📊 Dashboards Obligatorios

### 1. Executive Dashboard

**Audiencia**: Management, Product Owners

**Métricas**:

- Uptime actual (30 días)
- Transacciones/día
- Revenue/día
- Error rate
- P95 latency

**Actualización**: Tiempo real

### 2. Engineering Dashboard

**Audiencia**: Developers, DevOps

**Métricas**:

- RPS por servicio
- Error rate por endpoint
- Latency P50/P95/P99
- CPU/Memory usage
- Database query performance

**Actualización**: Cada 10 segundos

### 3. On-Call Dashboard

**Audiencia**: SRE, On-Call engineers

**Métricas**:

- Alertas activas
- Incidentes abiertos
- MTTR promedio
- Services health status
- Recent deployments

**Actualización**: Cada 5 segundos

---

## ✅ Definición de "Done"

Un feature/epic se considera **DONE** cuando:

1. ✅ Todos los tests pasan (unit, integration, e2e)
2. ✅ Code coverage > 80%
3. ✅ Code review aprobado por 2 seniors
4. ✅ Documentación actualizada
5. ✅ Métricas instrumentadas (logs, traces, metrics)
6. ✅ Alertas configuradas
7. ✅ Runbook de troubleshooting creado
8. ✅ Feature flag habilitado progresivamente
9. ✅ Validación en staging environment
10. ✅ Deploy a producción exitoso + monitoreo por 48h

---

## 📅 Revisión de Métricas

### Diaria (On-Call)

- Health checks de servicios
- Alertas activas
- Incidentes abiertos

### Semanal (Sprint Review)

- DORA metrics
- Feature velocity
- Bug burn-down

### Mensual (Leadership Review)

- SLI/SLO compliance
- Business KPIs
- Tech debt trends

### Trimestral (Strategy Review)

- SLA compliance
- ROI de inversiones técnicas
- Roadmap de mejoras

---

**Versión**: 1.0  
**Última actualización**: Diciembre 2025  
**Aprobado por**: Tech Lead & SRE Lead  
**Próxima revisión**: Mensual
