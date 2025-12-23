# Alerting Strategy

## 📋 Propósito

Define la estrategia de **alerting** para notificar al equipo cuando hay problemas críticos que requieren acción inmediata.

## 🎯 Alerting Principles

### 1. Actionable

**Regla**: Solo alertar si requiere acción humana inmediata.

❌ **Bad**: "CPU al 60%" (informativo, no urgente)  
✅ **Good**: "API down (100% error rate)" (requiere acción NOW)

---

### 2. Precise

**Regla**: Evitar false positives.

❌ **Bad**: Alertar por 1 segundo de latency spike (noise)  
✅ **Good**: Alertar si latency > threshold por 5 minutos

---

### 3. Specific

**Regla**: Alert debe decir QUÉ está mal y DÓNDE.

❌ **Bad**: "Something is wrong"  
✅ **Good**: "order-service P95 latency > 1s (SLO: 500ms)"

---

### 4. Contextual

**Regla**: Incluir info para debugging.

✅ **Include**:

- Affected service
- Metric value vs threshold
- Link to dashboard
- Runbook link
- Recent deploys

---

## 🚨 Alert Severity Levels

### P1 - Critical (PagerDuty)

**Definition**: Sistema down o afectando usuarios NOW.

**Examples**:

- API returning 100% errors
- Database down
- Payment processing failing
- Data loss

**Response**: Page on-call engineer IMMEDIATELY (24/7)

**SLA**: Acknowledge < 5 min, Mitigate < 15 min

---

### P2 - High (PagerDuty)

**Definition**: SLO en riesgo, afecta a usuarios parcialmente.

**Examples**:

- Error rate > 5% (SLO: < 1%)
- P95 latency > 1s (SLO: 500ms)
- 1 replica down (out of 3)

**Response**: Page on-call during business hours

**SLA**: Acknowledge < 15 min, Mitigate < 1 hour

---

### P3 - Medium (Slack)

**Definition**: Warning, no afecta usuarios aún pero puede escalar.

**Examples**:

- CPU > 80% sustained
- Disk space > 80%
- Slow queries increasing

**Response**: Slack notification, no page

**SLA**: Review within 4 hours

---

### P4 - Low (Slack, optional)

**Definition**: Informational, nice-to-know.

**Examples**:

- Deployment completed
- Cache miss rate high
- Non-critical service slow

**Response**: Slack notification, async review

**SLA**: Review within 24 hours

---

## 📊 Alerting Stack

### Architecture

```
┌─────────────┐
│ Prometheus  │  ← Evalúa rules cada 15s
└──────┬──────┘
       │ Alerts firing
       │
┌──────▼─────────────┐
│  Alertmanager      │  ← Routing, grouping, silencing
└──────┬─────────────┘
       │
   ┌───┴────┐
   │        │
┌──▼──┐  ┌─▼────────┐
│Slack│  │PagerDuty │
└─────┘  └──────────┘
```

---

## 🔧 Prometheus Alert Rules

### File: `prometheus-rules.yml`

