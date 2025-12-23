# Encryption Strategy

## 📋 Propósito

Define la estrategia de cifrado para proteger datos sensibles tanto en reposo (at rest) como en tránsito (in transit), asegurando confidencialidad, integridad y cumplimiento normativo.

---

## 🔐 Encryption Types

### 1. Encryption at Rest

Protege datos almacenados en discos, databases, backups.

**¿Qué ciframos?**:

- Databases (PostgreSQL, MongoDB)
- File storage (S3, EBS volumes)
- Backups
- Logs (pueden contener datos sensibles)
- Kubernetes secrets

---

### 2. Encryption in Transit

Protege datos mientras viajan por la red.

**¿Qué ciframos?**:

- Cliente ↔ API Gateway (TLS 1.3)
- API Gateway ↔ Microservices (mTLS)
- Microservices ↔ Databases (TLS)
- Microservices ↔ RabbitMQ (TLS)
- External API calls (Stripe, SendGrid) (TLS)

---

## 🔒 Encryption at Rest

### Database Encryption

#### PostgreSQL (RDS)

```hcl
# Terraform
resource "aws_db_instance" "orders" {
  identifier = "orders-db"
  engine     = "postgres"

  # Encryption
  storage_encrypted = true
  kms_key_id        = aws_kms_key.db_key.arn

  # ...
}
```

**Algorithm**: AES-256-GCM (AWS managed)

**Key**: AWS KMS customer-managed key (CMK)

**Transparency**: Automático - application no cambia, RDS cifra/descifra transparentemente.

---

#### MongoDB Atlas

```javascript
// MongoDB Atlas config (via UI or API)
{
  "encryptionAtRestProvider": "AWS",
  "awsKms": {
    "enabled": true,
    "region": "us-east-1",
    "customerMasterKeyID": "arn:aws:kms:us-east-1:123456789:key/abc-123"
  }
}
```

**Algorithm**: AES-256

**Key**: AWS KMS CMK

---

### File Storage Encryption (S3)

```hcl
resource "aws_s3_bucket" "uploads" {
  bucket = "ecommerce-uploads"
}

resource "aws_s3_bucket_server_side_encryption_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.s3_key.arn
    }
  }
}
```

