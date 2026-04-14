import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateOpenApiDocument } from './openapi/document.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outputDir = path.resolve(__dirname, '../../openapi');
const outputPath = path.join(outputDir, 'openapi.json');

const run = async () => {
  const document = generateOpenApiDocument();
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(document, null, 2), 'utf-8');
  console.log(`OpenAPI contract generated at ${outputPath}`);
};

await run();
