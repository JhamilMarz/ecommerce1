# Integration Contracts

## 📋 Propósito

Define los **contratos de integración con sistemas externos**: Stripe, SendGrid, carriers, cloud services.

## 🔗 Sistemas Externos

---

## 💳 1. Stripe (Payment Gateway)

### Propósito

Procesamiento de pagos con tarjeta de crédito/débito

### API

- **Base URL**: `https://api.stripe.com/v1/`
- **Auth**: Bearer token (secret key)
- **Docs**: https://stripe.com/docs/api

### Endpoints Usados

#### Crear PaymentIntent

```http
POST /v1/payment_intents
Authorization: Bearer sk_test_...

{
  "amount": 1500,          # Centavos (15.00 USD)
  "currency": "usd",
  "customer": "cus_123",
  "metadata": {
    "orderId": "order_456"
  }
}

Response:
{
  "id": "pi_xxx",
  "status": "requires_payment_method",
  "client_secret": "pi_xxx_secret_yyy"
}
```

#### Confirmar Payment

```http
POST /v1/payment_intents/:id/confirm
{
  "payment_method": "pm_card_visa"
}
```

#### Webhooks (Stripe → Nuestro Backend)

```http
POST https://api.ourapp.com/webhooks/stripe
Stripe-Signature: t=xxx,v1=yyy

{
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_xxx",
      "status": "succeeded"
    }
  }
}
```

**Eventos que escuchamos**:

- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `charge.refunded`

### Anti-Corruption Layer

```typescript
// Adapter para abstraer Stripe
interface IPaymentGateway {
  createPayment(amount: Money, orderId: string): Promise<PaymentIntent>;
  confirmPayment(intentId: string): Promise<PaymentResult>;
  refund(paymentId: string, amount: Money): Promise<Refund>;
}

class StripeAdapter implements IPaymentGateway {
  constructor(private stripe: Stripe) {}

  async createPayment(amount: Money, orderId: string) {
    const intent = await this.stripe.paymentIntents.create({
      amount: amount.cents, // Convertir a centavos
      currency: amount.currency.toLowerCase(),
      metadata: { orderId },
    });

    // Traducir de modelo Stripe a nuestro modelo
    return {
      id: intent.id,
      status: this.mapStatus(intent.status),
      clientSecret: intent.client_secret,
    };
  }

  private mapStatus(stripeStatus: string): PaymentStatus {
    const map = {
      requires_payment_method: 'PENDING',
      succeeded: 'COMPLETED',
      canceled: 'FAILED',
    };
    return map[stripeStatus] || 'PENDING';
  }
}
```

### Error Handling

```typescript
try {
  await stripe.paymentIntents.create(...)
} catch (error) {
  if (error.type === 'StripeCardError') {
    // Card declined
    throw new PaymentDeclinedError(error.message)
  } else if (error.type === 'StripeRateLimitError') {
    // Rate limit
    throw new RateLimitError()
  } else {
    // Unknown
    throw new PaymentGatewayError(error.message)
  }
}
```

### Circuit Breaker

```typescript
const circuitBreaker = new CircuitBreaker(stripeClient, {
  timeout: 5000,           // 5s timeout
  errorThresholdPercentage: 50,
  resetTimeout: 30000      // 30s before retry
})

await circuitBreaker.fire(createPayment, ...)
```

---

## 📧 2. SendGrid (Email Service)

### Propósito

Envío de emails transaccionales

### API

- **Base URL**: `https://api.sendgrid.com/v3/`
- **Auth**: Bearer token (API key)
- **Docs**: https://docs.sendgrid.com/api-reference

### Endpoints Usados

#### Enviar Email

```http
POST /mail/send
Authorization: Bearer SG.xxx
Content-Type: application/json

{
  "personalizations": [
    {
      "to": [{ "email": "customer@example.com" }],
      "dynamic_template_data": {
        "orderNumber": "ORD-123",
        "total": "$150.00"
      }
    }
  ],
  "from": { "email": "noreply@ecommerce.com" },
  "template_id": "d-abc123"
}
```

### Templates

| Template ID            | Uso               | Variables                 |
| ---------------------- | ----------------- | ------------------------- |
| `d-order-confirmation` | Orden confirmada  | orderNumber, total, items |
| `d-shipping-update`    | Envío actualizado | trackingNumber, carrier   |
| `d-password-reset`     | Reset password    | resetLink                 |

### Anti-Corruption Layer

```typescript
interface IEmailService {
  sendOrderConfirmation(to: string, order: Order): Promise<void>;
  sendPasswordReset(to: string, resetToken: string): Promise<void>;
}

class SendGridAdapter implements IEmailService {
  constructor(private sgMail: any) {}

  async sendOrderConfirmation(to: string, order: Order) {
    await this.sgMail.send({
      to,
      from: 'noreply@ecommerce.com',
      templateId: 'd-order-confirmation',
      dynamicTemplateData: {
        orderNumber: order.id,
        total: order.total.format(),
        items: order.lines.map((l) => ({
          name: l.productName,
          quantity: l.quantity,
          price: l.unitPrice.format(),
        })),
      },
    });
  }
}
```

### Retry Strategy

```typescript
// Queue de emails con retry
const emailQueue = new Queue('emails', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

// Si falla, reintenta 3 veces con backoff
await emailQueue.add('send', { to, template, data });
```

---

