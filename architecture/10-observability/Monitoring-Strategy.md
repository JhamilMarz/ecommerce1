# Monitoring Strategy

## 📋 Propósito

Define la estrategia de **monitoring con métricas** usando Prometheus (collection) y Grafana (visualization).

## 🎯 Monitoring Goals

✅ **Proactive**: Detectar problemas antes que usuarios  
✅ **Actionable**: Alertas que requieren acción humana  
✅ **Comprehensive**: 4 Golden Signals cubiertas  
✅ **Real-time**: Latency < 30s desde evento a alerta  
✅ **Historical**: 90 días de retención para análisis

---

## 📊 The Four Golden Signals

### 1. Latency

**Qué**: Tiempo que toma procesar request

**Métricas**:

- `http_request_duration_seconds` (histogram)
- P50, P95, P99 latency

**Target**: P95 < 200ms (reads), P95 < 500ms (writes)

---

### 2. Traffic

**Qué**: Demand en el sistema

**Métricas**:

- `http_requests_total` (counter)
- Requests per second (RPS)

**Target**: Soportar 100 RPS (MVP) → 10,000 RPS (Fase 3)

---

### 3. Errors

**Qué**: Rate de requests que fallan

**Métricas**:

- `http_requests_total{status=~"5.."}` (counter)
- Error rate (%)

**Target**: < 1% error rate

---

### 4. Saturation

**Qué**: Qué tan "lleno" está el sistema

**Métricas**:

- CPU utilization: `container_cpu_usage_seconds_total`
- Memory utilization: `container_memory_working_set_bytes`
- Database connections: `pg_stat_database_numbackends`

**Target**: < 70% CPU, < 80% memory

---

## 🛠️ Prometheus Setup

### Architecture

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  Service 1  │  │  Service 2  │  │  Service 3  │
│  :3000/     │  │  :3000/     │  │  :3000/     │
│  metrics    │  │  metrics    │  │  metrics    │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                │                │
       └────────────────┼────────────────┘
                        │ Scrape every 15s
                ┌───────▼────────┐
                │   Prometheus   │  (Time-series DB)
                │  (StatefulSet) │
                └───────┬────────┘
                        │
                ┌───────▼────────┐
                │    Grafana     │  (Visualization)
                └────────────────┘
```

---

### Prometheus Deployment (K8s)

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: prometheus
  namespace: monitoring
spec:
  serviceName: prometheus
  replicas: 1
  selector:
    matchLabels:
      app: prometheus
  template:
    metadata:
      labels:
        app: prometheus
    spec:
      serviceAccountName: prometheus
      containers:
        - name: prometheus
          image: prom/prometheus:v2.48.0
          args:
            - '--config.file=/etc/prometheus/prometheus.yml'
            - '--storage.tsdb.path=/prometheus'
            - '--storage.tsdb.retention.time=90d'
            - '--web.enable-lifecycle'
          ports:
            - containerPort: 9090
              name: http
          volumeMounts:
            - name: config
              mountPath: /etc/prometheus
            - name: storage
              mountPath: /prometheus
          resources:
            requests:
              memory: '2Gi'
              cpu: '500m'
            limits:
              memory: '4Gi'
              cpu: '2000m'
      volumes:
        - name: config
          configMap:
            name: prometheus-config
  volumeClaimTemplates:
    - metadata:
        name: storage
      spec:
        accessModes: ['ReadWriteOnce']
        storageClassName: gp3
        resources:
          requests:
            storage: 500Gi
```

---

### Prometheus Config

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: monitoring
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
      evaluation_interval: 15s
      external_labels:
        cluster: 'ecommerce-production'

    # Alertmanager config
    alerting:
      alertmanagers:
        - static_configs:
            - targets: ['alertmanager:9093']

    # Scrape configs
    scrape_configs:
      # Kubernetes pods with prometheus.io annotations
      - job_name: 'kubernetes-pods'
        kubernetes_sd_configs:
          - role: pod
        relabel_configs:
          # Only scrape pods with prometheus.io/scrape: "true"
          - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
            action: keep
            regex: true
          
          # Use custom port if specified
          - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_port]
            action: replace
            target_label: __address__
            regex: ([^:]+)(?::\d+)?;(\d+)
            replacement: $1:$2
          
          # Use custom path if specified
          - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
            action: replace
            target_label: __metrics_path__
            regex: (.+)
          
          # Add namespace
          - source_labels: [__meta_kubernetes_namespace]
            target_label: namespace
          
          # Add pod name
          - source_labels: [__meta_kubernetes_pod_name]
            target_label: pod
          
          # Add service label
          - source_labels: [__meta_kubernetes_pod_label_app]
            target_label: service

      # Node Exporter (for node metrics)
      - job_name: 'node-exporter'
        kubernetes_sd_configs:
          - role: node
        relabel_configs:
          - source_labels: [__address__]
            regex: '(.*):10250'
            replacement: '${1}:9100'
            target_label: __address__

      # kube-state-metrics (for K8s resources)
      - job_name: 'kube-state-metrics'
        static_configs:
          - targets: ['kube-state-metrics:8080']
