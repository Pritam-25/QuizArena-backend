import express from 'express';
import type { Application } from 'express';
import path from 'node:path';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { apiReference } from '@scalar/express-api-reference';
import {
  errorHandlerMiddleware,
  metricsMiddleware,
  requestIdMiddleware,
  requestLoggerMiddleware,
  traceIdHeaderMiddleware,
} from '@shared/middlewares/index.js';
import router from '@app/api/v1/routes.js';
import { env } from '@config/env.js';
import { generateOpenApiDocument } from '@docs/openapi/document.js';

const app: Application = express();
const openApiDocument = generateOpenApiDocument();
const scalarBrowserAssetsDir = path.resolve(
  process.cwd(),
  'node_modules/@scalar/api-reference/dist/browser'
);

/**
 * Middlewares
 */
app.use(
  helmet({
    // Scalar docs UI injects script/style tags that are blocked by strict default CSP.
    // Keep Helmet protections but relax CSP so /docs can render.
    contentSecurityPolicy: false,
  })
);
app.use(
  cors({
    origin: env.CORS_ORIGINS,
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request ID middleware should run first so downstream code gets requestId
app.use(requestIdMiddleware);

// Add distributed trace id to response headers for client-side correlation
app.use(traceIdHeaderMiddleware);

// Metrics middleware should run after requestId so metrics can include requestId
app.use(metricsMiddleware);

/**
 * Request Logger
 */
app.use(requestLoggerMiddleware);

app.get('/docs.json', (_req, res) => {
  res.json(openApiDocument);
});
app.use('/docs-assets', express.static(scalarBrowserAssetsDir));
app.use(
  '/docs',
  apiReference({
    cdn: '/docs-assets/standalone.js',
    theme: 'deepSpace',
    layout: 'modern',
    defaultHttpClient: {
      targetKey: 'js',
      clientKey: 'fetch',
    },
    onBeforeRequest: ({ requestBuilder }) => {
      // Ensure auth cookies are sent and stored for Scalar "Try it" requests.
      requestBuilder.credentials = 'include';
    },
    persistAuth: true,
    metaData: {
      title: 'Live Quiz Arena API Reference',
    },
    content: openApiDocument,
  })
);

app.use('/api/v1', router);

app.use(errorHandlerMiddleware);

export default app;
