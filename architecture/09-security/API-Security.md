# API Security Guidelines

## 📋 Propósito

Define las prácticas de seguridad específicas para proteger las APIs del sistema e-commerce contra amenazas comunes (OWASP API Top 10).

---

## 🎯 OWASP API Security Top 10 (2023)

### API1:2023 Broken Object Level Authorization (BOLA)

**Problema**: Users pueden acceder a objetos que no les pertenecen.

**Example (vulnerable)**:

```typescript
// ❌ BAD: No verificar ownership
app.get('/api/orders/:id', async (req, res) => {
  const order = await orderRepo.findById(req.params.id);
  res.json(order); // Cualquier user puede ver cualquier order!
});
```

**Solution**:

```typescript
// ✅ GOOD: Verify ownership
app.get('/api/orders/:id', authenticate, async (req, res) => {
  const order = await orderRepo.findById(req.params.id);

  // Check if order belongs to current user
  if (order.customerId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  res.json(order);
});
```

**Middleware** (reusable):

```typescript
function authorizeResource(getResourceOwnerId: (resource: any) => string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const resource = req.resource; // Set by previous middleware
    const ownerId = getResourceOwnerId(resource);

    if (ownerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    next();
  };
}

// Usage
app.get(
  '/api/orders/:id',
  authenticate,
  loadOrder, // Sets req.resource
  authorizeResource((order) => order.customerId),
  (req, res) => res.json(req.resource)
);
```

---

### API2:2023 Broken Authentication

**Problema**: Weak authentication permite credential stuffing, brute force.

**Solutions**:

#### 1. Strong Password Policy

```typescript
import { z } from 'zod';

const PasswordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .regex(/[A-Z]/, 'Password must contain uppercase letter')
  .regex(/[a-z]/, 'Password must contain lowercase letter')
  .regex(/[0-9]/, 'Password must contain number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain special character');
```

---

#### 2. Rate Limiting (Login Attempts)

```typescript
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per IP
  message: 'Too many login attempts, try again in 15 minutes',
  skipSuccessfulRequests: true, // Only count failed attempts
});

app.post('/api/auth/login', loginLimiter, loginHandler);
```

---

#### 3. Account Lockout (After Failed Attempts)

```typescript
async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new Error('Invalid credentials');
  }

  // Check if account locked
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new Error(`Account locked until ${user.lockedUntil}`);
  }

  // Verify password
  const valid = await bcrypt.compare(password, user.passwordHash);

  if (!valid) {
    // Increment failed attempts
    const failedAttempts = user.failedLoginAttempts + 1;

    // Lock account after 5 failed attempts (30 minutes)
    const lockedUntil =
      failedAttempts >= 5 ? new Date(Date.now() + 30 * 60 * 1000) : null;

    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: failedAttempts, lockedUntil },
    });

    throw new Error('Invalid credentials');
  }

  // Reset failed attempts on successful login
  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginAttempts: 0, lockedUntil: null },
  });

  return generateJWT(user);
}
```

---

#### 4. Multi-Factor Authentication (MFA)

```typescript
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';

// Enable MFA (generate TOTP secret)
async function enableMFA(userId: string) {
  const secret = speakeasy.generateSecret({
    name: 'E-Commerce',
    issuer: 'E-Commerce',
  });

  // Save secret to database
  await prisma.user.update({
    where: { id: userId },
    data: { mfaSecret: secret.base32, mfaEnabled: true },
  });

  // Generate QR code for user to scan
  const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url!);

  return { secret: secret.base32, qrCodeUrl };
}

// Verify MFA token
async function verifyMFA(userId: string, token: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user?.mfaSecret) {
    throw new Error('MFA not enabled');
  }

  return speakeasy.totp.verify({
    secret: user.mfaSecret,
    encoding: 'base32',
    token,
    window: 1, // Allow 1 step before/after (30s tolerance)
  });
}

// Login flow with MFA
app.post('/api/auth/login', async (req, res) => {
  const { email, password, mfaToken } = req.body;

  const user = await authenticateUser(email, password);

  if (user.mfaEnabled) {
    if (!mfaToken) {
      return res.status(200).json({ requiresMFA: true });
    }

    const validMFA = await verifyMFA(user.id, mfaToken);
    if (!validMFA) {
      return res.status(401).json({ error: 'Invalid MFA token' });
    }
  }

  const token = generateJWT(user);
  res.json({ token });
});
```

