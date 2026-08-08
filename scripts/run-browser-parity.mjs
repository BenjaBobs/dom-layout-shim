import { spawnSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
mkdirSync(resolve(root, '.tmp'), { recursive: true })
mkdirSync(resolve(root, '.cache'), { recursive: true })

const result = spawnSync(
  'pnpm',
  ['exec', 'vitest', 'run', '--config', 'vitest.browser-parity.config.ts'],
  {
    cwd: root,
    env: {
      ...process.env,
      TMPDIR: resolve(root, '.tmp'),
      XDG_CACHE_HOME: resolve(root, '.cache'),
      PLAYWRIGHT_BROWSERS_PATH: resolve(root, '.playwright-browsers'),
    },
    shell: process.platform === 'win32',
    stdio: 'inherit',
  },
)

if (result.error) {
  throw result.error
}

process.exitCode = result.status ?? 1
