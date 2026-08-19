import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    fileParallelism: false,
    globalSetup: 'test/browser-parity/global-setup.ts',
    include: ['test/browser-parity/**/*.test.ts'],
    isolate: false,
    testTimeout: 30_000,
  },
});
