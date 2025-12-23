# Security Architecture Overview

## 📋 Propósito

Define la arquitectura de seguridad completa del sistema e-commerce, implementando defensa en profundidad (defense in depth) a través de múltiples capas de protección.

---

## 🎯 Security Principles

### 1. Defense in Depth

Múltiples capas de seguridad:

- **Network Security**: VPC, Security Groups, Firewall
- **Application Security**: JWT, Input validation, Rate limiting
- **Data Security**: Encryption at rest/transit, Key management
- **Identity**: Authentication, Authorization, MFA
- **Monitoring**: Security logs, Intrusion detection

### 2. Least Privilege

- Users/services solo tienen permisos necesarios
- RBAC (Role-Based Access Control) granular
- Service accounts con scopes limitados

### 3. Zero Trust

- "Never trust, always verify"
- Validar identidad en cada request
- Network segmentation (no flat network)

### 4. Security by Default

- HTTPS obligatorio (redirect HTTP → HTTPS)
- Secure headers por defecto
- Password complexity enforced
- Session timeout por defecto

### 5. Fail Secure

- Errores niegan acceso (no permiten)
- Rate limiting bloquea requests excesivos
- Circuit breaker detiene llamadas a services down

---

## 🏗️ Security Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│              Layer 7: Compliance & Governance               │
│  GDPR, PCI-DSS, SOC 2, Security Audits, Penetration Tests  │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│              Layer 6: Monitoring & Incident Response        │
│  SIEM, Security Logs, Intrusion Detection, Alerting        │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│              Layer 5: Application Security                  │
│  Input Validation, OWASP Top 10, API Security, CSRF/XSS    │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│              Layer 4: Identity & Access Management          │
│  JWT, OAuth2, RBAC, MFA, Session Management                 │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│              Layer 3: Data Security                         │
│  Encryption (AES-256), TLS 1.3, Key Management (KMS)        │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│              Layer 2: Network Security                      │
│  VPC, Security Groups, WAF, DDoS Protection                 │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│              Layer 1: Infrastructure Security               │
│  Kubernetes RBAC, Pod Security, Secrets Management          │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔐 Layer 1: Infrastructure Security (Kubernetes)

### Pod Security Standards

```yaml
# PSS: Restricted profile (most secure)
apiVersion: v1
kind: Namespace
metadata:
  name: ecommerce
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

**Restrictions**:

- No privileged containers
- No root user (runAsNonRoot: true)
- Read-only root filesystem
- No host network/PID/IPC
- Drop all capabilities

---

### Service Account per Service

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: order-service-sa
  namespace: ecommerce

---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: order-service-role
rules:
  - apiGroups: ['']
    resources: ['secrets']
    resourceNames: ['order-service-secret']
    verbs: ['get']

---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: order-service-binding
subjects:
  - kind: ServiceAccount
    name: order-service-sa
roleRef:
  kind: Role
  name: order-service-role
  apiGroup: rbac.authorization.k8s.io
```

**Principle**: Order Service solo puede leer su propio secret, nada más.

---

### Secrets Management

**DO NOT**:
❌ Hardcode secrets en código  
❌ Commit secrets a Git  
❌ Pasar secrets via environment variables (visible en `kubectl describe pod`)

**DO**:
✅ Usar Kubernetes Secrets (encrypted at rest)  
✅ External secret manager (AWS Secrets Manager, HashiCorp Vault)  
✅ Rotate secrets periódicamente

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: order-service-secret
type: Opaque
stringData:
  DATABASE_URL: 'postgresql://user:pass@host:5432/orders'
  JWT_SECRET: 'super-secret-key-change-me'
```

**Mount as volume** (not env var):

```yaml
spec:
  containers:
    - name: order-service
      volumeMounts:
        - name: secrets
          mountPath: /secrets
          readOnly: true
  volumes:
    - name: secrets
      secret:
        secretName: order-service-secret
```

---

## 🌐 Layer 2: Network Security

### VPC Architecture (AWS)

```
┌──────────────────────────────────────────────────────────┐
│                        VPC (10.0.0.0/16)                 │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────────────────────────────────────┐        │
│  │     Public Subnet (10.0.1.0/24)             │        │
│  │  - Internet Gateway                         │        │
│  │  - NAT Gateway                              │        │
│  │  - Load Balancer (ELB)                      │        │
│  └─────────────────────────────────────────────┘        │
│                        │                                 │
│  ┌─────────────────────▼─────────────────────┐          │
│  │     Private Subnet (10.0.2.0/24)          │          │
│  │  - Kubernetes Worker Nodes                │          │
│  │  - Application Pods                       │          │
│  │  - RabbitMQ, Redis (internal)             │          │
│  └─────────────────────────────────────────────┘        │
│                        │                                 │
│  ┌─────────────────────▼─────────────────────┐          │
│  │     Database Subnet (10.0.3.0/24)         │          │
│  │  - RDS PostgreSQL (Multi-AZ)              │          │
│  │  - ElastiCache Redis                      │          │
│  │  - NO internet access                     │          │
│  └─────────────────────────────────────────────┘        │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Rules**:

