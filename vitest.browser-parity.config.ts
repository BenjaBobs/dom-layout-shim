import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/browser-parity/**/*.test.ts'],
    testTimeout: 30_000,
  },
})
