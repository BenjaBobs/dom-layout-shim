// docs:start vitest-config
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['test/**/*.test.tsx'],
  },
})
// docs:end vitest-config
