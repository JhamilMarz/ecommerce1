import express from 'express'

const app = express()
const PORT = process.env.NOTIFICATION_SERVICE_PORT || 3004

app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'notification-service' })
})

// TODO: Implement Notification routes
// - application/use-cases/send-email.use-case.ts
// - infrastructure/services/email.service.ts (nodemailer)
// - Event-driven: consume RabbitMQ events (order.created, payment.completed)

app.listen(PORT, () => {
  console.log(`Notification Service running on port ${PORT}`)
})
