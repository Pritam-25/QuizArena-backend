import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const openapiPath = path.resolve(__dirname, '../../openapi/openapi.json');

async function injectOperationIds() {
  const raw = await fs.readFile(openapiPath, 'utf-8');
  const openapi = JSON.parse(raw);

  for (const pathKey in openapi.paths) {
    for (const method in openapi.paths[pathKey]) {
      const route = openapi.paths[pathKey][method];
      if (!route.operationId) {
        const cleanPath = pathKey
          .replace(/^\/api\/v1\//, '')
          .replace(/[\/{}/]/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_|_$/g, '');
        route.operationId = `${method}_${cleanPath}`;
      }
    }
  }

  await fs.writeFile(openapiPath, JSON.stringify(openapi, null, 2), 'utf-8');
  console.log('Injected operationId into OpenAPI spec');
}

injectOperationIds();