## 🚚 3. Shipping Carriers (FedEx, UPS)

### Propósito

Tracking de envíos y cotización de tarifas

### FedEx API

#### Get Tracking

```http
POST /track/v1/trackingnumbers
Authorization: Bearer <token>

{
  "trackingInfo": [
    {
      "trackingNumberInfo": {
        "trackingNumber": "1234567890"
      }
    }
  ]
}

Response:
{
  "output": {
    "completeTrackResults": [
      {
        "trackingNumber": "1234567890",
        "latestStatusDetail": {
          "code": "OD",
          "description": "Out for Delivery"
        }
      }
    ]
  }
}
```

### Anti-Corruption Layer

```typescript
interface IShippingCarrier {
  getTracking(trackingNumber: string): Promise<TrackingInfo>;
}

class FedExAdapter implements IShippingCarrier {
  async getTracking(trackingNumber: string): Promise<TrackingInfo> {
    const response = await this.fedexClient.track(trackingNumber);

    return {
      trackingNumber,
      status: this.mapStatus(response.latestStatusDetail.code),
      events: response.events.map((e) => ({
        timestamp: new Date(e.timestamp),
        location: e.location,
        description: e.description,
      })),
    };
  }

  private mapStatus(fedexCode: string): ShipmentStatus {
    const map = {
      OD: 'OUT_FOR_DELIVERY',
      DL: 'DELIVERED',
      IT: 'IN_TRANSIT',
    };
    return map[fedexCode] || 'UNKNOWN';
  }
}
```

### Polling Strategy

```typescript
// Cron job: actualizar tracking cada 6 horas
cron.schedule('0 */6 * * *', async () => {
  const activeShipments = await shipmentRepo.findActive();

  for (const shipment of activeShipments) {
    const tracking = await shippingCarrier.getTracking(shipment.trackingNumber);
    await shipment.updateTracking(tracking);
    await shipmentRepo.save(shipment);
  }
});
```

---

## ☁️ 4. AWS S3 (Object Storage)

### Propósito

Almacenamiento de imágenes de productos, documentos

### SDK

```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({ region: 'us-east-1' });
```

### Upload de Imágenes

```typescript
async function uploadProductImage(file: Buffer, productId: string) {
  const key = `products/${productId}/${uuid()}.jpg`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: 'ecommerce-product-images',
      Key: key,
      Body: file,
      ContentType: 'image/jpeg',
      ACL: 'public-read',
    })
  );

  return `https://cdn.ecommerce.com/${key}`;
}
```

### Signed URLs (Para Upload Directo desde Frontend)

```typescript
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

async function getUploadUrl(filename: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: 'ecommerce-product-images',
    Key: `uploads/${uuid()}-${filename}`,
    ContentType: 'image/jpeg',
  });

  // URL válida por 15 minutos
  return await getSignedUrl(s3Client, command, { expiresIn: 900 });
}
```

**Flow**:

1. Frontend pide signed URL al backend
2. Backend genera signed URL y la retorna
3. Frontend sube imagen directamente a S3 (sin pasar por backend)
4. Frontend notifica backend que upload completó

---

## 📊 5. Monitoring & Observability

### Prometheus (Metrics)

**Endpoint**: Cada microservicio expone `/metrics`

```
# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",route="/products",status="200"} 1523

# HELP http_request_duration_seconds HTTP request latency
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{le="0.1"} 850
http_request_duration_seconds_bucket{le="0.5"} 1200
```

### Jaeger (Distributed Tracing)

**Endpoint**: `http://jaeger-collector:14268/api/traces`

```typescript
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('order-service');

const span = tracer.startSpan('create-order');
span.setAttribute('orderId', order.id);
span.setAttribute('customerId', order.customerId);
// ... operación
span.end();
```

---

## 🔒 Security Best Practices

### 1. Secrets Management

```typescript
// ❌ NUNCA en código
const stripeKey = 'sk_live_xxx';

// ✅ Desde Vault/Secrets Manager
const stripeKey = await secretsManager.getSecret('stripe-secret-key');
```

### 2. Timeouts Obligatorios

```typescript
const response = await axios.get(externalAPI, {
  timeout: 5000, // 5 segundos max
});
```

### 3. Exponential Backoff

```typescript
const retry = require('retry');
const operation = retry.operation({
  retries: 3,
  factor: 2,
  minTimeout: 1000,
  maxTimeout: 60000,
});

operation.attempt(async (currentAttempt) => {
  try {
    await externalAPI.call();
  } catch (err) {
    if (operation.retry(err)) {
      return;
    }
    throw operation.mainError();
  }
});
```

---

## 📋 Integration Testing

### Contract Tests (Pact)

```typescript
// Consumer test (our service)
describe('Stripe Integration', () => {
  beforeAll(async () => {
    await provider.setup()
  })

  test('create payment intent', async () => {
    await provider.addInteraction({
      state: 'card is valid',
      uponReceiving: 'create payment intent request',
      withRequest: {
        method: 'POST',
        path: '/v1/payment_intents',
        body: { amount: 1500, currency: 'usd' }
      },
      willRespondWith: {
        status: 200,
        body: {
          id: like('pi_123'),
          status: 'requires_payment_method'
        }
      }
    })

    const result = await stripeAdapter.createPayment(...)
    expect(result.id).toBeDefined()
  })
})
```

---

**Versión**: 1.0  
**Última actualización**: Diciembre 2025
