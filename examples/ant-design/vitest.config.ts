// docs:start vitest-config
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Give React a DOM-like window that the layout shim can patch.
    environment: 'happy-dom',
    include: ['test/**/*.test.tsx'],
    setupFiles: ['./test/setup.ts'],
  },
});
// docs:end vitest-config
