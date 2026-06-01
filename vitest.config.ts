import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    env: { TZ: 'Asia/Kolkata' },
    include: [
      'tests/unit/**/*.test.ts',
      'tests/integration/**/*.test.ts',
      'tests/rls/**/*.test.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/domain/**/*.ts', 'src/foundation/**/*.ts', 'src/data/**/*.ts'],
      thresholds: {
        statements: 60,
        branches: 60,
        functions: 60,
        lines: 60,
      },
    },
  },
  resolve: {
    alias: {
      '@foundation': '/src/foundation',
      '@domain': '/src/domain',
      '@data': '/src/data',
      '@ui': '/src/ui',
    },
  },
});
