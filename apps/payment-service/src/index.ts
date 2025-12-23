import express from 'express'

const app = express()
const PORT = process.env.PAYMENT_SERVICE_PORT || 3005

app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'payment-service' })
})

// TODO: Implement Payment routes
// - application/use-cases/process-payment.use-case.ts
// - infrastructure/services/stripe.service.ts
// - Webhook handling (/webhook) for Stripe events
// - PCI-DSS compliance (never store card numbers)

app.listen(PORT, () => {
  console.log(`Payment Service running on port ${PORT}`)
})