- Internet → Public Subnet (solo Load Balancer)
- Public → Private (app traffic)
- Private → Database (db connections)
- Database → ❌ Internet (no outbound)

---

### Security Groups (Firewall Rules)

**Load Balancer SG**:

```hcl
resource "aws_security_group" "lb_sg" {
  name = "lb-sg"

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]  # Internet
    description = "HTTPS from anywhere"
  }

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP (redirect to HTTPS)"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

**Application SG**:

```hcl
resource "aws_security_group" "app_sg" {
  name = "app-sg"

  ingress {
    from_port       = 8000
    to_port         = 8000
    protocol        = "tcp"
    security_groups = [aws_security_group.lb_sg.id]
    description     = "Only from Load Balancer"
  }

  # No ingress from internet!
}
```

**Database SG**:

```hcl
resource "aws_security_group" "db_sg" {
  name = "db-sg"

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app_sg.id]
    description     = "Only from Application layer"
  }

  # No ingress from internet!
  # No egress (RDS managed)
}
```

---

### Web Application Firewall (WAF)

```hcl
resource "aws_wafv2_web_acl" "main" {
  name  = "ecommerce-waf"
  scope = "REGIONAL"

  # Rule 1: Rate limiting (1000 req/5min per IP)
  rule {
    name     = "rate-limit"
    priority = 1

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 1000
        aggregate_key_type = "IP"
      }
    }
  }

  # Rule 2: Block known bad IPs (AWS Managed)
  rule {
    name     = "aws-ip-reputation"
    priority = 2

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        vendor_name = "AWS"
        name        = "AWSManagedRulesAmazonIpReputationList"
      }
    }
  }

  # Rule 3: OWASP Top 10
  rule {
    name     = "owasp-top-10"
    priority = 3

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        vendor_name = "AWS"
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
      }
    }
  }

  default_action {
    allow {}
  }
}
```

---

## 🔒 Layer 3: Data Security

### Encryption at Rest

**Database**:

```hcl
resource "aws_db_instance" "orders" {
  engine               = "postgres"
  storage_encrypted    = true
  kms_key_id           = aws_kms_key.db_key.arn

  # ...
}
```

**Storage (EBS volumes)**:

```hcl
resource "aws_ebs_volume" "data" {
  encrypted  = true
  kms_key_id = aws_kms_key.ebs_key.arn
}
```

**Algorithm**: AES-256-GCM

---

### Encryption in Transit

**TLS 1.3 (minimum TLS 1.2)**:

```nginx
# Kong Gateway config
ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers on;
ssl_ciphers 'ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
```

**Mutual TLS (mTLS) entre services**:

```yaml
# Service Mesh (Istio)
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
spec:
  mtls:
    mode: STRICT # Require mTLS
```

---

### Key Management (AWS KMS)

```hcl
resource "aws_kms_key" "db_key" {
  description             = "KMS key for database encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true  # Auto-rotate annually

  tags = {
    Name = "db-encryption-key"
  }
}

resource "aws_kms_alias" "db_key" {
  name          = "alias/db-encryption"
  target_key_id = aws_kms_key.db_key.id
}
```

**Key Rotation**: Automático cada 365 días.

---

## 👤 Layer 4: Identity & Access Management

Ver [Auth-AuthZ-Strategy.md](../09-security/Auth-AuthZ-Strategy.md) para detalles completos.

**Summary**:

- **Authentication**: JWT (RS256), OAuth2, MFA
- **Authorization**: RBAC (Customer, Seller, Admin)
- **Session**: Redis (15min inactivity timeout)

---

## 🛡️ Layer 5: Application Security

### Input Validation

```typescript
// Validate every user input
import { z } from 'zod';

const CreateOrderSchema = z.object({
  customerId: z.string().uuid(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().min(1).max(100),
      })
    )
    .min(1)
    .max(50),
  total: z.number().positive().max(100000),
});

// Validate
const result = CreateOrderSchema.safeParse(req.body);
if (!result.success) {
  return res.status(400).json({ error: result.error });
}
```

---

### SQL Injection Prevention

```typescript
// ❌ NEVER do this
const query = `SELECT * FROM users WHERE email = '${email}'`;
db.query(query); // SQL injection vulnerable!

// ✅ Always use parameterized queries
const query = 'SELECT * FROM users WHERE email = $1';
db.query(query, [email]); // Safe
```

**ORM (Prisma)** hace esto automáticamente:

```typescript
const user = await prisma.user.findUnique({
  where: { email }, // Parameterized automatically
});
```

---

### XSS Prevention

**React auto-escapes** (safe por defecto):

```jsx
// Safe (React escapes automatically)
<div>{userInput}</div>

// DANGER (bypass React escaping)
<div dangerouslySetInnerHTML={{ __html: userInput }} />  // ❌ Avoid!
```

**CSP (Content Security Policy)**:

```typescript
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
  );
  next();
});
```

---

### CSRF Protection

```typescript
import csrf from 'csurf';

// CSRF middleware
app.use(csrf({ cookie: true }));

