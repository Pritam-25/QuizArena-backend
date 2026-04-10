import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { EventEmitter } from 'events';
import {
  ParentBasedSampler,
  TraceIdRatioBasedSampler,
} from '@opentelemetry/sdk-trace-base';
import { env } from '@config/env.js';

// Enable diagnostic logging when requested
if (env.OTEL_DEBUG === 'true') {
  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
}

// Increase default max listeners to avoid MaxListenersExceededWarning from instrumentation
EventEmitter.defaultMaxListeners = 20;

const otlpEndpoint = env.OTEL_EXPORTER_OTLP_ENDPOINT;

if (!otlpEndpoint && env.NODE_ENV === 'production') {
  throw new Error('OTEL_EXPORTER_OTLP_ENDPOINT is required in production');
}

const traceExporter = otlpEndpoint
  ? new OTLPTraceExporter({
      url: otlpEndpoint,
      timeoutMillis: 5000,
    })
  : new ConsoleSpanExporter();

const resource = resourceFromAttributes({
  'service.name': env.SERVICE_NAME || 'quiz-arena-api',
  'service.version': '1.0.0',
  'deployment.environment': env.NODE_ENV || 'development',
});

const sampleRatio = env.NODE_ENV === 'production' ? 0.1 : 1.0;

const sdk = new NodeSDK({
  resource,
  traceExporter,
  sampler: new ParentBasedSampler({
    root: new TraceIdRatioBasedSampler(sampleRatio),
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

// Start immediately so this file can be used with `--import` before application code
sdk.start();
console.log('✅ OpenTelemetry initialized');

const shutdown = async () => {
  try {
    await sdk.shutdown();
    console.log('Tracing terminated');
  } catch (err) {
    console.error('Failed to shut down tracing', err);
  }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
