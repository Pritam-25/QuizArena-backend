import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.{test,spec}.ts'],
    setupFiles: ['test/setup/env.setup.ts', 'test/setup/vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.ts'],
      exclude: ['src/generated/**'],
    },
  },
  resolve: {
    alias: {
      '@app': path.resolve(rootDir, 'src/app'),
      '@config': path.resolve(rootDir, 'src/config'),
      '@shared': path.resolve(rootDir, 'src/shared'),
      '@docs': path.resolve(rootDir, 'src/docs'),
      '@contracts': path.resolve(rootDir, 'src/contracts'),
      '@monitoring': path.resolve(rootDir, 'src/monitoring'),
      '@infrastructure': path.resolve(rootDir, 'src/infrastructure'),
      '@modules': path.resolve(rootDir, 'src/modules'),
      '@generated': path.resolve(rootDir, 'src/generated'),
    },
  },
});
