# Deployment Architecture

## 📋 Propósito

Define la **arquitectura de deployment** en Kubernetes (AWS EKS o GCP GKE).

## 🏗️ Deployment Stack

### Orchestration

**Kubernetes 1.28+** (EKS o GKE)

**Por qué Kubernetes**:
✅ Industria standard  
✅ Auto-scaling (HPA, VPA, Cluster Autoscaler)  
✅ Self-healing (restart pods automáticamente)  
✅ Rolling updates zero-downtime  
✅ Multi-cloud (portabilidad AWS ↔ GCP)

---

## 🌍 Cloud Provider

### Option 1: AWS EKS (Amazon Elastic Kubernetes Service)

**Services usados**:

- **EKS**: Managed Kubernetes control plane
- **EC2**: Worker nodes (m5.large, m5.xlarge)
- **RDS**: PostgreSQL managed (Multi-AZ)
- **DocumentDB**: MongoDB-compatible (o Atlas)
- **ElastiCache**: Redis managed
- **Amazon MQ**: RabbitMQ managed (o self-hosted en K8s)
- **S3**: Object storage (imágenes, backups)
- **Route 53**: DNS + GeoDNS
- **CloudFront**: CDN
- **ALB**: Application Load Balancer (Ingress)

---

### Option 2: GCP GKE (Google Kubernetes Engine)

**Services usados**:

- **GKE**: Managed Kubernetes (Autopilot mode)
- **Cloud SQL**: PostgreSQL managed
- **MongoDB Atlas**: MongoDB (vendor externo)
- **Memorystore**: Redis managed
- **Cloud Pub/Sub**: Messaging (o RabbitMQ self-hosted)
- **Cloud Storage**: Object storage
- **Cloud CDN**: CDN
- **Cloud Load Balancing**: L7 LB (Ingress)

---

**Decisión**: Empezar con **AWS EKS** (más familiaridad del equipo), mantener portabilidad usando Kubernetes abstractions.

---

## 🎯 Kubernetes Architecture

### Cluster Structure

```
┌──────────────────────────────────────────────────────────┐
│  EKS Control Plane (AWS Managed)                         │
│  - API Server                                            │
│  - etcd                                                  │
│  - Scheduler                                             │
│  - Controller Manager                                    │
└──────────────────────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
┌───────▼──────┐ ┌──────▼──────┐ ┌─────▼───────┐
│  Node Group  │ │  Node Group │ │  Node Group │
│  (App Pods)  │ │  (DB Pods)  │ │  (System)   │
│  m5.large    │ │  m5.xlarge  │ │  t3.medium  │
│  2-10 nodes  │ │  3-5 nodes  │ │  2 nodes    │
└──────────────┘ └─────────────┘ └─────────────┘
```

---

### Namespaces

**Organización por ambiente y propósito**:

```yaml
# Production namespaces
- iam-service
- catalog-service
- order-service
- payment-service
- shipping-service
- notification-service
- customer-service
- inventory-service
- istio-system # Service mesh (Fase 3)
- monitoring # Prometheus, Grafana
- logging # Loki, Fluentd
- ingress-nginx # Ingress controller
```

**Staging/Dev**: Cluster separado (más barato) o namespaces: `staging-*`, `dev-*`

---

## 📦 Deployment Pattern