```yaml
groups:
  # ===== Availability Alerts =====
  - name: availability
    interval: 30s
    rules:
      # Service completely down
      - alert: ServiceDown
        expr: up{job="kubernetes-pods"} == 0
        for: 1m
        labels:
          severity: critical
          team: platform
        annotations:
          summary: '{{ $labels.service }} is down'
          description: 'Service {{ $labels.service }} in {{ $labels.namespace }} has been down for 1 minute'
          dashboard: 'https://grafana.ecommerce.com/d/service-health'
          runbook: 'https://runbooks.ecommerce.com/service-down'

      # High error rate
      - alert: HighErrorRate
        expr: |
          (
            sum(rate(http_requests_total{status=~"5.."}[5m])) by (service)
            /
            sum(rate(http_requests_total[5m])) by (service)
          ) > 0.05
        for: 5m
        labels:
          severity: critical
          team: platform
        annotations:
          summary: 'High error rate on {{ $labels.service }}'
          description: 'Error rate is {{ $value | humanizePercentage }} (threshold: 5%)'
          dashboard: 'https://grafana.ecommerce.com/d/{{ $labels.service }}'
          runbook: 'https://runbooks.ecommerce.com/high-error-rate'

  # ===== Performance Alerts =====
  - name: performance
    interval: 30s
    rules:
      # High latency
      - alert: HighLatency
        expr: |
          histogram_quantile(0.95,
            sum(rate(http_request_duration_seconds_bucket[5m])) by (service, le)
          ) > 0.5
        for: 5m
        labels:
          severity: high
          team: platform
        annotations:
          summary: 'High P95 latency on {{ $labels.service }}'
          description: 'P95 latency is {{ $value }}s (SLO: 500ms)'
          dashboard: 'https://grafana.ecommerce.com/d/{{ $labels.service }}'
          runbook: 'https://runbooks.ecommerce.com/high-latency'

      # Very high latency
      - alert: VeryHighLatency
        expr: |
          histogram_quantile(0.95,
            sum(rate(http_request_duration_seconds_bucket[5m])) by (service, le)
          ) > 2
        for: 2m
        labels:
          severity: critical
          team: platform
        annotations:
          summary: 'CRITICAL: P95 latency on {{ $labels.service }} > 2s'
          description: 'P95 latency is {{ $value }}s'

  # ===== Resource Alerts =====
  - name: resources
    interval: 30s
    rules:
      # High CPU
      - alert: HighCPUUsage
        expr: |
          rate(container_cpu_usage_seconds_total{pod=~".*-service-.*"}[5m]) > 0.8
        for: 10m
        labels:
          severity: medium
          team: platform
        annotations:
          summary: 'High CPU on {{ $labels.pod }}'
          description: 'CPU usage is {{ $value | humanizePercentage }} for 10 minutes'

      # High Memory
      - alert: HighMemoryUsage
        expr: |
          (container_memory_working_set_bytes{pod=~".*-service-.*"} 
          / 
          container_spec_memory_limit_bytes{pod=~".*-service-.*"}) > 0.9
        for: 5m
        labels:
          severity: high
          team: platform
        annotations:
          summary: 'High memory on {{ $labels.pod }}'
          description: 'Memory usage is {{ $value | humanizePercentage }}'

      # OOMKilled
      - alert: PodOOMKilled
        expr: |
          kube_pod_container_status_last_terminated_reason{reason="OOMKilled"} == 1
        labels:
          severity: critical
          team: platform
        annotations:
          summary: 'Pod {{ $labels.pod }} was OOMKilled'
          description: 'Increase memory limits or investigate memory leak'

  # ===== Database Alerts =====
  - name: database
    interval: 30s
    rules:
      # Database down
      - alert: DatabaseDown
        expr: pg_up == 0
        for: 30s
        labels:
          severity: critical
          team: database
        annotations:
          summary: 'PostgreSQL database is down'
          description: 'Database {{ $labels.instance }} is unreachable'
          runbook: 'https://runbooks.ecommerce.com/database-down'

      # High connection count
      - alert: DatabaseConnectionsHigh
        expr: |
          sum(pg_stat_database_numbackends) > 90
        for: 5m
        labels:
          severity: high
          team: database
        annotations:
          summary: 'Database connections near limit'
          description: '{{ $value }} active connections (limit: 100)'
          runbook: 'https://runbooks.ecommerce.com/db-connections'

      # Slow queries
      - alert: DatabaseSlowQueries
        expr: |
          rate(pg_slow_queries_total[5m]) > 10
        for: 5m
        labels:
          severity: medium
          team: database
        annotations:
          summary: 'High rate of slow queries'
          description: '{{ $value }} slow queries per second'

  # ===== Business Alerts =====
  - name: business
    interval: 1m
    rules:
      # Payment processing down
      - alert: PaymentProcessingDown
        expr: |
          sum(rate(payments_processed_total[5m])) == 0
        for: 5m
        labels:
          severity: critical
          team: payments
        annotations:
          summary: 'No payments processed in 5 minutes'
          description: 'Payment service may be down or Stripe integration failing'
          runbook: 'https://runbooks.ecommerce.com/payment-down'

      # High payment failure rate
      - alert: HighPaymentFailureRate
        expr: |
          (
            sum(rate(payments_processed_total{status="failed"}[5m]))
            /
            sum(rate(payments_processed_total[5m]))
          ) > 0.1
        for: 5m
        labels:
          severity: high
          team: payments
        annotations:
          summary: 'High payment failure rate'
          description: '{{ $value | humanizePercentage }} of payments failing'

      # Order creation stopped
      - alert: OrderCreationStopped
        expr: |
          sum(rate(orders_created_total[5m])) == 0
        for: 10m
        labels:
          severity: critical
          team: orders
        annotations:
          summary: 'No orders created in 10 minutes'
          description: 'Order service may be down or blocked'
```

