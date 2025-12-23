# Environments Strategy

## 📋 Propósito

Define la **estrategia de ambientes** (development, staging, production) y el flujo de promoción entre ellos.

## 🌍 Environments

### 1. Development (Dev)

**Propósito**: Desarrollo activo, testing local

**Infrastructure**:

- **Local**: Docker Compose en laptop de cada developer
- **Cloud** (opcional): Cluster K8s compartido, namespace por developer

**Características**:

- 🔓 Permissive (no SSL, logging verbose)
- 📊 Mock de external services (Stripe, SendGrid)
- 🗄️ Seed data pre-cargada
- 🔄 Hot reload habilitado

**URL**: `http://localhost:3000` o `https://dev-<username>.ecommerce.internal`

**Database**: PostgreSQL local (Docker) o shared dev DB

**Costo**: ~$0 (local) o ~$200/mes (shared K8s cluster)

---

### 2. Staging

**Propósito**: Pre-production testing, QA, demos

**Infrastructure**:

- **Kubernetes cluster separado** (más pequeño que prod)
- **AWS EKS**: 2 nodes m5.large
- Todos los servicios deployeados

**Características**:

- ✅ Idéntico a production (mismo stack)
- 🔐 SSL habilitado
- 📧 Email sandbox (SendGrid test mode)
- 💳 Stripe test mode
- 🗄️ Database snapshot de prod (anonimizado)

**URL**: `https://staging-api.ecommerce.com`

**Database**: PostgreSQL RDS (db.t3.medium, Multi-AZ)

**Deployment**: Auto-deploy desde `main` branch (CI/CD)

**Costo**: ~$500/mes

---

### 3. Production

**Propósito**: Usuarios reales, dinero real

**Infrastructure**:

- **Kubernetes cluster** (AWS EKS)
- **3+ nodes** m5.large (auto-scaling hasta 10)
- High availability (multi-AZ)

**Características**:

- 🔒 Security hardened
- 📊 Full observability (Prometheus, Grafana, Loki, Jaeger)
- 💾 Backups automáticos (daily, retención 30 días)
- 🚨 Alerting 24/7 (PagerDuty)
- 🔐 Secrets en AWS Secrets Manager

**URL**: `https://api.ecommerce.com`

**Database**: PostgreSQL RDS (db.m5.large, Multi-AZ, read replicas)

**Deployment**: Manual approval required (via GitHub Actions)

**Costo**: ~$2,000/mes (MVP), escala con crecimiento

---

## 🔄 Promotion Flow

```
┌──────────────┐
│ Development  │  (Feature branch)
│  (Local)     │
└──────┬───────┘
       │ git push
       │ PR created
       ▼
┌──────────────┐
│   Staging    │  (main branch, auto-deploy)
│  (Cloud)     │  - Integration tests
└──────┬───────┘  - QA testing
       │          - Smoke tests
       │ Manual approval
       ▼
┌──────────────┐
│  Production  │  (Release tag)
│  (Cloud)     │  - Gradual rollout
└──────────────┘  - Monitoring
```

---

## 🏗️ Environment Configuration

### 1. Environment Variables

**Diferentes por ambiente**:

```typescript
// .env.development
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://localhost:5432/dev
REDIS_URL=redis://localhost:6379
STRIPE_SECRET_KEY=sk_test_...
SENDGRID_API_KEY=SG.test...
LOG_LEVEL=debug

// .env.staging
NODE_ENV=staging
PORT=3000
DATABASE_URL=postgresql://staging-db.xxx.us-east-1.rds.amazonaws.com:5432/staging
REDIS_URL=redis://staging-redis.xxx.cache.amazonaws.com:6379
STRIPE_SECRET_KEY=sk_test_...
SENDGRID_API_KEY=SG.staging...
LOG_LEVEL=info

// .env.production
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://prod-db.xxx.us-east-1.rds.amazonaws.com:5432/production
REDIS_URL=redis://prod-redis.xxx.cache.amazonaws.com:6379
STRIPE_SECRET_KEY=sk_live_...
SENDGRID_API_KEY=SG.live...
LOG_LEVEL=warn
```

**Kubernetes Secrets**:

```yaml
# staging-secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: staging
data:
  database-url: <base64>
  stripe-key: <base64>

# production-secrets.yaml (different values)
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: production
data:
  database-url: <base64>  # Production DB
  stripe-key: <base64>    # Live key
```

---

### 2. Feature Flags

Para habilitar features solo en ciertos ambientes:

```typescript
import { FeatureFlagService } from './feature-flags';

// Initialize with environment
const flags = new FeatureFlagService({
  environment: process.env.NODE_ENV,
  configUrl: 'https://feature-flags.ecommerce.com',
});

// Usage
if (await flags.isEnabled('new-checkout-flow')) {
  // New checkout (solo habilitado en staging)
  return newCheckoutService.process(order);
} else {
  // Old checkout (production)
  return oldCheckoutService.process(order);
}
```

**LaunchDarkly** o **Unleash** para feature flag management.

---

### 3. Database per Environment

| Environment    | Database     | Instance Type | Storage |
| -------------- | ------------ | ------------- | ------- |
| **Dev**        | Local Docker | -             | 10 GB   |
| **Staging**    | RDS          | db.t3.medium  | 100 GB  |
| **Production** | RDS Multi-AZ | db.m5.large   | 500 GB  |

**Data isolation**: Staging usa anonymized snapshot de prod (PII removed).

---

## 🔐 Access Control

### Development