---

### API3:2023 Broken Object Property Level Authorization

**Problema**: API expone propiedades sensibles o permite modificar propiedades protegidas.

**Example (vulnerable)**:

```typescript
// ❌ BAD: Expose all properties
app.get('/api/users/:id', async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  res.json(user); // Includes passwordHash, mfaSecret, etc.!
});
```

**Solution 1: DTO (Data Transfer Object)**:

```typescript
// ✅ GOOD: Only return safe properties
interface UserDTO {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: Date;
  // NO passwordHash, mfaSecret, etc.
}

function toUserDTO(user: User): UserDTO {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt,
  };
}

app.get('/api/users/:id', async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  res.json(toUserDTO(user));
});
```

**Solution 2: Prisma Select**:

```typescript
// ✅ GOOD: Select only safe fields
const user = await prisma.user.findUnique({
  where: { id: req.params.id },
  select: {
    id: true,
    email: true,
    name: true,
    role: true,
    createdAt: true,
    // passwordHash: false (excluded)
  },
});
```

---

**Prevent Mass Assignment**:

```typescript
// ❌ BAD: User can change their role!
app.patch('/api/users/me', authenticate, async (req, res) => {
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: req.body, // User can send { role: 'admin' }!
  });
  res.json(user);
});

// ✅ GOOD: Whitelist allowed properties
const UpdateUserSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  // role NOT allowed
});

app.patch('/api/users/me', authenticate, async (req, res) => {
  const data = UpdateUserSchema.parse(req.body);

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data, // Only name/email can be updated
  });
  res.json(user);
});
```

---

### API4:2023 Unrestricted Resource Consumption

**Problema**: No rate limiting permite DoS attacks.

**Solutions**:

#### 1. Global Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per IP
  message: 'Too many requests',
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
});

app.use('/api/', globalLimiter);
```

---

#### 2. Per-Endpoint Rate Limiting

```typescript
// Stricter for expensive operations
const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 searches per minute
  message: 'Too many search requests',
});

app.get('/api/products/search', searchLimiter, searchHandler);
```

---

#### 3. Pagination (Prevent Large Responses)

```typescript
// ❌ BAD: No limit (can return 1 million orders)
app.get('/api/orders', async (req, res) => {
  const orders = await prisma.order.findMany();
  res.json(orders);
});

// ✅ GOOD: Enforce pagination
app.get('/api/orders', async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100); // Max 100

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.order.count(),
  ]);

  res.json({
    data: orders,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});
```

---

#### 4. Request Size Limits

```typescript
import express from 'express';

app.use(
  express.json({
    limit: '10kb', // Max 10KB payload (prevent huge JSON bombs)
  })
);

// For file uploads (different endpoint)
import multer from 'multer';

const upload = multer({
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
});

app.post('/api/products/:id/image', upload.single('image'), uploadHandler);
```

---

#### 5. Timeout (Prevent Slow Loris)

```typescript
import timeout from 'connect-timeout';

app.use(timeout('30s')); // 30 second timeout

app.use((req, res, next) => {
  if (!req.timedout) next();
});
```

---

### API5:2023 Broken Function Level Authorization

**Problema**: Users pueden acceder a funciones administrativas.

**Solution: RBAC Middleware**:

```typescript
function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    next();
  };
}

// Usage
app.delete(
  '/api/users/:id',
  authenticate,
  requireRole('admin'), // Only admins can delete users
  deleteUserHandler
);

