# Order Service

Microservicio de gestión de órdenes con MongoDB, RabbitMQ, JWT auth y Clean Architecture.

## 🚀 Tecnologías

- **Node.js** 18.20.8 + **TypeScript** 5.7.2
- **Express** 4.21.2 + Helmet + CORS
- **MongoDB** 8.9.3 (Mongoose)
- **RabbitMQ** (amqplib 0.10.5)
- **JWT** Authentication + RBAC
- **Joi** validation
- **Winston** logging
- **Prometheus** metrics
- **Jest** testing (>80% coverage)

## 📦 Instalación

```bash
# Instalar dependencias
pnpm install

# Configurar variables de entorno
cp .env.example .env

# Iniciar servicios con Docker
docker-compose up -d mongodb rabbitmq

# Ejecutar en desarrollo
pnpm dev
```

## 🏗️ Arquitectura

Clean Architecture con DDD (Domain-Driven Design):

- Order as Aggregate Root
- Order Items as entities
- Saga pattern for distributed transactions

## 🔌 API Endpoints

**POST** `/orders` - Crear orden (auth required)  
**GET** `/orders/:id` - Obtener orden (owner o admin)  
**GET** `/orders/user/:userId` - Listar órdenes (paginated)  
**PATCH** `/orders/:id/status` - Actualizar estado (admin only)  
**GET** `/orders/:id/history` - Historial de cambios  
**GET** `/health` - Health check  
**GET** `/metrics` - Prometheus metrics

## 🔐 Autenticación

JWT en header: `Authorization: Bearer <token>`

**Roles:** `user` (solo sus órdenes), `admin` (todas)

## 📊 Estados

```
pending → awaiting_payment → paid → shipped → completed
                           ↓
                       cancelled
```

## 🐰 RabbitMQ

**Publica:** order.created, order.paid, order.cancelled  
**Consume:** payment.succeeded, payment.failed

## 🧪 Testing

```bash
pnpm test          # Run tests
pnpm test:coverage # Coverage >80%
```

## 🐳 Docker

```bash
docker-compose up -d    # Start
docker-compose down     # Stop
```
