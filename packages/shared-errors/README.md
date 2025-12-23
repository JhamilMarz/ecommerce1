# @shared/errors

Custom error classes for consistent error handling across microservices.

## Usage

```typescript
import { NotFoundError, ValidationError, UnauthorizedError } from '@shared/errors'

throw new NotFoundError('User', userId)
throw new ValidationError('Invalid input', { email: ['Invalid email format'] })
```

All errors extend `BaseError` with statusCode and isOperational properties.
