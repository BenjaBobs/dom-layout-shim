// docs:start vitest-config
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Give React a DOM-like window that the layout shim can patch.
    environment: 'happy-dom',
    include: ['test/**/*.test.tsx'],
    setupFiles: ['./test/setup.ts'],
    // Real Ant Design observer and animation phases can exceed Vitest's 5s
    // default on slower CI runners while still settling normally in auto mode.
    testTimeout: 10_000,
  },
});
// docs:end vitest-config
