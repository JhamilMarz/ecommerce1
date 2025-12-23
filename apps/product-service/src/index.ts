import express from 'express'

const app = express()
const PORT = process.env.PRODUCT_SERVICE_PORT || 3002

app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'product-service' })
})

// TODO: Implement Product routes (Clean Architecture)
// - domain/entities/product.entity.ts
// - domain/repositories/product.repository.ts
// - application/use-cases/ (create, update, delete, list)
// - infrastructure/api/controllers/product.controller.ts

app.listen(PORT, () => {
  console.log(`Product Service running on port ${PORT}`)
})
