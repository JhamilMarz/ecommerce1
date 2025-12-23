# Availability SLO & SLA

## 📋 Propósito

Define los **SLIs, SLOs y SLAs** para el sistema, estableciendo targets medibles y consecuencias de incumplimiento.

## 🎯 Definiciones

### SLI (Service Level Indicator)

**Métrica cuantitativa** del nivel de servicio.

**Ejemplos**:

- Request success rate
- Request latency (P95, P99)
- System uptime

---

### SLO (Service Level Objective)

**Target interno** que el equipo se compromete a cumplir.

**Ejemplos**:

- 99.9% availability
- P95 latency < 200ms

---

### SLA (Service Level Agreement)

**Contrato con clientes** con consecuencias legales/financieras si no se cumple.

**Ejemplos**:

- 99.5% availability (SLA es más permisivo que SLO)
- Si incumplimos, crédito de 10% en factura

---

## 📊 Availability SLI

### Definición

```
Availability = Successful requests / Total requests × 100%

Successful = HTTP status 2xx, 3xx, 4xx (client errors no cuentan como downtime)
Failed = HTTP status 5xx, timeouts, network errors
```

### Measurement Window

**Rolling 30 days** (no mes calendario)

---

## 🎯 Availability SLO

### Target: 99.9% ("three nines")

**Error budget**: 0.1% = 43.8 minutos/mes de downtime permitido

### Breakdown por Mes

| Availability    | Downtime/mes | Downtime/año   |
| --------------- | ------------ | -------------- |
| 90%             | 72 horas     | 36.5 días      |
| 99%             | 7.2 horas    | 3.65 días      |
| 99.5%           | 3.6 horas    | 43.8 horas     |
| **99.9%** (SLO) | **43.8 min** | **8.76 horas** |
| 99.95%          | 21.9 min     | 4.38 horas     |
| 99.99%          | 4.4 min      | 52.6 min       |

---

## 📜 Availability SLA (Cliente-Facing)

### Target: 99.5% ("two and a half nines")

**Error budget**: 0.5% = 3.6 horas/mes

**Por qué más bajo que SLO?**

- SLO (99.9%) es objetivo interno → da buffer de seguridad
- SLA (99.5%) es compromiso externo → más conservador

---

### SLA Credits (Compensación)

Si no cumplimos SLA, compensamos al cliente:

| Availability Achieved | SLA Credit                       |
| --------------------- | -------------------------------- |
| 99.5% - 99.0%         | 10% descuento en factura mensual |
| 99.0% - 95.0%         | 25% descuento                    |
| < 95.0%               | 50% descuento                    |

**Exclusiones** (no cuenta como downtime para SLA):

- Mantenimiento programado (notificado con 7 días de anticipación, max 4 horas/mes)
- Ataques DDoS
- Problemas del cliente (ej. código buggy que sobrecarga el sistema)
- Force majeure (desastres naturales)

---

## ⚡ Latency SLI

### Definición

```
Latency = Time desde request recibido hasta response enviado (server-side)
```

**Métricas**:

- **P50** (median): 50% de requests más rápidos que este valor
- **P95**: 95% de requests más rápidos que este valor
- **P99**: 99% de requests más rápidos que este valor

**Por qué P95/P99 en vez de average?**

- Average oculta outliers
- P95 captura la experiencia de la mayoría de usuarios

---

## 🎯 Latency SLO

### Read Operations (GET)

| Metric  | Target  | Measurement Window |
| ------- | ------- | ------------------ |
| **P50** | < 50ms  | Rolling 24 hours   |
| **P95** | < 200ms | Rolling 24 hours   |
| **P99** | < 500ms | Rolling 24 hours   |

### Write Operations (POST, PUT, PATCH, DELETE)

| Metric  | Target  | Measurement Window |
| ------- | ------- | ------------------ |
| **P50** | < 100ms | Rolling 24 hours   |
| **P95** | < 500ms | Rolling 24 hours   |
| **P99** | < 1s    | Rolling 24 hours   |

---

## 📜 Latency SLA

**No hay SLA de latency** (solo availability).

**Por qué?**

- Latency depende de factores externos (geolocalización, ISP del cliente)
- Difícil garantizar contractualmente
- Mejor: "Best effort" con monitoreo interno (SLO)

---

## 📊 Error Rate SLI

### Definición

```
Error Rate = 5xx responses / Total requests × 100%
```

**5xx errors** = errores del servidor (no del cliente)

### Target (SLO): < 1%

**Error budget**: 1% de requests pueden fallar

**Ejemplos**:

- 500 Internal Server Error
- 502 Bad Gateway
- 503 Service Unavailable
- 504 Gateway Timeout

**No cuentan** (errores del cliente):

- 400 Bad Request
- 401 Unauthorized
- 404 Not Found

---

## 🔄 Throughput SLI

### Definición

```
Throughput = Requests per second (RPS) successfully processed
```

### Capacity SLO

