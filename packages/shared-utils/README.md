# @shared/utils

Common utilities shared across microservices.

## Usage

```typescript
import { createLogger, asyncHandler, isValidUUID } from '@shared/utils'

const logger = createLogger('my-service')
logger.info('Server started')

app.get('/user/:id', asyncHandler(async (req, res) => {
  // Async errors automatically caught
}))
```
