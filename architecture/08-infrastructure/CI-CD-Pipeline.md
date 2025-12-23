# CI/CD Pipeline

## 📋 Propósito

Define el **pipeline de integración y despliegue continuo** (CI/CD) usando GitHub Actions.

## 🎯 Pipeline Goals

✅ **Automated testing**: Tests ejecutados en cada PR  
✅ **Fast feedback**: Resultados en < 5 min  
✅ **Safe deployments**: Staging auto-deploy, Production con approval  
✅ **Rollback capability**: Revertir en < 2 min si falla  
✅ **Audit trail**: Log de todos los deploys

---

## 🔄 CI/CD Workflow

### Overview

```
┌─────────────┐
│ Developer   │
│ Push code   │
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│ Feature Branch   │
│ - Lint           │  ← CI Pipeline
│ - Unit tests     │
│ - Build Docker   │
└──────┬───────────┘
       │ Create PR
       ▼
┌──────────────────┐
│ Pull Request     │
│ - Integration    │  ← CI Pipeline
│ - Security scan  │
│ - Code review    │
└──────┬───────────┘
       │ Merge to main
       ▼
┌──────────────────┐
│ Main Branch      │
│ - Build & push   │  ← CD Pipeline
│ - Deploy Staging │
│ - E2E tests      │
└──────┬───────────┘
       │ Manual approval
       ▼
┌──────────────────┐
│ Production       │
│ - Deploy prod    │  ← CD Pipeline
│ - Smoke tests    │
│ - Monitor        │
└──────────────────┘
```

---

## 🏗️ GitHub Actions Configuration

### Workflow 1: CI (Pull Request)

**File**: `.github/workflows/ci.yml`

```yaml
name: CI Pipeline

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [feature/*]

jobs:
  # Job 1: Lint & Format Check
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint
        run: npm run lint

      - name: Check formatting
        run: npm run format:check

  # Job 2: Unit Tests
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
          flags: unittests

  # Job 3: Integration Tests
  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run migrations
        run: npm run db:migrate
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/test

      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/test
          REDIS_URL: redis://localhost:6379

  # Job 4: Security Scan
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'

      - name: Upload Trivy results to GitHub Security
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'

  # Job 5: Build Docker Image
  build:
    runs-on: ubuntu-latest
    needs: [lint, unit-tests, integration-tests]
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: false
          tags: order-service:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

---

### Workflow 2: CD (Staging Deployment)

**File**: `.github/workflows/deploy-staging.yml`

```yaml
name: Deploy to Staging

on:
  push:
    branches: [main]

env:
  AWS_REGION: us-east-1
  ECR_REPOSITORY: order-service
  EKS_CLUSTER: ecommerce-staging

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # 1. Configure AWS credentials
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      # 2. Login to ECR
      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      # 3. Build & Push Docker image
      - name: Build and push Docker image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          docker tag $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG $ECR_REGISTRY/$ECR_REPOSITORY:latest
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest

      # 4. Deploy to Kubernetes
      - name: Deploy to EKS
        env:
          IMAGE_TAG: ${{ github.sha }}
        run: |
          aws eks update-kubeconfig --name $EKS_CLUSTER --region $AWS_REGION

          kubectl set image deployment/order-service \
            order-service=${{ steps.login-ecr.outputs.registry }}/$ECR_REPOSITORY:$IMAGE_TAG \
            -n staging

          kubectl rollout status deployment/order-service -n staging

      # 5. Run E2E tests
      - name: Run E2E tests
        run: |
          npm ci
          npm run test:e2e
        env:
          API_URL: https://staging-api.ecommerce.com

      # 6. Notify Slack
      - name: Notify Slack
        if: always()
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "Staging deployment ${{ job.status }}",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Staging Deployment*\nStatus: ${{ job.status }}\nCommit: ${{ github.sha }}\nAuthor: ${{ github.actor }}"
                  }
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

---

### Workflow 3: CD (Production Deployment)

**File**: `.github/workflows/deploy-production.yml`