### Deployment Manifest (Ejemplo: Order Service)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
  namespace: order-service
  labels:
    app: order-service
    version: v1.2.3
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1 # Max 1 pod down durante deploy
      maxSurge: 1 # Max 1 pod extra durante deploy
  selector:
    matchLabels:
      app: order-service
  template:
    metadata:
      labels:
        app: order-service
        version: v1.2.3
    spec:
      # Anti-affinity: distribuir pods en nodos diferentes
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    app: order-service
                topologyKey: kubernetes.io/hostname

      containers:
        - name: order-service
          image: 123456789.dkr.ecr.us-east-1.amazonaws.com/order-service:v1.2.3
          ports:
            - containerPort: 3000
              name: http

          # Resource limits
          resources:
            requests:
              memory: '256Mi'
              cpu: '250m'
            limits:
              memory: '512Mi'
              cpu: '500m'

          # Environment variables
          env:
            - name: NODE_ENV
              value: 'production'
            - name: PORT
              value: '3000'
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: order-service-secrets
                  key: database-url
            - name: REDIS_URL
              valueFrom:
                secretKeyRef:
                  name: order-service-secrets
                  key: redis-url

          # Health checks
          livenessProbe:
            httpGet:
              path: /health/liveness
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 3

          readinessProbe:
            httpGet:
              path: /health/readiness
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 5
            timeoutSeconds: 3
            failureThreshold: 3

          # Graceful shutdown
          lifecycle:
            preStop:
              exec:
                command: ['/bin/sh', '-c', 'sleep 15']

      # Termination grace period
      terminationGracePeriodSeconds: 30
```

---

### Service (Load Balancing)

```yaml
apiVersion: v1
kind: Service
metadata:
  name: order-service
  namespace: order-service
spec:
  type: ClusterIP
  selector:
    app: order-service
  ports:
    - port: 80
      targetPort: 3000
      protocol: TCP
      name: http
```

---

### HorizontalPodAutoscaler (Auto-Scaling)

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: order-service-hpa
  namespace: order-service
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: order-service
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
        - type: Percent
          value: 50 # Escalar max 50% por vez
          periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300 # Wait 5 min before scale down
      policies:
        - type: Pods
          value: 1 # Bajar de a 1 pod
          periodSeconds: 60
```

---

## 🌐 Ingress (Routing Externo)

### Ingress Controller: Kong

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
  namespace: default
  annotations:
    kubernetes.io/ingress.class: kong
    konghq.com/strip-path: 'true'
    konghq.com/plugins: rate-limiting, jwt-auth
spec:
  tls:
    - hosts:
        - api.ecommerce.com
      secretName: tls-secret
  rules:
    - host: api.ecommerce.com
      http:
        paths:
          - path: /api/v1/auth
            pathType: Prefix
            backend:
              service:
                name: iam-service
                port:
                  number: 80

          - path: /api/v1/products
            pathType: Prefix
            backend:
              service:
                name: catalog-service
                port:
                  number: 80

          - path: /api/v1/orders
            pathType: Prefix
            backend:
              service:
                name: order-service
                port:
                  number: 80
```

---

## 🗄️ Stateful Services

### PostgreSQL (StatefulSet)

**Opción 1**: Managed (RDS) → Recomendado  
**Opción 2**: Self-hosted en K8s con StatefulSet

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: order-service
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
        - name: postgres
          image: postgres:15-alpine
          ports:
            - containerPort: 5432
          env:
            - name: POSTGRES_DB
              value: orders
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-secrets
                  key: password
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: ['ReadWriteOnce']
        storageClassName: gp3 # AWS EBS gp3
        resources:
          requests:
            storage: 100Gi
```

---

## 🔐 Secrets Management

### Kubernetes Secrets (Base64 encoded)

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: order-service-secrets
  namespace: order-service
type: Opaque
data:
  database-url: <base64-encoded-value>
  redis-url: <base64-encoded-value>
  stripe-secret-key: <base64-encoded-value>
```

**Mejor opción** (Fase 2): **AWS Secrets Manager** o **HashiCorp Vault**

```yaml
# External Secrets Operator
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: order-service-secrets
spec:
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: order-service-secrets
  data:
    - secretKey: database-url
      remoteRef:
        key: prod/order-service/database-url
```

---

## 🚀 Deployment Process

### Blue-Green Deployment

```
┌─────────────┐
│   Traffic   │
│  (Route 53) │
└──────┬──────┘
       │
   ┌───▼────────────────┐
   │  API Gateway/ALB   │
   └───┬────────────────┘
       │
       ├──────────────┐
       │              │
┌──────▼──────┐  ┌────▼──────────┐
│  Blue (v1)  │  │  Green (v2)   │
│  Active     │  │  Standby      │
│  3 pods     │  │  3 pods       │
└─────────────┘  └───────────────┘