- **SSH**: Abierto para developers
- **Database**: Password en .env local
- **Cloud resources**: Todos los developers tienen acceso

### Staging

- **SSH**: VPN requerido
- **Database**: AWS IAM auth
- **Cloud resources**: Developers + QA tienen acceso

### Production

- **SSH**: No directo (usar bastion host, logs auditados)
- **Database**: IAM auth, read-only para developers
- **Cloud resources**: Solo DevOps + on-call tienen write access

**Audit logging**: CloudTrail (AWS) para trackear todas las acciones en prod.

---

## 🧪 Testing per Environment

### Development

- **Unit tests**: Ejecutar localmente (`npm test`)
- **Integration tests**: Contra mocks
- **Manual testing**: Postman, curl

### Staging

- **Integration tests**: CI/CD ejecuta contra staging
- **E2E tests**: Playwright contra staging UI
- **Load tests**: k6 (light load, 100 RPS)
- **QA manual**: Team QA valida features

### Production

- **Smoke tests**: Post-deploy (health checks, critical flows)
- **Synthetic monitoring**: Datadog Synthetics (pruebas 24/7)
- **Canary testing**: 5% traffic a nueva versión primero
- **No manual testing** (solo monitoring)

---

## 📊 Monitoring per Environment

### Development

- **Logs**: Console output
- **Metrics**: No (opcional: local Prometheus)
- **Tracing**: No

### Staging

- **Logs**: Loki (7 días retención)
- **Metrics**: Prometheus (30 días retención)
- **Tracing**: Jaeger (3 días retención)
- **Alerts**: Slack notifications (no PagerDuty)

### Production

- **Logs**: Loki (30 días retención)
- **Metrics**: Prometheus (90 días retención) + long-term (S3)
- **Tracing**: Jaeger (7 días retención)
- **Alerts**: PagerDuty (24/7 on-call)
- **APM**: Datadog APM (opcional, Fase 2)

---

## 💰 Cost Management

### Budget Allocation

| Environment     | Monthly Cost | % of Total |
| --------------- | ------------ | ---------- |
| **Development** | $200         | 8%         |
| **Staging**     | $500         | 20%        |
| **Production**  | $1,800       | 72%        |
| **Total**       | $2,500       | 100%       |

### Cost Optimization

**Development**:

- Shared K8s cluster (namespaces)
- Auto-shutdown nights/weekends (60% savings)

**Staging**:

- Smaller instance types
- Single-AZ deployment (no multi-AZ)
- Shared RDS instance (multiple databases)

**Production**:

- Reserved Instances (40% savings vs on-demand)
- Spot Instances para non-critical workloads (70% savings)
- Auto-scaling (scale down during low traffic)

---

## 🚀 Environment Provisioning

### Infrastructure as Code (Terraform)

```hcl
# terraform/environments/staging/main.tf
module "eks_cluster" {
  source = "../../modules/eks"

  environment = "staging"
  cluster_name = "ecommerce-staging"

  node_groups = {
    general = {
      instance_types = ["m5.large"]
      min_size       = 2
      max_size       = 5
      desired_size   = 2
    }
  }
}

module "rds" {
  source = "../../modules/rds"

  environment = "staging"
  instance_class = "db.t3.medium"
  multi_az = false
  backup_retention_period = 7
}
```

**Provision**:

```bash
cd terraform/environments/staging
terraform init
terraform plan
terraform apply
```

---

## 🔄 Data Sync Strategy

### Staging ← Production

**Problema**: Staging necesita datos realistas para testing.

**Solución**: Weekly sync de prod → staging (anonimizado)

```bash
# Cron job (sábados 2 AM)
#!/bin/bash

# 1. Dump production DB
pg_dump $PROD_DB_URL > prod_dump.sql

# 2. Anonymize PII
python anonymize.py prod_dump.sql > staging_dump.sql

# 3. Restore to staging
psql $STAGING_DB_URL < staging_dump.sql

# 4. Cleanup
rm prod_dump.sql staging_dump.sql
```

**Anonymization**:

```python
# anonymize.py
import re

def anonymize(sql_dump):
    # Replace emails
    sql_dump = re.sub(r'\b[\w.-]+@[\w.-]+\.\w+\b', 'user@example.com', sql_dump)

    # Replace phone numbers
    sql_dump = re.sub(r'\d{3}-\d{3}-\d{4}', '555-555-5555', sql_dump)

    # Replace credit card numbers
    sql_dump = re.sub(r'\d{4}-\d{4}-\d{4}-\d{4}', '4242-4242-4242-4242', sql_dump)

    return sql_dump
```

---

## ✅ Environment Checklist

### Setup New Environment

- [ ] Terraform provisioned (cluster, databases, etc.)
- [ ] Namespaces created
- [ ] Secrets configured (database, API keys)
- [ ] Monitoring deployed (Prometheus, Grafana, Loki)
- [ ] Ingress controller deployed
- [ ] SSL certificates configured
- [ ] DNS records created
- [ ] CI/CD pipeline configured

### Pre-Deployment

- [ ] Environment variables correctos
- [ ] Database migrations ejecutadas
- [ ] Seed data cargada (dev/staging)
- [ ] Feature flags configurados
- [ ] Monitoring dashboards verificados

### Post-Deployment

- [ ] Health checks pasando
- [ ] Smoke tests pasando
- [ ] Logs sin errores
- [ ] Metrics reportando correctamente

---

**Versión**: 1.0  
**Última actualización**: Diciembre 2025