```yaml
name: Deploy to Production

on:
  workflow_dispatch: # Manual trigger only
    inputs:
      image_tag:
        description: 'Docker image tag to deploy'
        required: true

env:
  AWS_REGION: us-east-1
  ECR_REPOSITORY: order-service
  EKS_CLUSTER: ecommerce-production

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://api.ecommerce.com
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      # Deploy with gradual rollout (Blue-Green)
      - name: Deploy to Production
        env:
          IMAGE_TAG: ${{ github.event.inputs.image_tag }}
        run: |
          aws eks update-kubeconfig --name $EKS_CLUSTER --region $AWS_REGION

          # Update deployment
          kubectl set image deployment/order-service \
            order-service=${{ steps.login-ecr.outputs.registry }}/$ECR_REPOSITORY:$IMAGE_TAG \
            -n production

          # Wait for rollout
          kubectl rollout status deployment/order-service -n production --timeout=5m

      # Run smoke tests
      - name: Smoke tests
        run: |
          npm ci
          npm run test:smoke
        env:
          API_URL: https://api.ecommerce.com

      # Rollback if smoke tests fail
      - name: Rollback on failure
        if: failure()
        run: |
          kubectl rollout undo deployment/order-service -n production
          echo "Deployment rolled back due to failure"

      # Notify PagerDuty
      - name: Trigger PagerDuty alert
        if: failure()
        uses: PagerDuty/pagerduty-change-events-action@v1
        with:
          integration-key: ${{ secrets.PAGERDUTY_INTEGRATION_KEY }}
          summary: 'Production deployment failed and was rolled back'
          severity: high

      # Notify Slack
      - name: Notify Slack
        if: always()
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "Production deployment ${{ job.status }}",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Production Deployment*\nStatus: ${{ job.status }}\nImage: ${{ github.event.inputs.image_tag }}\nDeployed by: ${{ github.actor }}"
                  }
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

---

## 🐳 Dockerfile Optimization

```dockerfile
# Multi-stage build for smaller image
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source
COPY src ./src

# Build
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install dumb-init (proper signal handling)
RUN apk add --no-cache dumb-init

# Copy only production files
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# Non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:3000/health/liveness', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start with dumb-init (PID 1 problem)
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
```

---

## 🔐 Secrets Management

### GitHub Secrets (Encrypted)

```
Settings → Secrets and variables → Actions → New repository secret
```

**Required secrets**:

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `SLACK_WEBHOOK_URL`
- `PAGERDUTY_INTEGRATION_KEY`
- `CODECOV_TOKEN`

---

## 📊 Pipeline Metrics

### Success Rate

```
Deployment Success Rate = Successful deploys / Total deploys × 100%

Target: > 95%
```

### Lead Time

```
Lead Time = Time from commit to production

Target: < 24 hours
```

### MTTR (Mean Time To Recovery)

```
MTTR = Average time to rollback failed deployment

Target: < 15 minutes
```

### Deployment Frequency

```
Target:
- Staging: Multiple times/day
- Production: 1-2 times/day
```

---

## 🚨 Rollback Strategy

### Automatic Rollback

Si smoke tests fallan → rollback automático

```bash
kubectl rollout undo deployment/order-service -n production
```

### Manual Rollback

```bash
# Ver historial
kubectl rollout history deployment/order-service -n production

# Rollback a versión específica
kubectl rollout undo deployment/order-service -n production --to-revision=5
```

---

## ✅ CI/CD Checklist

### Pre-Merge

- [ ] All CI checks passing (lint, tests, security)
- [ ] Code reviewed (min 1 approval)
- [ ] Branch up-to-date with main

### Staging Deployment

- [ ] Auto-deployed from main branch
- [ ] E2E tests passing
- [ ] No errors in logs (Loki)
- [ ] Metrics normal (Grafana)

### Production Deployment

- [ ] Manual approval obtained
- [ ] Smoke tests passing
- [ ] Rollback plan ready
- [ ] On-call engineer notified
- [ ] Deploy during business hours (not Friday!)

---

**Versión**: 1.0  
**Última actualización**: Diciembre 2025
