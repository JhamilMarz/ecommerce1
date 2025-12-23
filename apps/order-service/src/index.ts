import express from 'express'

const app = express()
const PORT = process.env.ORDER_SERVICE_PORT || 3003

app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'order-service' })
})

// TODO: Implement Order routes (Clean Architecture)
// - domain/entities/order.entity.ts (Aggregate Root)
// - domain/entities/order-item.entity.ts
// - domain/repositories/order.repository.ts
// - application/use-cases/create-order.use-case.ts
// - infrastructure/api/controllers/order.controller.ts

app.listen(PORT, () => {
  console.log(`Order Service running on port ${PORT}`)
})
