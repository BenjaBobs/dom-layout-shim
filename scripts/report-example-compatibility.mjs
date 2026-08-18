import { spawnSync } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { preview } from 'vite'
import { compareCompatibilityRuns, runCompatibilityScenario } from './example-compatibility-core.mjs'

const root = resolve(import.meta.dirname, '..')
process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve(root, '.playwright-browsers')
const { chromium } = await import('@playwright/test')
const definitions = {
  'material-ui': { package: '@dom-layout-shim/example-material-ui' },
  'ant-design': { package: '@dom-layout-shim/example-ant-design' },
}
const requested = process.argv.slice(2)
const examples = requested.length > 0 ? requested : Object.keys(definitions)
await mkdir(resolve(root, '.tmp/example-compatibility'), { recursive: true })

for (const example of examples) {
  const definition = definitions[example]
  if (!definition) throw new Error(`Unknown example: ${example}`)
  await reportExample(example, definition)
}

async function reportExample(example, definition) {
  const exampleRoot = resolve(root, 'examples', example)
  const { scenario } = await import(`../examples/${example}/compatibility/scenario.mjs`)
  const engineOutput = resolve(root, '.tmp/example-compatibility', `${example}-engine.json`)
  const browserOutput = resolve(root, '.tmp/example-compatibility', `${example}-chromium.json`)

  const engineRun = spawnSync(
    'pnpm',
    ['--filter', definition.package, 'exec', 'vitest', 'run', 'test/compatibility-scenario.test.tsx'],
    {
      cwd: root,
      env: { ...process.env, NODE_ENV: 'test', EXAMPLE_COMPATIBILITY_ENGINE_OUTPUT: engineOutput },
      shell: process.platform === 'win32',
      stdio: 'inherit',
    },
  )
  if (engineRun.error) throw engineRun.error
  if (engineRun.status !== 0) throw new Error(`${example} happy-dom scenario could not be captured`)

  const server = await preview({
    root: exampleRoot,
    configFile: resolve(exampleRoot, 'vite.config.ts'),
    preview: { host: '127.0.0.1', port: 0, strictPort: false },
    logLevel: 'silent',
  })
  const address = server.httpServer.address()
  if (!address || typeof address === 'string') throw new Error(`Could not determine ${example} preview address`)

  const browser = await chromium.launch({ headless: true })
  const chromiumVersion = browser.version()
  let chromiumResult
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
    await page.goto(`http://127.0.0.1:${address.port}/`, { waitUntil: 'networkidle' })
    const driver = {
      async click({ selector }) {
        await page.locator(selector).click()
      },
      async fill({ selector, value }) {
        await page.locator(selector).fill(value)
      },
      async settle() {
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
      },
      async capture(step) {
        return page.evaluate(({ id, label, observe }) => {
          const identify = (element) => {
            if (!element) return null
            const keyed = element.closest?.('[data-layout-key]')
            const key = keyed?.getAttribute('data-layout-key')
            return key ? `[data-layout-key="${key}"]` : `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''}`
          }
          const round = (value) => Math.round(value * 100) / 100
          const elements = {}
          for (const selector of observe) {
            const element = document.querySelector(selector)
            if (!element) continue
            const rect = element.getBoundingClientRect()
            const style = getComputedStyle(element)
            elements[selector] = {
              rect: { x: round(rect.x), y: round(rect.y), width: round(rect.width), height: round(rect.height) },
              visible: style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0,
              centerHit: identify(document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)),
            }
          }
          return { id, label, elements }
        }, step)
      },
    }
    chromiumResult = await runCompatibilityScenario(driver, scenario)
    await writeFile(browserOutput, JSON.stringify(chromiumResult, null, 2))
  } finally {
    await browser.close()
    await new Promise((resolveClose, rejectClose) => server.httpServer.close((error) => error ? rejectClose(error) : resolveClose()))
  }

  const engineResult = JSON.parse(await readFile(engineOutput, 'utf8'))
  const report = compareCompatibilityRuns(example, scenario, chromiumResult, engineResult, {
    chromiumVersion,
    viewport: { width: 1280, height: 720 },
    geometryMatchThresholdPx: 1,
  })
  const reportPath = resolve(exampleRoot, 'compatibility-report.json')
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`)
  printSummary(report, reportPath)
}

function printSummary(report, reportPath) {
  console.log(`\n${report.example} compatibility report`)
  console.log('Step'.padEnd(24), 'Coverage'.padStart(9), 'Geometry'.padStart(9), 'Visible'.padStart(9), 'Hit test'.padStart(9))
  for (const step of report.steps) {
    console.log(
      step.label.padEnd(24),
      format(step.scores.coverage).padStart(9),
      format(step.scores.geometry).padStart(9),
      format(step.scores.visibility).padStart(9),
      format(step.scores.hitTesting).padStart(9),
    )
  }
  console.log(`Overall agreement: ${format(report.summary.overallAgreement)}`)
  console.log(`Recorded discrepancies: ${report.summary.discrepancies}`)
  console.log(`Report: ${reportPath}`)
}

function format(value) {
  return `${value.toFixed(1)}%`
}
