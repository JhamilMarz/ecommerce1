import { Router } from 'express';
import client, { register, Counter, Histogram, Gauge } from 'prom-client';
import { logger } from '../observability/logger';

/**
 * Prometheus Metrics
 * 
 * Architecture: Infrastructure Layer - Observability
 * Exposes application metrics for Prometheus scraping
 */

// Enable default metrics (CPU, memory, etc.)
client.collectDefaultMetrics({
  prefix: 'order_service_',
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
});

/**
 * Custom Metrics
 */

// HTTP request counter
export const httpRequestCounter = new Counter({
  name: 'order_service_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status'],
});

// HTTP request duration histogram
export const httpRequestDuration = new Histogram({
  name: 'order_service_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'path', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

// Order creation counter
export const orderCreatedCounter = new Counter({
  name: 'order_service_orders_created_total',
  help: 'Total number of orders created',
  labelNames: ['status'],
});

// Order status change counter
export const orderStatusChangeCounter = new Counter({
  name: 'order_service_order_status_changes_total',
  help: 'Total number of order status changes',
  labelNames: ['from_status', 'to_status'],
});

// Active orders gauge (by status)
export const activeOrdersGauge = new Gauge({
  name: 'order_service_active_orders',
  help: 'Number of active orders by status',
  labelNames: ['status'],
});

// RabbitMQ message counter
export const rabbitMQMessageCounter = new Counter({
  name: 'order_service_rabbitmq_messages_total',
  help: 'Total number of RabbitMQ messages',
  labelNames: ['type', 'event_type', 'status'],
});

// Database operation duration
export const dbOperationDuration = new Histogram({
  name: 'order_service_db_operation_duration_seconds',
  help: 'Database operation duration in seconds',
  labelNames: ['operation', 'collection'],
  buckets: [0.001, 0.01, 0.05, 0.1, 0.5, 1],
});

/**
 * Metrics endpoint router
 */
export function createMetricsRouter(): Router {
  const router = Router();

  /**
   * GET /metrics
   * Prometheus metrics endpoint
   */
  router.get('/', async (_req, res) => {
    try {
      res.set('Content-Type', register.contentType);
      const metrics = await register.metrics();
      res.send(metrics);
    } catch (error) {
      logger.error('Failed to generate metrics', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      res.status(500).send('Failed to generate metrics');
    }
  });

  return router;
}

/**
 * HTTP metrics middleware
 */
export function metricsMiddleware() {
  return (req: any, res: any, next: any): void => {
    const start = Date.now();

    // Capture response finish event
    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000; // Convert to seconds
      const path = req.route?.path || req.path;

      // Record metrics
      httpRequestCounter.inc({
        method: req.method,
        path,
        status: res.statusCode,
      });

      httpRequestDuration.observe(
        {
          method: req.method,
          path,
          status: res.statusCode,
        },
        duration,
      );
    });

    next();
  };
}