```

---

## 📈 Application Metrics (Node.js)

### Instrumentation with prom-client

```typescript
import express from 'express';
import promClient from 'prom-client';

const app = express();

// Create a Registry
const register = new promClient.Registry();

// Add default metrics (CPU, memory, GC, etc.)
promClient.collectDefaultMetrics({ register });

// Custom metrics

// 1. HTTP request duration (histogram)
const httpDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5, 10], // 10ms to 10s
});
register.registerMetric(httpDuration);

// 2. HTTP request total (counter)
const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
});
register.registerMetric(httpRequestsTotal);

// 3. Active database connections (gauge)
const dbConnections = new promClient.Gauge({
  name: 'db_connections_active',
  help: 'Number of active database connections',
});
register.registerMetric(dbConnections);

// 4. Business metrics
const ordersCreated = new promClient.Counter({
  name: 'orders_created_total',
  help: 'Total number of orders created',
  labelNames: ['status'], // 'confirmed', 'cancelled'
});
register.registerMetric(ordersCreated);

const orderValue = new promClient.Histogram({
  name: 'order_value_dollars',
  help: 'Value of orders in dollars',
  buckets: [10, 50, 100, 500, 1000, 5000],
});
register.registerMetric(orderValue);

// Middleware to instrument requests
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;

    httpDuration
      .labels(req.method, route, res.statusCode.toString())
      .observe(duration);
    httpRequestsTotal
      .labels(req.method, route, res.statusCode.toString())
      .inc();
  });

  next();
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Business logic with metrics
app.post('/orders', async (req, res) => {
  const order = await orderService.create(req.body);

  // Increment order counter
  ordersCreated.labels('confirmed').inc();

  // Record order value
  orderValue.observe(order.total);

  res.json(order);
});

// Update DB connections gauge periodically
setInterval(async () => {
  const count = await prisma.$queryRaw`SELECT count(*) FROM pg_stat_activity`;
  dbConnections.set(count);
}, 10000); // Every 10 seconds
```

---

### Kubernetes Pod Annotations

Para que Prometheus scrape automáticamente:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  template:
    metadata:
      annotations:
        prometheus.io/scrape: 'true'
        prometheus.io/port: '3000'
        prometheus.io/path: '/metrics'
    spec:
      containers:
        - name: order-service
          image: order-service:latest
          ports:
            - containerPort: 3000
```

---

## 📊 Grafana Dashboards

### Dashboard 1: Service Overview

**Panels**:

1. **Request Rate (QPS)**

```promql
sum(rate(http_requests_total{service="order-service"}[5m]))
```

2. **Latency (P95)**

```promql
histogram_quantile(0.95,
  sum(rate(http_request_duration_seconds_bucket{service="order-service"}[5m])) by (le)
)
```

3. **Error Rate**

```promql
sum(rate(http_requests_total{service="order-service", status=~"5.."}[5m]))
/
sum(rate(http_requests_total{service="order-service"}[5m]))
* 100
```

4. **CPU Usage**

```promql
rate(container_cpu_usage_seconds_total{pod=~"order-service-.*"}[5m]) * 100
```

5. **Memory Usage**

```promql
container_memory_working_set_bytes{pod=~"order-service-.*"} / 1024 / 1024
```

---

### Dashboard 2: Business Metrics

1. **Orders per Hour**

```promql
sum(increase(orders_created_total[1h]))
```

2. **Revenue per Hour**

```promql
sum(increase(order_value_dollars_sum[1h]))
```

3. **Average Order Value**

```promql
sum(increase(order_value_dollars_sum[1h]))
/
sum(increase(orders_created_total[1h]))
```

4. **Payment Success Rate**

```promql
sum(rate(payments_processed_total{status="success"}[5m]))
/
sum(rate(payments_processed_total[5m]))
* 100
```

---

### Dashboard 3: Database

1. **Active Connections**