// Send CSRF token to client
app.get('/api/csrf-token', (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Validate CSRF token on state-changing requests
app.post('/api/orders', (req, res) => {
  // Middleware validates automatically
  // ...
});
```

---

### CORS Configuration

```typescript
import cors from 'cors';

app.use(
  cors({
    origin: ['https://ecommerce.com', 'https://admin.ecommerce.com'],
    credentials: true, // Allow cookies
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
```

---

### Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

// Global rate limit
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per IP
  message: 'Too many requests, try again later',
});

app.use('/api/', limiter);

// Stricter for sensitive endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 login attempts per 15min
  skipSuccessfulRequests: true,
});

app.post('/api/auth/login', authLimiter, loginHandler);
```

---

## 📊 Layer 6: Monitoring & Incident Response

### Security Logging

```typescript
import winston from 'winston';

const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.File({ filename: 'security.log' })],
});

// Log security events
securityLogger.info({
  event: 'authentication_success',
  userId: user.id,
  ip: req.ip,
  userAgent: req.headers['user-agent'],
  timestamp: new Date().toISOString(),
});

securityLogger.warn({
  event: 'authentication_failure',
  email: req.body.email,
  ip: req.ip,
  reason: 'invalid_password',
  timestamp: new Date().toISOString(),
});

securityLogger.error({
  event: 'rate_limit_exceeded',
  ip: req.ip,
  endpoint: req.path,
  timestamp: new Date().toISOString(),
});
```

---

### Intrusion Detection

**Falco (Kubernetes Runtime Security)**:

```yaml
# Detect suspicious activity
- rule: Unexpected Network Outbound
  desc: Detect pod making unexpected outbound connections
  condition: >
    outbound and container and not allowed_outbound_destinations
  output: >
    Outbound connection attempt (user=%user.name pod=%k8s.pod.name 
    dest=%fd.sip.name port=%fd.sport.name)
  priority: WARNING
```

---

### Security Metrics (Prometheus)

```yaml
# Authentication failures
authentication_failures_total{endpoint="/auth/login"} 150

# Rate limit hits
rate_limit_exceeded_total{endpoint="/orders"} 25

# Invalid tokens
jwt_validation_failures_total{reason="expired"} 8
```

---

### Alerting (Security Incidents)

```yaml
- alert: HighAuthenticationFailureRate
  expr: rate(authentication_failures_total[5m]) > 10
  for: 5m
  annotations:
    summary: 'High authentication failure rate detected'
    description: '{{ $value }} failed logins/sec in last 5min'
    severity: critical

- alert: PotentialBruteForce
  expr: authentication_failures_total{ip=~".+"} > 50
  for: 5m
  annotations:
    summary: 'Potential brute force attack from {{ $labels.ip }}'
```

---

## 📜 Layer 7: Compliance & Governance

### GDPR Compliance

- **Right to access**: GET /users/me/data (download all data)
- **Right to deletion**: DELETE /users/me (anonymize)
- **Consent management**: Track user consent for marketing emails
- **Data minimization**: Solo guardar data necesaria
- **Breach notification**: < 72 hours

### PCI-DSS Compliance

- **Never store CVV** (solo tokenize via Stripe)
- **Encrypt cardholder data** (AES-256)
- **Network segmentation** (PCI environment isolated)
- **Quarterly vulnerability scans**

### SOC 2 Type II

- **Security**: Defensa en profundidad
- **Availability**: 99.9% SLA
- **Confidentiality**: Encryption, access controls
- **Processing Integrity**: Input validation
- **Privacy**: GDPR compliance

---

## 🔧 Security Tools

| Category                | Tool                    | Purpose                       |
| ----------------------- | ----------------------- | ----------------------------- |
| **Static Analysis**     | SonarQube, ESLint       | Code quality, vulnerabilities |
| **Dependency Scanning** | npm audit, Snyk         | Find vulnerable dependencies  |
| **Container Scanning**  | Trivy, Clair            | Scan Docker images            |
| **Secrets Detection**   | TruffleHog, git-secrets | Detect leaked secrets in Git  |
| **Penetration Testing** | OWASP ZAP, Burp Suite   | Security testing              |
| **SIEM**                | Splunk, ELK             | Security log aggregation      |

---

## ✅ Security Checklist (Pre-Production)

- [ ] TLS 1.3 enabled (minimum TLS 1.2)
- [ ] All secrets in secret manager (no hardcoded)
- [ ] JWT signature validated (RS256)
- [ ] Rate limiting configured
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (React escaping + CSP)
- [ ] CSRF protection enabled
- [ ] CORS configured (no `*` wildcard)
- [ ] Security headers (HSTS, X-Frame-Options, etc.)
- [ ] Database encryption at rest
- [ ] Kubernetes RBAC configured
- [ ] Pod Security Standards enforced
- [ ] Network segmentation (VPC + Security Groups)
- [ ] WAF configured
- [ ] Security logging enabled
- [ ] Vulnerability scanning automated (CI/CD)
- [ ] Penetration test completed
- [ ] Incident response plan documented

---

**Última actualización**: Diciembre 2025