| Phase               | Target RPS | Peak RPS (2x buffer) |
| ------------------- | ---------- | -------------------- |
| **Fase 1 (MVP)**    | 100        | 200                  |
| **Fase 2 (Growth)** | 1,000      | 2,000                |
| **Fase 3 (Scale)**  | 10,000     | 20,000               |

**SLO**: Sistema debe mantener availability y latency targets hasta el capacity target.

---

## 📈 Error Budget

### Concepto

**Error budget** = Cuánto downtime podemos permitirnos sin romper SLO.

```
Error budget = 100% - SLO
             = 100% - 99.9%
             = 0.1%
             = 43.8 minutos/mes
```

### Error Budget Policy

**Si error budget > 0% (cumplimos SLO)**:
✅ Podemos lanzar features nuevas  
✅ Podemos hacer deploys frecuentes  
✅ Podemos tomar riesgos calculados

**Si error budget ≤ 0% (incumplimos SLO)**:
❌ **FREEZE** en features nuevas  
❌ Solo bug fixes y reliability improvements  
❌ Post-mortem obligatorio  
❌ Reducir frecuencia de deploys

---

### Error Budget Dashboard

```
┌────────────────────────────────────────┐
│  Error Budget (30-day rolling)         │
├────────────────────────────────────────┤
│  SLO:           99.9%                  │
│  Current:       99.92%    ✅           │
│  Error Budget:  +0.02% (8.76 min)     │
│                                        │
│  Budget Usage:                         │
│  ████████░░░░░░░░░░░░░░░░  20% used   │
│                                        │
│  Remaining: 35.04 min                  │
│  Spent:     8.76 min                   │
│                                        │
│  Top Incidents:                        │
│  - DB failover:        5 min           │
│  - Deploy rollback:    3.76 min        │
└────────────────────────────────────────┘
```

---

## 📉 SLO Violations

### Incident Response

**Cuando SLO se rompe**:

1. **Trigger**: Alert automático (PagerDuty)
2. **Acknowledge**: On-call engineer acepta en < 5 min
3. **Mitigate**: Resolver incident (rollback, failover, etc.)
4. **Communicate**: Status page update para clientes
5. **Post-mortem**: Análisis de root cause (48 horas después)

---

### Post-Mortem Template

```markdown
# Post-Mortem: [Incident Title]

## Summary

- **Date**: 2025-12-15
- **Duration**: 10 minutes
- **Impact**: 500 failed requests (0.05% error rate)
- **Root Cause**: Database connection pool exhausted

## Timeline

- 10:00 AM: Deploy v2.3.0
- 10:05 AM: Error rate spike detected
- 10:06 AM: On-call paged
- 10:08 AM: Rollback initiated
- 10:10 AM: Service recovered

## Root Cause

Connection pool size (10) was too small for new traffic pattern.

## Action Items

- [ ] Increase pool size to 50 (Owner: @john, Due: 2025-12-16)
- [ ] Add alert for pool saturation (Owner: @jane, Due: 2025-12-17)
- [ ] Load test before deploy (Owner: @team, Ongoing)

## Lessons Learned

- Load testing must include database connection tests
- Pool size should be monitored in production
```

---

## 📊 Measurement & Reporting

### Prometheus Queries

**Availability (last 30 days)**:

```promql
1 - (
  sum(rate(http_requests_total{status=~"5.."}[30d]))
  /
  sum(rate(http_requests_total[30d]))
)
```

**Error budget remaining**:

```promql
(
  (1 - (sum(rate(http_requests_total{status=~"5.."}[30d])) / sum(rate(http_requests_total[30d]))))
  - 0.999  # SLO
) * 43200 # Minutes in 30 days
```

**P95 latency**:

```promql
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[24h])) by (le))
```

---

### Weekly SLO Report

**Email automático cada lunes**:

```
Subject: Weekly SLO Report (Week of Dec 14-20, 2025)

Availability
  Current:  99.95%  ✅ (SLO: 99.9%)
  Downtime: 2.2 min

Latency (P95)
  Read:  120ms  ✅ (SLO: 200ms)
  Write: 380ms  ✅ (SLO: 500ms)

Error Rate
  0.2%  ✅ (SLO: < 1%)

Error Budget
  Remaining: 36.6 min (84%)
  Spent: 7.2 min this month

Action Required: None - all SLOs met
```

---

## ✅ SLO Checklist

### Definition

- [ ] SLIs defined (availability, latency, error rate)
- [ ] SLOs set (99.9% availability, P95 < 200ms)
- [ ] SLAs documented (99.5% availability)
- [ ] Error budget calculated (43.8 min/month)

### Measurement

- [ ] Prometheus metrics instrumented
- [ ] Dashboards created (Grafana)
- [ ] Alerts configured (PagerDuty)
- [ ] Weekly reports automated

### Process

- [ ] Error budget policy documented
- [ ] Post-mortem template created
- [ ] On-call rotation defined
- [ ] Incident response runbook written

---

**Versión**: 1.0  
**Última actualización**: Diciembre 2025
