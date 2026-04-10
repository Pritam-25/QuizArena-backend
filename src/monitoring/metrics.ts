import client from 'prom-client';

const register = client.register;

// Collect process/runtime metrics (CPU, memory, event loop, etc.)
client.collectDefaultMetrics({
  prefix: 'quiz_api_',
  register,
});

export const httpRequestCounter = new client.Counter({
  name: 'quiz_api_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'] as const,
  registers: [register],
});

export const httpRequestDuration = new client.Histogram({
  name: 'quiz_api_http_request_duration_ms',
  help: 'HTTP request duration in ms',
  labelNames: ['method', 'route', 'status'] as const,
  buckets: [10, 50, 100, 300, 500, 1000, 2000],
  registers: [register],
});

export const activeRequestsGauge = new client.Gauge({
  name: 'quiz_api_active_requests',
  help: 'Number of active requests currently being processed',
  registers: [register],
});

export { register };