```promql
sum(pg_stat_database_numbackends)
```

2. **Query Duration (P95)**

```promql
histogram_quantile(0.95,
  sum(rate(pg_query_duration_seconds_bucket[5m])) by (le)
)
```

3. **Transactions per Second**

```promql
rate(pg_stat_database_xact_commit[5m])
```

4. **Slow Queries (> 1s)**

```promql
sum(rate(pg_slow_queries_total[5m]))
```

---

## 🚨 Alerting Rules

```yaml
groups:
  - name: service_health
    interval: 30s
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status=~"5.."}[5m])) by (service)
          /
          sum(rate(http_requests_total[5m])) by (service)
          > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: 'High error rate on {{ $labels.service }}'
          description: 'Error rate is {{ $value | humanizePercentage }}'

      # High latency
      - alert: HighLatency
        expr: |
          histogram_quantile(0.95,
            sum(rate(http_request_duration_seconds_bucket[5m])) by (service, le)
          ) > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: 'High latency on {{ $labels.service }}'
          description: 'P95 latency is {{ $value }}s'

      # Service down
      - alert: ServiceDown
        expr: up{job="kubernetes-pods"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: 'Service {{ $labels.service }} is down'

      # High CPU usage
      - alert: HighCPUUsage
        expr: |
          rate(container_cpu_usage_seconds_total{pod=~".*-service-.*"}[5m]) > 0.8
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: 'High CPU usage on {{ $labels.pod }}'
          description: 'CPU usage is {{ $value | humanizePercentage }}'

      # Database connections exhausted
      - alert: DatabaseConnectionsHigh
        expr: pg_stat_database_numbackends > 90
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: 'Database connections near limit'
          description: '{{ $value }} connections active (limit: 100)'
```

---

## 📧 Alertmanager Config

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: alertmanager-config
  namespace: monitoring
data:
  alertmanager.yml: |
    global:
      resolve_timeout: 5m

    route:
      group_by: ['alertname', 'service']
      group_wait: 10s
      group_interval: 10s
      repeat_interval: 12h
      receiver: 'default'
      routes:
        # Critical alerts → PagerDuty
        - match:
            severity: critical
          receiver: 'pagerduty'
          continue: true

        # All alerts → Slack
        - receiver: 'slack'

    receivers:
      - name: 'default'
        webhook_configs:
          - url: 'http://localhost:5001/'

      - name: 'pagerduty'
        pagerduty_configs:
          - service_key: '<PAGERDUTY_SERVICE_KEY>'
            description: '{{ .CommonAnnotations.summary }}'

      - name: 'slack'
        slack_configs:
          - api_url: '<SLACK_WEBHOOK_URL>'
            channel: '#alerts'
            title: '{{ .CommonAnnotations.summary }}'
            text: '{{ .CommonAnnotations.description }}'
            color: '{{ if eq .Status "firing" }}danger{{ else }}good{{ end }}'
```

---

## 📊 Retention & Storage

### Prometheus Storage

**Retention**: 90 días (configurable con `--storage.tsdb.retention.time`)

**Storage estimation**:

```
Samples/s = Services × Metrics × Scrape frequency
          = 8 services × 200 metrics × (1/15s)
          = 106 samples/s
          = 9.2M samples/day

Storage = Samples/day × Bytes/sample × Days
        = 9.2M × 2 bytes × 90 days
        = 1.66 GB

+ Overhead (30%) = ~2.2 GB
```

**Provisioned**: 500 GB (con headroom para crecimiento)

---

## ✅ Monitoring Checklist

### Application

- [ ] prom-client installed
- [ ] Default metrics enabled (CPU, memory, GC)
- [ ] Custom HTTP metrics (duration, total)
- [ ] Business metrics (orders, revenue)
- [ ] /metrics endpoint expuesto

### Infrastructure

- [ ] Prometheus deployed (StatefulSet)
- [ ] Alertmanager deployed
- [ ] Grafana deployed con Prometheus datasource
- [ ] Node Exporter deployed (DaemonSet)
- [ ] kube-state-metrics deployed

### Dashboards

- [ ] Service overview dashboard
- [ ] Business metrics dashboard
- [ ] Database dashboard
- [ ] Kubernetes cluster dashboard

### Alerting

- [ ] Alert rules configuradas
- [ ] PagerDuty integrado (critical alerts)
- [ ] Slack integrado (all alerts)
- [ ] On-call rotation definida

---

**Versión**: 1.0  
**Última actualización**: Diciembre 2025
