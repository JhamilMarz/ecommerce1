# Product Service API - Manual Testing with cURL

## Prerequisites

- Get JWT token from Auth Service first
- Replace `YOUR_JWT_TOKEN` with actual token
- Replace UUIDs with actual values from database

## Health Check

```bash
curl http://localhost:3002/health
```

## Metrics

```bash
curl http://localhost:3002/metrics
```

## Categories

### List Categories

```bash
curl http://localhost:3002/api/categories \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Create Category (Admin only)

```bash
curl -X POST http://localhost:3002/api/categories \
  -H "Authorization: Bearer YOUR_ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -H "X-Correlation-Id: test-001" \
  -d '{
    "name": "Gaming Consoles",
    "description": "Gaming consoles and accessories",
    "slug": "gaming-consoles",
    "parentId": null
  }'
```

## Products

### List All Products

```bash
curl http://localhost:3002/api/products \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### List Products with Filters

```bash
# By status
curl "http://localhost:3002/api/products?status=active" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# By price range
curl "http://localhost:3002/api/products?minPrice=500&maxPrice=1500" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# By category
curl "http://localhost:3002/api/products?categoryId=CATEGORY_UUID" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# By seller
curl "http://localhost:3002/api/products?sellerId=SELLER_UUID" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Product by ID

```bash
curl http://localhost:3002/api/products/PRODUCT_UUID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Create Product (Admin only)

```bash
curl -X POST http://localhost:3002/api/products \
  -H "Authorization: Bearer YOUR_ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -H "X-Correlation-Id: test-002" \
  -d '{
    "name": "PlayStation 5",
    "description": "Next-gen gaming console with 4K graphics",
    "price": 499.99,
    "categoryId": "CATEGORY_UUID",
    "sellerId": "SELLER_UUID",
    "sku": "PS5-DISC-VERSION",
    "status": "active",
    "images": [
      "https://example.com/ps5-1.jpg",
      "https://example.com/ps5-2.jpg"
    ]
  }'
```

### Update Product (Admin only)

```bash
curl -X PUT http://localhost:3002/api/products/PRODUCT_UUID \
  -H "Authorization: Bearer YOUR_ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -H "X-Correlation-Id: test-003" \
  -d '{
    "name": "PlayStation 5 Pro",
    "price": 599.99,
    "description": "Enhanced gaming console with 8K support"
  }'
```

### Delete Product (Admin only)

```bash
curl -X DELETE http://localhost:3002/api/products/PRODUCT_UUID \
  -H "Authorization: Bearer YOUR_ADMIN_JWT" \
  -H "X-Correlation-Id: test-004"
```

## Error Scenarios

### Unauthorized (No token)

```bash
curl http://localhost:3002/api/products
# Expected: 401 Unauthorized
```

### Forbidden (User tries admin operation)

```bash
curl -X POST http://localhost:3002/api/products \
  -H "Authorization: Bearer YOUR_USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test"}'
# Expected: 403 Forbidden
```

### Validation Error

```bash
curl -X POST http://localhost:3002/api/products \
  -H "Authorization: Bearer YOUR_ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "A",
    "price": -100
  }'
# Expected: 400 Bad Request with validation errors
```

### Not Found

```bash
curl http://localhost:3002/api/products/00000000-0000-0000-0000-000000000000 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
# Expected: 404 Not Found
```

## Notes

- All authenticated endpoints require `Authorization: Bearer <token>` header
- Admin operations require JWT with `role: "admin"`
- Use `X-Correlation-Id` header to trace requests across services
- Response includes `X-Correlation-Id` header for tracking
