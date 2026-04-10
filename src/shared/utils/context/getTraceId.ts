import { context, trace } from '@opentelemetry/api';

export const getTraceId = (): string | undefined => {
  const span = trace.getSpan(context.active());
  if (span) return span.spanContext().traceId;
};

export default getTraceId;
