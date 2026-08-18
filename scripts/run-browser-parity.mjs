import { spawnSync } from 'node:child_process'
import { appendFileSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
mkdirSync(resolve(root, '.tmp'), { recursive: true })
mkdirSync(resolve(root, '.cache'), { recursive: true })
const timingPath = resolve(root, '.tmp', 'browser-parity-timing.jsonl')
rmSync(timingPath, { force: true })

const result = spawnSync(
  'pnpm',
  ['exec', 'vitest', 'run', '--config', 'vitest.browser-parity.config.ts'],
  {
    cwd: root,
    env: {
      ...process.env,
      TMPDIR: resolve(root, '.tmp'),
      XDG_CACHE_HOME: resolve(root, '.cache'),
      PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH ?? resolve(root, '.playwright-browsers'),
      BROWSER_PARITY_TIMING_PATH: timingPath,
    },
    shell: process.platform === 'win32',
    stdio: 'inherit',
  },
)

if (result.error) {
  throw result.error
}

printParityTiming(timingPath)
process.exitCode = result.status ?? 1

function printParityTiming(path) {
  let samples

  try {
    samples = readFileSync(path, 'utf8')
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line))
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return
    }

    throw error
  }

  const chromiumMs = totalDuration(samples, 'chromium')
  const engineMs = totalDuration(samples, 'engine')
  const measuredMs = chromiumMs + engineMs
  const fixtureCount = samples.filter(
    ({ kind, phase }) => kind === 'timing' && phase === 'engine',
  ).length
  const percentage = (durationMs) => `${((durationMs / measuredMs) * 100).toFixed(1)}%`
  const duration = (durationMs) => `${(durationMs / 1_000).toFixed(2)}s`

  console.log(
    `\nParity execution timing (${fixtureCount} fixtures):\n` +
      `  Chromium:         ${duration(chromiumMs)} (${percentage(chromiumMs)})\n` +
      `  happy-dom + shim: ${duration(engineMs)} (${percentage(engineMs)})\n` +
      `  Measured total:   ${duration(measuredMs)}`,
  )

  printHeapGrowth(samples)
  writeGitHubSummary(samples, {
    chromiumMs,
    engineMs,
    fixtureCount,
    measuredMs,
  })
}

function totalDuration(samples, phase) {
  return samples
    .filter((sample) => sample.kind === 'timing' && sample.phase === phase)
    .reduce((total, sample) => total + sample.durationMs, 0)
}

function printHeapGrowth(samples) {
  const chromium = memorySamples(samples, 'chromium')
  const engine = memorySamples(samples, 'engine')
  const chromiumProcess = samples
    .filter((sample) => sample.kind === 'process-memory' && sample.phase === 'chromium')
    .map((sample) => sample.rssBytes)

  if (chromium.length === 0 || engine.length === 0) {
    return
  }

  const mib = (bytes) => `${bytes < 0 ? '-' : ''}${(Math.abs(bytes) / 1024 / 1024).toFixed(2)} MiB`
  const average = (values) => values.reduce((total, value) => total + value, 0) / values.length
  const peak = (values) => Math.max(...values)

  console.log(
    `\nObserved memory (average / peak):\n` +
      `  Chromium renderer: ${mib(average(chromium))} / ${mib(peak(chromium))} JS heap growth\n` +
      (chromiumProcess.length > 0
        ? `  Chromium process:  ${mib(average(chromiumProcess))} / ${mib(peak(chromiumProcess))} RSS\n`
        : '') +
      `  happy-dom process: ${mib(average(engine))} / ${mib(peak(engine))} JS heap growth\n` +
      '  Note: JS heap growth excludes native DOM/layout memory; Chromium process RSS includes its child processes.',
  )
}

function memorySamples(samples, phase) {
  return samples
    .filter((sample) => sample.kind === 'memory' && sample.phase === phase)
    .map((sample) => sample.heapGrowthBytes)
}

function writeGitHubSummary(samples, timing) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY

  if (!summaryPath) {
    return
  }

  const chromium = memorySamples(samples, 'chromium')
  const engine = memorySamples(samples, 'engine')
  const chromiumProcess = samples
    .filter((sample) => sample.kind === 'process-memory' && sample.phase === 'chromium')
    .map((sample) => sample.rssBytes)
  const duration = (durationMs) => `${(durationMs / 1_000).toFixed(2)}s`
  const percentage = (durationMs) => `${((durationMs / timing.measuredMs) * 100).toFixed(1)}%`
  const mib = (bytes) => `${(bytes / 1024 / 1024).toFixed(2)} MiB`
  const average = (values) => values.reduce((total, value) => total + value, 0) / values.length
  const peak = (values) => Math.max(...values)
  const processMemory = chromiumProcess.length > 0
    ? `${mib(average(chromiumProcess))} / ${mib(peak(chromiumProcess))}`
    : 'No samples recorded'
  const platform = process.env.RUNNER_OS ?? process.platform

  appendFileSync(
    summaryPath,
    `## Chromium parity resources (${platform})\n\n` +
      `${timing.fixtureCount} fixtures measured.\n\n` +
      '| Execution | Duration | Share |\n' +
      '| --- | ---: | ---: |\n' +
      `| Chromium | ${duration(timing.chromiumMs)} | ${percentage(timing.chromiumMs)} |\n` +
      `| happy-dom + shim | ${duration(timing.engineMs)} | ${percentage(timing.engineMs)} |\n` +
      `| Total | ${duration(timing.measuredMs)} | 100.0% |\n\n` +
      '| Memory | Average / peak | Measurement |\n' +
      '| --- | ---: | --- |\n' +
      `| Chromium renderer | ${mib(average(chromium))} / ${mib(peak(chromium))} | JS heap growth |\n` +
      `| Chromium process | ${processMemory} | Periodic RSS, including child processes |\n` +
      `| happy-dom process | ${mib(average(engine))} / ${mib(peak(engine))} | JS heap growth |\n\n` +
      '_JS heap growth excludes native DOM/layout memory._\n',
  )
}