app.get(
  '/api/analytics',
  authenticate,
  requireRole('admin', 'analyst'), // Admins + Analysts
  analyticsHandler
);
```

---

### API6:2023 Unrestricted Access to Sensitive Business Flows

**Problema**: No protection contra automated abuse (bots buying all inventory).

**Solutions**:

#### 1. CAPTCHA (High-Value Actions)

```typescript
import axios from 'axios';

async function verifyCaptcha(token: string): Promise<boolean> {
  const response = await axios.post(
    'https://www.google.com/recaptcha/api/siteverify',
    null,
    {
      params: {
        secret: process.env.RECAPTCHA_SECRET,
        response: token,
      },
    }
  );

  return response.data.success && response.data.score > 0.5;
}

// Require CAPTCHA for order creation
app.post('/api/orders', authenticate, async (req, res) => {
  const { captchaToken, ...orderData } = req.body;

  const validCaptcha = await verifyCaptcha(captchaToken);
  if (!validCaptcha) {
    return res.status(400).json({ error: 'Invalid CAPTCHA' });
  }

  const order = await createOrder(orderData);
  res.json(order);
});
```

---

#### 2. Idempotency (Prevent Double Submit)

```typescript
// Use idempotency key (client-generated UUID)
app.post('/api/orders', authenticate, async (req, res) => {
  const idempotencyKey = req.headers['idempotency-key'] as string;

  if (!idempotencyKey) {
    return res.status(400).json({ error: 'Idempotency-Key header required' });
  }

  // Check if already processed
  const existing = await redis.get(`order:${idempotencyKey}`);
  if (existing) {
    return res.json(JSON.parse(existing)); // Return cached result
  }

  // Process order
  const order = await createOrder(req.body);

  // Cache result (24h TTL)
  await redis.set(
    `order:${idempotencyKey}`,
    JSON.stringify(order),
    'EX',
    86400
  );

  res.json(order);
});
```

---

#### 3. Device Fingerprinting (Detect Bots)

```typescript
import Fingerprint from '@fingerprintjs/fingerprintjs';

// Client-side
const fp = await Fingerprint.load();
const result = await fp.get();

fetch('/api/orders', {
  method: 'POST',
  headers: {
    'X-Fingerprint': result.visitorId,
  },
  body: JSON.stringify(orderData),
});

// Server-side
app.post('/api/orders', authenticate, async (req, res) => {
  const fingerprint = req.headers['x-fingerprint'] as string;

  // Check if this fingerprint created too many orders recently
  const recentOrders = await redis.incr(`orders:${fingerprint}`);
  await redis.expire(`orders:${fingerprint}`, 3600); // 1 hour window

  if (recentOrders > 10) {
    return res.status(429).json({ error: 'Too many orders from this device' });
  }

  // ...
});
```

---

### API7:2023 Server Side Request Forgery (SSRF)

**Problema**: API fetch URL provided by user, puede acceder a internal services.

**Example (vulnerable)**:

```typescript
// ❌ BAD: User controls URL
app.post('/api/fetch-url', async (req, res) => {
  const { url } = req.body;
  const response = await fetch(url); // User can fetch internal services!
  res.send(response.data);
});

// Attack: POST /api/fetch-url with url=http://internal-db:5432/
```

**Solution: Whitelist**:

```typescript
// ✅ GOOD: Validate URL
const ALLOWED_DOMAINS = ['cdn.example.com', 'images.example.com'];

app.post('/api/fetch-url', async (req, res) => {
  const { url } = req.body;

  const parsedUrl = new URL(url);

  // Check domain whitelist
  if (!ALLOWED_DOMAINS.includes(parsedUrl.hostname)) {
    return res.status(400).json({ error: 'URL not allowed' });
  }

  // Block internal IPs
  const ip = await dns.resolve(parsedUrl.hostname);
  if (isPrivateIP(ip)) {
    return res.status(400).json({ error: 'Cannot access internal IPs' });
  }

  const response = await fetch(url);
  res.send(response.data);
});

