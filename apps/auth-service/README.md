# Auth Service

Authentication and authorization microservice.

## Features

- User registration
- User login (JWT)
- Password hashing (bcrypt)
- Token generation
- Clean Architecture structure

## Architecture

```
src/
├── domain/           # Business entities and interfaces
├── application/      # Use cases (business logic)
└── infrastructure/   # Technical implementation
    ├── api/         # HTTP controllers and routes
    ├── database/    # Database repositories
    ├── services/    # Technical services
    ├── config/      # Configuration
    └── logger/      # Logging
```

## Development

```bash
pnpm dev
```

## Build

```bash
pnpm build
```

## Test

```bash
pnpm test
```
