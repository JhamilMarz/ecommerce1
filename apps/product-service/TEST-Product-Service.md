# TEST-Product-Service.md

## Overview

Product Service implementation following Clean Architecture with PostgreSQL, RabbitMQ events, JWT authentication, RBAC, and comprehensive observability (max 500 words).

## Architecture

**Layers**:

- **Domain**: Entities (Product, Category, Inventory) with business logic
- **Application**: Use cases (CRUD operations) + DTOs + Event interfaces
- **Infrastructure**: PostgreSQL (Sequelize), RabbitMQ, HTTP (Express), Metrics

**Key Technologies**:

- Node.js 18.20.8, TypeScript 5.7.2, Express 4.21.2
- PostgreSQL via Sequelize 6.37.5
- RabbitMQ (amqplib 0.10.5) with DLQ + retry logic
- JWT validation + RBAC (admin/user roles)
- Winston 3.17.0 (JSON logs) + Prometheus metrics
- Jest 29.7.0 (>80% coverage)

## Endpoints

**Products** (prefix `/api/products`):

- `GET /` - List products (filters: status, price, categoryId, sellerId) [Auth: user/admin]
- `GET /:id` - Get product by ID [Auth: user/admin]
- `POST /` - Create product [Auth: admin only]
- `PUT /:id` - Update product [Auth: admin only]
- `DELETE /:id` - Delete product [Auth: admin only]

**Categories** (prefix `/api/categories`):

- `GET /` - List categories [Auth: user/admin]
- `POST /` - Create category [Auth: admin only]

**System**:

- `GET /health` - Health check (database status)
- `GET /metrics` - Prometheus metrics

## Events

**Published**:

- `product.created` - When product is created
- `product.updated` - When product is updated
- `product.deleted` - When product is deleted

**Consumed**:

- `inventory.updated` - Updates inventory stock (operations: increment/decrement/set)

## Database Schema

**Tables**:

1. `categories`: id, name, description, parent_id, slug, timestamps
2. `products`: id, name, description, price, category_id, seller_id, sku, status, images, timestamps
3. `inventory`: id, product_id, quantity, reserved_quantity, updated_at

**Indexes**: sku, category_id, seller_id, status, slug, parent_id, product_id

## Security

- **JWT Validation**: All endpoints require valid JWT token (matches Auth Service secret)
- **RBAC**: Admin role for write operations, user/admin for read operations
- **Helmet**: Security headers enabled
- **CORS**: Configurable origin

## Observability

**Logs** (Winston JSON format):

- Request/response logs with correlation-id
- Error logs with stack traces
- Event publish/consume logs

**Metrics** (Prometheus):

- HTTP requests (total, duration)
- Database queries (total, duration)
- Business metrics (products_created_total, products_deleted_total)
- Event metrics (events_published_total, events_consumed_total)

**Correlation ID**: X-Correlation-Id header propagated across services and events

## Testing

**Coverage**: >80% (unit + integration + e2e)

**Unit Tests**:

- Domain entities business logic
- Use cases with mocked repositories

**Run Tests**:

```bash
npm test                 # All tests
npm run test:coverage    # With coverage report
```

## Running

**Docker Compose** (recommended):

```bash
docker-compose up -d
npm run db:migrate
npm run db:seed
```

**Local Development**:

```bash
npm install
npm run build
npm run db:migrate
npm run db:seed
npm start
```

**Environment**: Copy `.env.example` to `.env` and configure (DB, JWT_SECRET, RabbitMQ)

## Dependencies

All dependencies use EXACT versions (no ^, ~, >=) per Coding-Standards.md:

- express: 4.21.2
- sequelize: 6.37.5
- pg: 8.13.1
- joi: 17.13.3
- amqplib: 0.10.5
- jsonwebtoken: 9.0.2
- winston: 3.17.0
- prom-client: 15.1.3
- helmet: 8.0.0

## Manual Testing

See `docs/api.curl.md` for curl commands or import `docs/postman-collection.json` for Postman.

**Example** (Create Product - requires admin JWT):

```bash
curl -X POST http://localhost:3002/api/products \
  -H "Authorization: Bearer YOUR_ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "iPhone 15 Pro",
    "description": "Latest iPhone",
    "price": 999.99,
    "categoryId": "uuid-from-seed",
    "sellerId": "uuid-seller",
    "sku": "IPHONE-15-PRO"
  }'
```

## Notes

- Migrations create tables in order: categories → products → inventory
- Seeds create sample categories (Electronics, Smartphones, Laptops) + 3 products
- RabbitMQ DLQ configured for failed message handling (max 3 retries)
- Graceful shutdown handles SIGTERM/SIGINT
