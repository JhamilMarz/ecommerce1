# AUTH SERVICE - MANUAL API TESTS

Tests manuales con curl para el Auth Service.

---

## Prerequisites

- Auth Service corriendo en `http://localhost:3001`
- PostgreSQL corriendo con database `auth_db`
- RabbitMQ corriendo en `localhost:5672`

---

## 1. REGISTER - Successful Registration

**Endpoint:** `POST /api/v1/auth/register`

**Description:** Register a new user with valid credentials

### Request

```bash
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "SecurePass123!",
    "role": "customer"
  }'
```

### Expected Response (201)

```json
{
  "user": {
    "id": "uuid-here",
    "email": "john.doe@example.com",
    "role": "customer",
    "isActive": true,
    "createdAt": "2025-12-26T10:00:00.000Z"
  }
}
```

---

## 2. REGISTER - Duplicate Email

**Endpoint:** `POST /api/v1/auth/register`

**Description:** Attempt to register with existing email

### Request

```bash
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "AnotherPass123!",
    "role": "customer"
  }'
```

### Expected Response (500)

```json
{
  "error": "Email already registered"
}
```

---

## 3. LOGIN - Successful Login

**Endpoint:** `POST /api/v1/auth/login`

**Description:** Login with valid credentials

### Request

```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "SecurePass123!"
  }'
```

### Expected Response (200)

```json
{
  "user": {
    "id": "uuid-here",
    "email": "john.doe@example.com",
    "role": "customer"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 900
}
```

**Save tokens for next tests:**

```bash
export ACCESS_TOKEN="eyJhbGciOiJIUzI1NiIs..."
export REFRESH_TOKEN="eyJhbGciOiJIUzI1NiIs..."
```

---

## 4. LOGIN - Invalid Credentials

**Endpoint:** `POST /api/v1/auth/login`

**Description:** Login with wrong password

### Request

```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "WrongPassword123!"
  }'
```

### Expected Response (500)

```json
{
  "error": "Invalid credentials"
}
```

---

## 5. ME - Get Current User (via API Gateway)

**Endpoint:** `GET /api/v1/auth/me`

**Description:** Get authenticated user info

**Note:** In production, this goes through API Gateway which validates JWT and sets X-User-Id header.

### Request (Direct to Auth Service)

```bash
curl -X GET http://localhost:3001/api/v1/auth/me \
  -H "X-User-Id: uuid-from-login"
```

### Request (Through API Gateway - Production)

```bash
curl -X GET http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### Expected Response (200)

```json
{
  "id": "uuid-here",
  "email": "john.doe@example.com",
  "role": "customer",
  "isActive": true
}
```

---

## 6. REFRESH - Token Refresh

**Endpoint:** `POST /api/v1/auth/refresh`

**Description:** Get new access token using refresh token

### Request

```bash
curl -X POST http://localhost:3001/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{
    \"refreshToken\": \"$REFRESH_TOKEN\"
  }"
```

### Expected Response (200)

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 900
}
```

---

## 7. REFRESH - Invalid Token

**Endpoint:** `POST /api/v1/auth/refresh`

**Description:** Attempt refresh with invalid token

### Request

```bash
curl -X POST http://localhost:3001/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "invalid_token_here"
  }'
```

### Expected Response (500)

```json
{
  "error": "Invalid or expired refresh token"
}
```

---

## 8. LOGOUT - Single Device

**Endpoint:** `POST /api/v1/auth/logout`

**Description:** Logout from current device

### Request

```bash
curl -X POST http://localhost:3001/api/v1/auth/logout \
  -H "Content-Type: application/json" \
  -H "X-User-Id: uuid-from-login" \
  -d "{
    \"refreshToken\": \"$REFRESH_TOKEN\"
  }"
```

### Expected Response (204)

No content

---

## 9. LOGOUT - All Devices

**Endpoint:** `POST /api/v1/auth/logout`

**Description:** Logout from all devices

### Request

```bash
curl -X POST http://localhost:3001/api/v1/auth/logout \
  -H "Content-Type: application/json" \
  -H "X-User-Id: uuid-from-login" \
  -d "{
    \"refreshToken\": \"$REFRESH_TOKEN\",
    \"logoutAll\": true
  }"
```

### Expected Response (204)

No content

---

## 10. REGISTER - Weak Password

**Endpoint:** `POST /api/v1/auth/register`

**Description:** Register with weak password (missing special character)

### Request

```bash
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "weak@example.com",
    "password": "WeakPass123"
  }'
```

### Expected Response (500)

```json
{
  "error": "Password must be at least 8 characters long and contain uppercase, lowercase, number and special character"
}
```

---

## 11. REGISTER - Invalid Email Format

**Endpoint:** `POST /api/v1/auth/register`

**Description:** Register with invalid email format

### Request

```bash
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "not-an-email",
    "password": "SecurePass123!"
  }'
```

### Expected Response (400)

```json
{
  "error": "Must be a valid email address"
}
```

---

## Full Flow Test Script

```bash
#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "Starting Auth Service E2E Tests..."

# 1. Register
echo -e "\n${GREEN}1. Testing REGISTER...${NC}"
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test'$(date +%s)'@example.com",
    "password": "SecurePass123!",
    "role": "customer"
  }')
echo $REGISTER_RESPONSE

# 2. Login
echo -e "\n${GREEN}2. Testing LOGIN...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }')
echo $LOGIN_RESPONSE

# Extract tokens
ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.accessToken')
REFRESH_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.refreshToken')
USER_ID=$(echo $LOGIN_RESPONSE | jq -r '.user.id')

# 3. Get current user
echo -e "\n${GREEN}3. Testing ME...${NC}"
curl -s -X GET http://localhost:3001/api/v1/auth/me \
  -H "X-User-Id: $USER_ID"

# 4. Refresh token
echo -e "\n${GREEN}4. Testing REFRESH...${NC}"
REFRESH_RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}")
echo $REFRESH_RESPONSE

# 5. Logout
echo -e "\n${GREEN}5. Testing LOGOUT...${NC}"
curl -s -X POST http://localhost:3001/api/v1/auth/logout \
  -H "Content-Type: application/json" \
  -H "X-User-Id: $USER_ID" \
  -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}"

echo -e "\n${GREEN}All tests completed!${NC}"
```

---

## Notes

- All timestamps are in ISO 8601 format (UTC)
- Access tokens expire in 15 minutes (900 seconds)
- Refresh tokens expire in 7 days (604800 seconds)
- Passwords must contain: uppercase, lowercase, number, special character (min 8 chars)
- Emails are case-insensitive and stored lowercase
