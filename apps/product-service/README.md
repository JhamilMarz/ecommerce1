# Product Service

E-commerce Product Service built with Clean Architecture, PostgreSQL, RabbitMQ events, JWT authentication, and comprehensive observability.

## Features

- ✅ Clean Architecture (Domain → Application → Infrastructure)
- ✅ PostgreSQL with Sequelize ORM
- ✅ RabbitMQ event-driven communication (DLQ + retry logic)
- ✅ JWT authentication + RBAC (admin/user roles)
- ✅ Comprehensive observability (Winston logs, Prometheus metrics, correlation-id)
- ✅ Validation with Joi
- ✅ >80% test coverage (Jest)
- ✅ Docker support
- ✅ TypeScript strict mode

## Tech Stack

- **Runtime**: Node.js 18.20.8
- **Language**: TypeScript 5.7.2
- **Framework**: Express 4.21.2
- **Database**: PostgreSQL via Sequelize 6.37.5
- **Messaging**: RabbitMQ (amqplib 0.10.5)
- **Authentication**: JWT (jsonwebtoken 9.0.2)
- **Validation**: Joi 17.13.3
- **Logging**: Winston 3.17.0
- **Metrics**: Prometheus (prom-client 15.1.3)
- **Testing**: Jest 29.7.0

## Quick Start

### Using Docker Compose (Recommended)

```bash
# Start services
docker-compose up -d

# Run migrations
docker-compose exec product-service npm run db:migrate

# Run seeds
docker-compose exec product-service npm run db:seed

# View logs
docker-compose logs -f product-service
```

### Local Development

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start PostgreSQL and RabbitMQ
docker-compose up -d postgres rabbitmq

# Run migrations
npm run db:migrate

# Run seeds
npm run db:seed

# Development mode
npm run dev

# Production build
npm run build
npm start
```

## API Endpoints

### Products

- `GET /api/products` - List products (with filters)
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create product (admin only)
- `PUT /api/products/:id` - Update product (admin only)
- `DELETE /api/products/:id` - Delete product (admin only)

### Categories

- `GET /api/categories` - List categories
- `POST /api/categories` - Create category (admin only)

### System

- `GET /health` - Health check
- `GET /metrics` - Prometheus metrics

See [docs/api.curl.md](docs/api.curl.md) for detailed API examples.

## Authentication & Authorization

All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

**Roles**:

- `user`: Can read products and categories
- `admin`: Full CRUD access

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage
```

Current coverage: >80%

## Documentation

- [TEST-Product-Service.md](TEST-Product-Service.md) - Complete testing guide
- [docs/api.curl.md](docs/api.curl.md) - cURL examples