---

## 🔔 Alertmanager Configuration

### File: `alertmanager.yml`

```yaml
global:
  resolve_timeout: 5m
  slack_api_url: 'https://hooks.slack.com/services/xxx/yyy/zzz'
  pagerduty_url: 'https://events.pagerduty.com/v2/enqueue'

# Routing tree
route:
  receiver: 'default'
  group_by: ['alertname', 'service']
  group_wait: 10s # Wait 10s to group alerts
  group_interval: 5m # New group every 5min
  repeat_interval: 4h # Re-send after 4h if still firing

  routes:
    # Critical → PagerDuty + Slack
    - match:
        severity: critical
      receiver: 'pagerduty-critical'
      continue: true # Also send to next route

    - match:
        severity: critical
      receiver: 'slack-critical'

    # High → PagerDuty (business hours only) + Slack
    - match:
        severity: high
      receiver: 'pagerduty-high'
      active_time_intervals:
        - business-hours
      continue: true

    - match:
        severity: high
      receiver: 'slack-high'

    # Medium/Low → Slack only
    - match_re:
        severity: (medium|low)
      receiver: 'slack-info'

# Time intervals
time_intervals:
  - name: business-hours
    time_intervals:
      - times:
          - start_time: '09:00'
            end_time: '18:00'
        weekdays: ['monday:friday']
        location: 'America/New_York'

# Receivers
receivers:
  - name: 'default'
    slack_configs:
      - channel: '#alerts-default'
        title: '{{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'

  - name: 'pagerduty-critical'
    pagerduty_configs:
      - service_key: '<PAGERDUTY_SERVICE_KEY_CRITICAL>'
        description: '{{ .GroupLabels.alertname }}: {{ .CommonAnnotations.summary }}'
        details:
          firing: '{{ .Alerts.Firing | len }}'
          resolved: '{{ .Alerts.Resolved | len }}'
          dashboard: '{{ .CommonAnnotations.dashboard }}'
          runbook: '{{ .CommonAnnotations.runbook }}'

  - name: 'pagerduty-high'
    pagerduty_configs:
      - service_key: '<PAGERDUTY_SERVICE_KEY_HIGH>'
        description: '{{ .GroupLabels.alertname }}: {{ .CommonAnnotations.summary }}'

  - name: 'slack-critical'
    slack_configs:
      - channel: '#alerts-critical'
        color: 'danger'
        title: '🚨 CRITICAL: {{ .GroupLabels.alertname }}'
        text: |
          {{ range .Alerts }}
          *Summary:* {{ .Annotations.summary }}
          *Description:* {{ .Annotations.description }}
          *Dashboard:* {{ .Annotations.dashboard }}
          *Runbook:* {{ .Annotations.runbook }}
          {{ end }}
        actions:
          - type: button
            text: 'View Dashboard'
            url: '{{ .CommonAnnotations.dashboard }}'
          - type: button
            text: 'View Runbook'
            url: '{{ .CommonAnnotations.runbook }}'

  - name: 'slack-high'
    slack_configs:
      - channel: '#alerts-high'
        color: 'warning'
        title: '⚠️ HIGH: {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'

  - name: 'slack-info'
    slack_configs:
      - channel: '#alerts-info'
        color: 'good'
        title: 'ℹ️ {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'

# Inhibition rules (suppress alerts)
inhibit_rules:
  # If service is down, don't alert on latency/errors
  - source_match:
      alertname: 'ServiceDown'
    target_match_re:
      alertname: '(HighLatency|HighErrorRate)'
    equal: ['service']

  # If database is down, don't alert on service errors
  - source_match:
      alertname: 'DatabaseDown'
    target_match:
      severity: 'high'
    equal: ['namespace']
```