# Deploy process:
1. Deploy v2 to Green (no traffic)
2. Test Green
3. Switch traffic: Blue → Green
4. Monitor
5. Rollback if issues (switch back to Blue)
6. Decommission Blue
```

**Implementation**: Service mesh (Istio) o Flagger (Fase 3)

---

### Rolling Update (Default)

```
Initial:   [v1] [v1] [v1]
Step 1:    [v1] [v1] [v2]    (1 pod updated)
Step 2:    [v1] [v2] [v2]    (2 pods updated)
Step 3:    [v2] [v2] [v2]    (All updated)
```

**Ventaja**: Zero-downtime, gradual rollout  
**Desventaja**: Momentáneamente hay 2 versiones en producción

---

## 📊 Node Groups & Instance Types

### Application Node Group

```hcl
# Terraform
module "eks_node_group_app" {
  source = "terraform-aws-modules/eks/aws//modules/eks-managed-node-group"

  name = "app-nodes"
  cluster_name = module.eks.cluster_name

  instance_types = ["m5.large"]  # 2 vCPU, 8 GB RAM
  capacity_type  = "ON_DEMAND"

  min_size     = 2
  max_size     = 10
  desired_size = 3

  labels = {
    workload = "application"
  }

  taints = []
}
```

---

### Database Node Group (Opcional, si self-hosted)

```hcl
module "eks_node_group_db" {
  source = "terraform-aws-modules/eks/aws//modules/eks-managed-node-group"

  name = "db-nodes"

  instance_types = ["m5.xlarge"]  # 4 vCPU, 16 GB RAM
  capacity_type  = "ON_DEMAND"

  min_size     = 3
  max_size     = 5
  desired_size = 3

  labels = {
    workload = "database"
  }

  taints = [
    {
      key    = "workload"
      value  = "database"
      effect = "NoSchedule"
    }
  ]
}
```

**Taints**: Solo pods con matching toleration pueden schedularse aquí.

---

## 💰 Cost Optimization

### Spot Instances (Fase 2)

Para cargas no críticas:

```hcl
module "eks_node_group_spot" {
  capacity_type = "SPOT"
  instance_types = ["m5.large", "m5a.large", "m5n.large"]  # Multiple types

  min_size     = 0
  max_size     = 10
  desired_size = 2
}
```

**Trade-off**: 70% más barato, pero AWS puede terminar instancia con 2 min notice.

**Uso**:
✅ Background jobs  
✅ Analytics  
✅ Batch processing  
❌ Real-time API

---

### Cluster Autoscaler

Auto-escalar nodes (no solo pods):

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cluster-autoscaler
  namespace: kube-system
spec:
  replicas: 1
  template:
    spec:
      containers:
        - image: k8s.gcr.io/autoscaling/cluster-autoscaler:v1.28.0
          name: cluster-autoscaler
          command:
            - ./cluster-autoscaler
            - --cloud-provider=aws
            - --skip-nodes-with-local-storage=false
            - --expander=least-waste
            - --balance-similar-node-groups
            - --skip-nodes-with-system-pods=false
```

**Resultado**: Si pods no caben en nodos existentes, agrega más nodos. Si nodes están subutilizados, los remueve.

---

## ✅ Deployment Checklist

### Pre-Deployment

- [ ] Code reviewed + merged
- [ ] Tests pasando (unit + integration)
- [ ] Docker image built & pushed a ECR
- [ ] Secrets actualizados (si cambió)
- [ ] Database migrations ejecutadas

### Deployment

- [ ] kubectl apply -f deployment.yaml
- [ ] Verificar pods healthy (kubectl get pods)
- [ ] Health checks pasando
- [ ] Smoke tests en staging

### Post-Deployment

- [ ] Monitoring dashboard (Grafana)
- [ ] Error rate normal (< 1%)
- [ ] Latency normal (P95 < 200ms)
- [ ] No errores en logs (Loki)
- [ ] Tag release en Git

---

**Versión**: 1.0  
**Última actualización**: Diciembre 2025
