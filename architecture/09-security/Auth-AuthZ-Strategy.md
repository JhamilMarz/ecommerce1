# Auth & AuthZ Strategy

## 📋 Propósito

Define estrategia completa de **autenticación** (quién eres) y **autorización** (qué puedes hacer).

## 🔐 Authentication (Autenticación)

### JWT (JSON Web Tokens)

**Algoritmo**: RS256 (RSA asymmetric)  
**Por qué RS256**: Public key para validar, private key solo en IAM Service

**Token Structure**:

```json
{
  "header": {
    "alg": "RS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "user-123",
    "email": "user@example.com",
    "role": "customer",
    "permissions": ["order:create", "order:read"],
    "iat": 1703168400,
    "exp": 1703254800
  },
  "signature": "..."
}
```

**Expiration**:

- Access Token: 24 horas
- Refresh Token: 30 días

**Storage**:

- Frontend: httpOnly cookie (XSS protection) o localStorage (si SPA)
- Backend: No almacenar (stateless), solo validar firma

---

### Login Flow

```
1. POST /api/v1/auth/login
   Body: { email, password }

2. IAM Service:
   - Validar credentials
   - Hash password con bcrypt (cost 12)
   - Generar access token + refresh token
   - Return: { accessToken, refreshToken, expiresIn }

3. Client almacena tokens

4. Subsequent requests:
   Authorization: Bearer <accessToken>
```

---

### Refresh Token Flow

```
1. POST /api/v1/auth/refresh
   Body: { refreshToken }

2. IAM Service:
   - Validar refresh token (signature + expiration)
   - Check if revoked (Redis blacklist)
   - Generar nuevo access token
   - Return: { accessToken, expiresIn }
```

---

### OAuth2 / OpenID Connect (Social Login)

**Providers**: Google, Facebook

**Flow**: Authorization Code Flow with PKCE

```
1. User click "Login with Google"
2. Redirect to Google OAuth consent
3. User approves
4. Google redirects back with authorization code
5. Backend exchanges code for tokens
6. Create/link user in our system
7. Issue our own JWT tokens
```

**Implementation**: Passport.js strategies

---

### Multi-Factor Authentication (MFA)

**Obligatorio para**: Admins, Sellers (opcional para Customers)

**Método**: TOTP (Time-based One-Time Password)  
**App**: Google Authenticator, Authy

**Setup Flow**:

```
1. User enables MFA
2. Generate secret
3. Show QR code
4. User scans with authenticator app
5. User enters verification code
6. Store hashed secret
```

**Login con MFA**:

```
1. Enter email + password (first factor)
2. If MFA enabled:
   - Prompt for 6-digit code
   - Validate TOTP code (30s window)
3. Issue JWT tokens
```

---

## 🔑 Authorization (Autorización)

### RBAC (Role-Based Access Control)

**Roles**:

- **Customer**: Puede comprar, ver sus órdenes
- **Seller**: Puede listar productos, gestionar inventario
- **Admin**: Acceso completo (users, products, orders, config)

**Permissions Granulares**:

```typescript
enum Permission {
  // Products
  PRODUCT_READ = 'product:read',
  PRODUCT_CREATE = 'product:create',
  PRODUCT_UPDATE = 'product:update',
  PRODUCT_DELETE = 'product:delete',

  // Orders
  ORDER_READ = 'order:read',
  ORDER_CREATE = 'order:create',
  ORDER_CANCEL = 'order:cancel',

  // Admin
  USER_MANAGE = 'user:manage',
  CONFIG_MANAGE = 'config:manage',
}
```

**Role → Permissions Mapping**:

```typescript
const rolePermissions = {
  customer: [
    Permission.PRODUCT_READ,
    Permission.ORDER_CREATE,
    Permission.ORDER_READ, // Solo sus propias órdenes
  ],
  seller: [
    Permission.PRODUCT_READ,
    Permission.PRODUCT_CREATE,
    Permission.PRODUCT_UPDATE,
    Permission.PRODUCT_DELETE, // Solo sus productos
    Permission.ORDER_READ, // Solo órdenes de sus productos
  ],
  admin: [
    '*', // Todas las permissions
  ],
};
```

---

### Enforcement en API

#### Middleware de Autenticación

