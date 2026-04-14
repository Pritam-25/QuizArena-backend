import { defineConfig } from 'orval';

export default defineConfig({
  backendApi: {
    input: {
      target: './openapi/openapi.json',
    },
    output: {
      mode: 'tags-split',
      target: './src/generated/orval/index.ts',
      schemas: './src/generated/orval/model',
      client: 'react-query',
      clean: true,
      override: {
        mutator: {
          path: './src/shared/api/custom-instance.ts',
          name: 'customInstance',
        },
      },
    },
  },
});
