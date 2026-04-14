import getRequestId from '../context/getRequestId.js';
import getTraceId from '../context/getTraceId.js';

export const createMeta = (extra?: Record<string, unknown>) => ({
  requestId: getRequestId(),
  traceId: getTraceId(),
  ...extra,
});