**Enforce encryption** (reject unencrypted uploads):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::ecommerce-uploads/*",
      "Condition": {
        "StringNotEquals": {
          "s3:x-amz-server-side-encryption": "aws:kms"
        }
      }
    }
  ]
}
```

---

### Volume Encryption (Kubernetes PVs)

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: encrypted-gp3
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  encrypted: 'true'
  kmsKeyId: 'arn:aws:kms:us-east-1:123456789:key/abc-123'
volumeBindingMode: WaitForFirstConsumer
```

**Usage**:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: rabbitmq-data
spec:
  storageClassName: encrypted-gp3
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 50Gi
```

---

### Application-Level Encryption (Field-Level)

**Use case**: Datos MUY sensibles (SSN, credit card, health data).

**Example**: Encrypt user SSN before storing:

```typescript
import crypto from 'crypto';

// Encryption function
function encrypt(text: string, key: Buffer): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Return: iv + authTag + encrypted (all hex)
  return iv.toString('hex') + authTag.toString('hex') + encrypted;
}

// Decryption function
function decrypt(encryptedText: string, key: Buffer): string {
  const iv = Buffer.from(encryptedText.slice(0, 32), 'hex');
  const authTag = Buffer.from(encryptedText.slice(32, 64), 'hex');
  const encrypted = encryptedText.slice(64);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

// Usage
const encryptionKey = await getKMSKey('field-encryption-key');

// Save to DB
const user = await prisma.user.create({
  data: {
    email: 'user@example.com',
    ssn: encrypt('123-45-6789', encryptionKey), // Encrypted
  },
});

// Read from DB
const decryptedSSN = decrypt(user.ssn, encryptionKey);
```

**Key Storage**: Encryption key en AWS KMS (no hardcoded).

---

## 🌐 Encryption in Transit

### TLS Configuration

#### API Gateway (Kong)

```yaml
# Kong TLS config
_format_version: '3.0'

services:
  - name: order-service
    url: https://order-service.ecommerce.svc.cluster.local:8000

    routes:
      - name: orders-route
        paths:
          - /orders

        protocols:
          - https # Only HTTPS

        https_redirect_status_code: 301 # Redirect HTTP → HTTPS

certificates:
  - cert: |
      -----BEGIN CERTIFICATE-----
      MIIDXTCCAkWgAwIBAgIJAKJ...
      -----END CERTIFICATE-----
    key: |
      -----BEGIN PRIVATE KEY-----
      MIIEvQIBADANBgkqhkiG9w0BA...
      -----END PRIVATE KEY-----

    # TLS settings
    tls_protocols:
      - TLSv1.2
      - TLSv1.3

    tls_ciphers:
      - ECDHE-ECDSA-AES256-GCM-SHA384
      - ECDHE-RSA-AES256-GCM-SHA384
      - ECDHE-ECDSA-CHACHA20-POLY1305
      - ECDHE-RSA-CHACHA20-POLY1305
```

**Enforce TLS 1.2+**:

```nginx
# Nginx config (inside Kong)
ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers on;
ssl_ciphers 'ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
```

---

#### Mutual TLS (mTLS) between Microservices

**Why mTLS?**:

- Verifica identidad de AMBOS lados (client y server)
- Client también presenta certificado (no solo server)
- Previene man-in-the-middle attacks dentro del cluster

**Service Mesh (Istio)**:

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: ecommerce
spec:
  mtls:
    mode: STRICT # Require mTLS (no plain HTTP)
```

**Certificate Management (Istio CA)**:

- Istio genera certificados automáticamente para cada service
- Rotate certificados cada 24 horas
- No necesitas gestionar certs manualmente

**Diagram**:

```
Order Service ──mTLS──▶ Payment Service
  (cert: order.ecommerce)  (cert: payment.ecommerce)

Both present certificates → Mutual authentication
```

---

#### Database TLS

**PostgreSQL**:

```typescript
// Prisma connection
datasource db {
  provider = "postgresql"
  url      = "postgresql://user:pass@host:5432/orders?sslmode=require"
}
```

**MongoDB**:

```typescript
const client = new MongoClient('mongodb://host:27017/catalog', {
  tls: true,
  tlsCAFile: '/certs/ca.pem',
  tlsCertificateKeyFile: '/certs/client.pem',
});
```

---

#### RabbitMQ TLS

```typescript
// amqplib connection
const connection = await amqp.connect('amqps://rabbitmq:5671', {
  cert: fs.readFileSync('/certs/client-cert.pem'),
  key: fs.readFileSync('/certs/client-key.pem'),
  ca: [fs.readFileSync('/certs/ca.pem')],
  rejectUnauthorized: true, // Validate server cert
});
```

---

### HTTP Security Headers

```typescript
import helmet from 'helmet';

app.use(
  helmet({
    // HSTS: Force HTTPS for 1 year
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },

    // Prevent MIME sniffing
    noSniff: true,

    // XSS filter (legacy browsers)
    xssFilter: true,

    // Prevent clickjacking
    frameguard: {
      action: 'deny',
    },

    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
  })
);
```

---

## 🔑 Key Management (AWS KMS)

### KMS Architecture

```
┌────────────────────────────────────────────┐
│            AWS KMS (Key Management)        │
├────────────────────────────────────────────┤
│                                            │
│  ┌──────────────────────────────────┐     │
│  │  Customer Master Keys (CMKs)     │     │
│  │                                  │     │
│  │  - db-encryption-key             │     │
│  │  - s3-encryption-key             │     │
│  │  - secrets-encryption-key        │     │
│  │  - field-encryption-key          │     │
│  └──────────────────────────────────┘     │
│                                            │
│  ┌──────────────────────────────────┐     │
│  │  Data Encryption Keys (DEKs)     │     │
│  │  (Generated from CMKs)           │     │
│  └──────────────────────────────────┘     │
│                                            │
└────────────────────────────────────────────┘
```

**Envelope Encryption**:

1. KMS genera Data Encryption Key (DEK) desde CMK
2. Application usa DEK para cifrar datos
3. DEK cifrado se guarda junto a los datos
4. Para descifrar: KMS descifra DEK → Application descifra datos

---

### KMS Key Creation

```hcl
# Database encryption key
resource "aws_kms_key" "db_key" {
  description             = "Encryption key for RDS databases"
  deletion_window_in_days = 30  # Wait 30 days before deletion
  enable_key_rotation     = true  # Auto-rotate annually

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::123456789:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow RDS to use key"
        Effect = "Allow"
        Principal = {
          Service = "rds.amazonaws.com"
        }
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey"
        ]
        Resource = "*"
      }
    ]
  })

  tags = {
    Name        = "db-encryption-key"
    Environment = "production"
  }
}

resource "aws_kms_alias" "db_key" {
  name          = "alias/db-encryption"
  target_key_id = aws_kms_key.db_key.id
}
```

---

### Key Rotation

**Automatic Rotation** (AWS KMS):

- Enabled: `enable_key_rotation = true`
- Frequency: Every 365 days
- Transparent: Old data cifrado con key antigua sigue siendo descifrable
- New data: Usa nueva key version

**Manual Rotation** (Application-level):

```typescript
// Decrypt with old key, re-encrypt with new key
async function rotateEncryption(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  const oldKey = await getKMSKey('field-encryption-key-v1');
  const newKey = await getKMSKey('field-encryption-key-v2');

  // Decrypt with old key
  const decryptedSSN = decrypt(user.ssn, oldKey);

  // Re-encrypt with new key
  const reencryptedSSN = encrypt(decryptedSSN, newKey);

  // Update database
  await prisma.user.update({
    where: { id: userId },
    data: { ssn: reencryptedSSN, keyVersion: 'v2' },
  });
}
```

---

### Key Access Control (IAM Policy)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["kms:Decrypt", "kms:GenerateDataKey"],
      "Resource": "arn:aws:kms:us-east-1:123456789:key/abc-123",
      "Condition": {
        "StringEquals": {
          "kms:ViaService": "rds.us-east-1.amazonaws.com"
        }
      }
    }
  ]
}
```

**Principle**: Solo RDS service puede usar la key (no humanos).

---

## 🔐 Secrets Management

### Kubernetes Secrets (Encrypted at Rest)

```yaml
# Enable encryption at rest (EKS)
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources:
      - secrets
    providers:
      - kms:
          name: aws-kms
          endpoint: kms.us-east-1.amazonaws.com
          cachesize: 1000
          timeout: 3s
      - identity: {} # Fallback (unencrypted)
```

**Usage**:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: order-service-secret
type: Opaque
stringData:
  DATABASE_URL: 'postgresql://user:pass@host:5432/orders'
  JWT_SECRET: 'super-secret-key'
```

**Stored encrypted** en etcd (Kubernetes backend).

---

### External Secrets Operator (AWS Secrets Manager)

**Problema**: Secrets hardcoded en YAML (bad practice).

**Solución**: Store secrets en AWS Secrets Manager, sync to Kubernetes.

```yaml
# Install External Secrets Operator
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secrets-manager
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
      auth:
        jwt:
          serviceAccountRef:
            name: external-secrets-sa

---
# Sync secret from AWS
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: order-service-secret
spec:
  refreshInterval: 1h # Check for updates hourly
  secretStoreRef:
    name: aws-secrets-manager
  target:
    name: order-service-secret
  data:
    - secretKey: DATABASE_URL
      remoteRef:
        key: ecommerce/order-service/db
    - secretKey: JWT_SECRET
      remoteRef:
        key: ecommerce/order-service/jwt
```

**Benefit**: Secrets centralized en AWS, rotación automática.

---

## 📊 Compliance

### PCI-DSS Requirements

**Requirement 3.4**: "Render PAN unreadable anywhere it is stored"

**Solution**:

- ❌ **DO NOT store credit card numbers** (use Stripe tokenization)
- ✅ Store Stripe token (safe, not PCI-scoped)

```typescript
// Customer enters card
const card = {
  number: '4242424242424242',
  exp_month: 12,
  exp_year: 2026,
  cvc: '123',
};

// Stripe creates token (client-side)
const token = await stripe.createToken(card);

// Send token to backend (NOT card number)
await fetch('/api/payments', {
  method: 'POST',
  body: JSON.stringify({
    token: token.id, // tok_1J3...
    amount: 5000,
  }),
});

// Backend charges via Stripe
const charge = await stripe.charges.create({
  amount: 5000,
  currency: 'usd',
  source: token.id,
});

// Store charge ID (not card number)
await prisma.payment.create({
  data: {
    stripeChargeId: charge.id,
    amount: 5000,
  },
});
```

**Result**: No PCI compliance burden (Stripe handles it).

---

### GDPR Encryption

**Article 32**: "Implement appropriate technical measures, such as encryption"

**Compliance**:

- ✅ Personal data encrypted at rest (AES-256)
- ✅ Personal data encrypted in transit (TLS 1.3)
- ✅ Pseudonymization (user IDs instead of names in logs)
- ✅ Right to erasure (delete user data on request)

---

## 🛠️ Implementation Checklist

### Encryption at Rest

- [ ] RDS databases encrypted (KMS)
- [ ] MongoDB encrypted (KMS)
- [ ] S3 buckets encrypted (KMS)
- [ ] EBS volumes encrypted (KMS)
- [ ] Backups encrypted
- [ ] Kubernetes secrets encrypted (KMS)

### Encryption in Transit

- [ ] TLS 1.3 enabled (min TLS 1.2)
- [ ] HTTPS enforced (redirect HTTP → HTTPS)
- [ ] mTLS between microservices (Istio)
- [ ] Database connections use TLS
- [ ] RabbitMQ connections use TLS
- [ ] External APIs use HTTPS

### Key Management

- [ ] KMS keys created for each use case
- [ ] Key rotation enabled (auto every 365 days)
- [ ] IAM policies restrict key access (least privilege)
- [ ] Secrets in AWS Secrets Manager (not hardcoded)
- [ ] External Secrets Operator installed (sync secrets)

### Security Headers

- [ ] HSTS enabled (max-age 1 year)
- [ ] CSP configured (Content Security Policy)
- [ ] X-Frame-Options: DENY
- [ ] X-Content-Type-Options: nosniff

### Compliance

- [ ] PCI-DSS: No card numbers stored (use Stripe tokens)
- [ ] GDPR: Personal data encrypted
- [ ] Audit logs encrypted and retained

---

## 📈 Monitoring

### KMS Metrics (CloudWatch)

```yaml
# KMS key usage
aws_kms_key_usage{key_id="abc-123",operation="Decrypt"} 1500

# Failed decryption (potential attack)
aws_kms_access_denied{key_id="abc-123"} 3
```

### Alerts

```yaml
- alert: KMSAccessDenied
  expr: aws_kms_access_denied > 10
  for: 5m
  annotations:
    summary: 'KMS key access denied {{ $value }} times'
    severity: warning

- alert: KMSKeyDisabled
  expr: aws_kms_key_state != "Enabled"
  annotations:
    summary: 'KMS key {{ $labels.key_id }} is disabled'
    severity: critical
```

---

## 🔍 Testing

### Verify TLS Configuration

```bash
# Test TLS version
openssl s_client -connect api.ecommerce.com:443 -tls1_2

# Test TLS ciphers
nmap --script ssl-enum-ciphers -p 443 api.ecommerce.com

# Verify certificate
curl -vvI https://api.ecommerce.com 2>&1 | grep -i 'SSL\|TLS'
```

---

### Verify mTLS

```bash
# Order Service should reject non-mTLS connection
curl https://order-service.ecommerce.svc.cluster.local:8000/health
# Expected: Connection refused (no client cert)

# With mTLS
curl --cert /certs/client.pem --key /certs/client-key.pem \
     https://order-service.ecommerce.svc.cluster.local:8000/health
# Expected: 200 OK
```

---

**Última actualización**: Diciembre 2025
