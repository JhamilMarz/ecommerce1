import express from 'express'

const app = express()
const PORT = process.env.LOGGING_SERVICE_PORT || 3006

app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'logging-service' })
})

// TODO: Implement Logging aggregation
// - Receive logs from other services
// - Forward to Loki/Elasticsearch
// - Query logs endpoint

app.listen(PORT, () => {
  console.log(`Logging Service running on port ${PORT}`)
})