function isPrivateIP(ip: string): boolean {
  return (
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    ip.startsWith('172.16.') ||
    ip === '127.0.0.1' ||
    ip === 'localhost'
  );
}
```

---

### API8:2023 Security Misconfiguration

**Common Issues**:

#### 1. Verbose Error Messages

```typescript
// ❌ BAD: Leak stack traces
app.use((err, req, res, next) => {
  res.status(500).json({
    error: err.message,
    stack: err.stack, // Exposes internal paths!
  });
});

// ✅ GOOD: Generic error in production
app.use((err, req, res, next) => {
  logger.error({ err, req }, 'Unhandled error');

  res.status(500).json({
    error:
      process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message, // Detailed only in dev
  });
});
```

---

#### 2. Expose Sensitive Headers

```typescript
// Remove headers that reveal technology
app.disable('x-powered-by'); // Hide "Express"

app.use((req, res, next) => {
  res.removeHeader('Server'); // Hide server type
  next();
});
```

---

#### 3. Default Credentials

```bash
# NEVER use defaults
RABBITMQ_USER=admin  # ❌ Change this!
RABBITMQ_PASS=admin  # ❌ Change this!

# ✅ Generate strong passwords
RABBITMQ_USER=rabbitmq_prod_user
RABBITMQ_PASS=$(openssl rand -base64 32)
```

---

### API9:2023 Improper Inventory Management

**Solutions**:

- **API Documentation**: OpenAPI/Swagger (auto-generated from code)
- **Versioning**: `/api/v1/orders`, `/api/v2/orders`
- **Deprecated Endpoints**: Return `410 Gone` after deprecation period
- **Asset Inventory**: Document all APIs, databases, services

---

### API10:2023 Unsafe Consumption of APIs

**Problema**: Trusting external APIs sin validar respuestas.

**Solution: Validate External API Responses**:

```typescript
// ❌ BAD: Trust Stripe response blindly
const charge = await stripe.charges.create({ amount, source: token });
await updateOrder(orderId, { status: 'paid' });

// ✅ GOOD: Validate response
const charge = await stripe.charges.create({ amount, source: token });

if (charge.status !== 'succeeded') {
  throw new Error(`Payment failed: ${charge.failure_message}`);
}

if (charge.amount !== amount) {
  throw new Error('Payment amount mismatch');
}

// Now safe to update order
await updateOrder(orderId, { status: 'paid', stripeChargeId: charge.id });
```

---

## 🔒 Additional Security Headers

```typescript
import helmet from 'helmet';

app.use(
  helmet({
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
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: { policy: 'no-referrer' },
    noSniff: true,
    xssFilter: true,
    frameguard: { action: 'deny' },
  })
);
```

---

## ✅ API Security Checklist

- [ ] Authentication required (JWT validation)
- [ ] Authorization checks (RBAC middleware)
- [ ] Object-level authorization (verify ownership)
- [ ] Rate limiting (global + per-endpoint)
- [ ] Input validation (Zod schemas)
- [ ] Output filtering (DTOs, no sensitive data)
- [ ] Pagination enforced (max 100 items)
- [ ] Request size limits (10KB payload)
- [ ] Timeouts (30s)
- [ ] CORS configured (no wildcard `*`)
- [ ] Security headers (Helmet)
- [ ] Error handling (no stack traces in prod)
- [ ] Logging (security events, failed logins)
- [ ] HTTPS enforced (redirect HTTP → HTTPS)
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (React escaping + CSP)
- [ ] CSRF protection (CSRF tokens)
- [ ] SSRF prevention (URL whitelist)
- [ ] Idempotency (prevent double submit)
- [ ] CAPTCHA (high-value actions)
- [ ] MFA (optional but recommended)

---

**Última actualización**: Diciembre 2025