```typescript
function authenticate(req, res, next) {
  const token = extractTokenFromHeader(req);

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] });
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

#### Middleware de Autorización

```typescript
function authorize(...requiredPermissions: Permission[]) {
  return (req, res, next) => {
    const userPermissions = req.user.permissions;

    const hasPermission = requiredPermissions.every(
      (perm) => userPermissions.includes(perm) || userPermissions.includes('*')
    );

    if (!hasPermission) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    next();
  };
}
```

#### Uso en Routes

```typescript
router.post(
  '/products',
  authenticate,
  authorize(Permission.PRODUCT_CREATE),
  createProductController
);

router.delete(
  '/products/:id',
  authenticate,
  authorize(Permission.PRODUCT_DELETE),
  async (req, res) => {
    // Verify ownership
    const product = await productRepo.findById(req.params.id);
    if (product.sellerId !== req.user.sub && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not your product' });
    }
    // ...
  }
);
```

---

### Resource-Level Authorization

**Problema**: Seller puede ver/editar solo SUS productos, no todos

**Solución**: Verificar ownership en use case layer

```typescript
class UpdateProductUseCase {
  async execute(userId: string, productId: string, data: UpdateData) {
    const product = await this.productRepo.findById(productId);

    if (!product) {
      throw new ProductNotFoundError();
    }

    // Authorization check
    if (product.sellerId !== userId) {
      throw new UnauthorizedError('Cannot update product of another seller');
    }

    product.update(data);
    await this.productRepo.save(product);
  }
}
```

---

## 🔒 Security Best Practices

### Password Policy

- Mínimo 8 caracteres
- Al menos 1 mayúscula, 1 minúscula, 1 número, 1 especial
- No contraseñas comunes (diccionario: `rockyou.txt`)
- Hash con bcrypt (cost factor 12)

### Rate Limiting

```typescript
// Login endpoint: 5 intentos / 15 minutos por IP
app.use(
  '/auth/login',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many login attempts, please try again later',
  })
);

// General API: 100 req/min por IP
app.use(
  '/api',
  rateLimit({
    windowMs: 60 * 1000,
    max: 100,
  })
);
```

### Account Lockout

- Después de 5 intentos fallidos: bloquear cuenta por 15 minutos
- Después de 10 intentos fallidos: bloquear permanentemente (require admin unlock)

### Token Revocation

- Mantener blacklist de tokens revocados en Redis
- TTL = remaining time until expiration
- Check blacklist en cada validación de token

```typescript
async function validateToken(token: string) {
  const decoded = jwt.verify(token, publicKey);

  // Check if revoked
  const isRevoked = await redis.exists(`revoked:${decoded.jti}`);
  if (isRevoked) {
    throw new TokenRevokedError();
  }

  return decoded;
}

async function revokeToken(token: string) {
  const decoded = jwt.decode(token);
  const ttl = decoded.exp - Math.floor(Date.now() / 1000);
  await redis.setex(`revoked:${decoded.jti}`, ttl, '1');
}
```

### Audit Logging

Loguear TODOS los eventos de autenticación/autorización:

- Login exitoso/fallido
- Logout
- Token refresh
- MFA enable/disable
- Permission changes
- Access denied (403)

```typescript
auditLogger.log({
  event: 'LOGIN_SUCCESS',
  userId: user.id,
  email: user.email,
  ip: req.ip,
  userAgent: req.headers['user-agent'],
  timestamp: new Date(),
});
```

---

## 🚨 Threat Mitigation

### Brute Force Attacks

✅ Rate limiting  
✅ Account lockout  
✅ CAPTCHA después de 3 intentos fallidos

### Token Theft

✅ Short-lived access tokens (24h)  
✅ Refresh token rotation  
✅ httpOnly cookies (no accessible via JavaScript)  
✅ HTTPS only (no plain HTTP)

### XSS (Cross-Site Scripting)

✅ CSP headers  
✅ Sanitize user input  
✅ httpOnly cookies

### CSRF (Cross-Site Request Forgery)

✅ SameSite cookie attribute  
✅ CSRF tokens en forms  
✅ Double-submit cookie pattern

---

## 📊 Monitoring & Alerting

### Métricas a Trackear:

- Failed login attempts por IP/usuario
- Token validation failures
- 401/403 rate
- MFA bypass attempts
- Anomalous login patterns (login desde nuevo país)

### Alertas:

🚨 **Critical**: > 100 failed logins en 5 minutos  
⚠️ **Warning**: Same user login desde 2 países en < 1 hora

---

**Versión**: 1.0  
**Última actualización**: Diciembre 2025  
**Responsable**: Security Team + IAM Service Owner