---

## 📱 PagerDuty Setup

### 1. Create Services

- **ecommerce-critical** (P1 alerts)
- **ecommerce-high** (P2 alerts during business hours)

### 2. Escalation Policy

```
Level 1: On-call engineer (immediate)
   ↓ (after 5 min if no ack)
Level 2: Escalate to team lead
   ↓ (after 10 min if no ack)
Level 3: Escalate to CTO
```

### 3. On-Call Schedule

```
Week 1: Engineer A
Week 2: Engineer B
Week 3: Engineer C
...
Rotate weekly on Mondays 9 AM
```

---

## 🔕 Silencing Alerts

### Use Cases

1. **Planned maintenance**: Silence "ServiceDown" during deploy
2. **Known issue**: Silence while investigating
3. **Non-urgent**: Silence during off-hours if not critical

### Silencing in Alertmanager UI

```
Matchers:
  service = "order-service"
  alertname = "HighLatency"

Duration: 2 hours
Creator: john@ecommerce.com
Comment: "Investigating database slow query issue"
```

---

## 📊 Alert Fatigue Prevention

### Anti-Patterns

❌ **Noisy alerts**: 100 alerts/day → team ignores them  
❌ **False positives**: Alert on transient issues  
❌ **Vague alerts**: "Something wrong" → no action taken  
❌ **Low-value alerts**: Alert on things that auto-recover

### Best Practices

✅ **Tune thresholds**: Adjust based on historical data  
✅ **Use `for` duration**: Alert only if sustained (5+ min)  
✅ **Group alerts**: `group_by: ['service']` to batch  
✅ **Regular review**: Weekly review of alert quality  
✅ **Runbooks**: Every alert → runbook link

---

## 📖 Runbook Example

### Runbook: High Error Rate

**URL**: `https://runbooks.ecommerce.com/high-error-rate`

#### 1. Triage (< 2 min)

- Check Grafana dashboard: Which service?
- Check recent deploys: New version rolled out?
- Check external services: Stripe, SendGrid down?

#### 2. Mitigate (< 15 min)

- **If recent deploy**: Rollback
  ```bash
  kubectl rollout undo deployment/order-service -n production
  ```
- **If external service down**: Enable circuit breaker
- **If database issue**: Restart connection pool

#### 3. Verify

- Error rate back to < 1%?
- Latency normal?
- Users reporting issue resolved?

#### 4. Post-Mortem

- Create post-mortem doc (template)
- Schedule post-mortem meeting (48h)
- Identify action items

---

## ✅ Alerting Checklist

### Configuration

- [ ] Prometheus alert rules configured
- [ ] Alertmanager deployed
- [ ] PagerDuty integrated
- [ ] Slack integrated
- [ ] On-call rotation defined

### Quality

- [ ] All critical alerts have runbooks
- [ ] Alert thresholds tuned (no false positives)
- [ ] Inhibition rules configured
- [ ] Test alerts sent (verify routing)

### Process

- [ ] On-call engineer has access to all tools
- [ ] Escalation policy documented
- [ ] Post-mortem process defined
- [ ] Weekly alert review scheduled

---

**Versión**: 1.0  
**Última actualización**: Diciembre 2025
