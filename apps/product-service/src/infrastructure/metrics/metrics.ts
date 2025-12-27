import { Registry, Counter, Histogram } from 'prom-client';

export const register = new Registry();

// HTTP metrics
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register],
});

// Database metrics
export const databaseQueriesTotal = new Counter({
  name: 'database_queries_total',
  help: 'Total number of database queries',
  labelNames: ['operation'],
  registers: [register],
});

export const databaseQueryDuration = new Histogram({
  name: 'database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1],
  registers: [register],
});

// Business metrics
export const productsCreatedTotal = new Counter({
  name: 'products_created_total',
  help: 'Total number of products created',
  registers: [register],
});

export const productsDeletedTotal = new Counter({
  name: 'products_deleted_total',
  help: 'Total number of products deleted',
  registers: [register],
});

// Event metrics
export const eventsPublishedTotal = new Counter({
  name: 'events_published_total',
  help: 'Total number of events published',
  labelNames: ['event_type'],
  registers: [register],
});

export const eventsConsumedTotal = new Counter({
  name: 'events_consumed_total',
  help: 'Total number of events consumed',
  labelNames: ['event_type'],
  registers: [register],
});
