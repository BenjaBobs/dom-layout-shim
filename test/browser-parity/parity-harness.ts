import { chromium, type Browser } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { appendFileSync, readFileSync, readdirSync } from 'node:fs'
import { Window as HappyDomWindow } from 'happy-dom'
import { expect, inject } from 'vitest'
import { attachLayoutEngine } from '../../src/index.ts'
import type { NativeControlProfile } from '../../src/index.ts'

export type PointQuery = {
  type: 'point'
  x: number
  y: number
}

export type CenterClickabilityQuery = {
  type: 'center-clickability'
  selector: string
}

export type RectQuery = {
  type: 'rect'
  selector: string
}

export type DimensionsQuery = {
  type: 'dimensions'
  selector: string
}

export type ScrollQuery = {
  type: 'scroll'
  selector?: string
}

export type BrowserParityQuery =
  | PointQuery
  | CenterClickabilityQuery
  | RectQuery
  | DimensionsQuery
  | ScrollQuery

export type BrowserParityFixture = {
  viewport: {
    width: number
    height: number
  }
  scroll?: {
    x: number
    y: number
  }
  elementScrolls?: {
    selector: string
    x: number
    y: number
  }[]
  scrollIntoView?: {
    selector: string
    arg?: boolean | ScrollIntoViewOptions
  }
  html: string
  adoptedStylesheets?: string[]
  typography?: 'deterministic'
  nativeControlProfile?: NativeControlProfile
  queries: BrowserParityQuery[]
}

export type QueryResult = {
  elementFromPoint?: string | null
  elementsFromPoint?: string[]
  rect?: SerializedRect
  dimensions?: SerializedDimensions
  offsetParent?: string | null
  scroll?: {
    x: number
    y: number
  }
  receivesPointerAtCenter?: boolean
}

type SerializedRect = {
  left: number
  top: number
  width: number
  height: number
}

type SerializedDimensions = {
  offsetWidth: number
  offsetHeight: number
  offsetTop: number
  offsetLeft: number
  clientWidth: number
  clientHeight: number
}

type QueryWindow = {
  scrollX: number
  scrollY: number
  document: {
    querySelector(selector: string): Element | null
    elementFromPoint(x: number, y: number): Element | null
    elementsFromPoint(x: number, y: number): Element[]
  }
}

let browserPromise: Promise<Browser> | undefined
let chromiumVersion: string | undefined
let memorySamplingMs = 0
let chromiumProcessMemoryOpportunities = 0
const deterministicFontFamily = 'DOM Layout Shim Deterministic'
const deterministicFontData = readFileSync(
  new URL('./assets/fonts/deterministic-layout.otf', import.meta.url),
).toString('base64')

export async function expectChromiumParity(fixture: BrowserParityFixture): Promise<void> {
  const { chromium: chromiumResult, engine: engineResult } = await measureBrowserParityFixture(fixture)

  for (const [index, query] of fixture.queries.entries()) {
    expectQueryParity(engineResult[index], chromiumResult[index], query, index)
  }
}

export async function measureBrowserParityFixture(fixture: BrowserParityFixture): Promise<{
  chromiumVersion: string
  queries: BrowserParityQuery[]
  chromium: QueryResult[]
  engine: QueryResult[]
}> {
  const queries = fixture.queries
  const chromiumResult = await measureParityPhase('chromium', () => runInChromium(fixture))
  const engineResult = await measureParityPhase('engine', () => runInHappyDom(fixture))

  expect(engineResult.length, 'Parity result count should match query count').toBe(queries.length)
  expect(chromiumResult.length, 'Chromium result count should match query count').toBe(queries.length)

  return {
    chromiumVersion: chromiumVersion ?? 'unknown',
    queries,
    chromium: chromiumResult,
    engine: engineResult,
  }
}

async function measureParityPhase<T>(
  phase: 'chromium' | 'engine',
  run: () => Promise<T>,
): Promise<T> {
  const start = performance.now()
  const memorySamplingBefore = memorySamplingMs

  try {
    return await run()
  } finally {
    recordParitySample({
      kind: 'timing',
      phase,
      durationMs: performance.now() - start - (memorySamplingMs - memorySamplingBefore),
    })
  }
}

function recordParitySample(sample: Record<string, number | string>): void {
  const timingPath = process.env.BROWSER_PARITY_TIMING_PATH

  if (timingPath) {
    appendFileSync(timingPath, `${JSON.stringify(sample)}\n`)
  }
}

function expectQueryParity(
  engineResult: QueryResult | undefined,
  chromiumResult: QueryResult | undefined,
  query: BrowserParityQuery,
  index: number,
): void {
  const message =
    `Parity mismatch for query ${index}: ${describeQuery(query)}\n` +
    'Chromium result is expected; happy-dom engine result is received.'

  expect(engineResult, message).toEqual(chromiumResult)
}

async function runInChromium(fixture: BrowserParityFixture): Promise<QueryResult[]> {
  const browser = await getChromiumBrowser()
  chromiumVersion ??= browser.version()
  const page = await browser.newPage({ viewport: fixture.viewport })
  const devtools = await page.context().newCDPSession(page)
  const heapBefore = await devtools.send('Runtime.getHeapUsage')

  try {
    await page.setContent(fixtureHtml(fixture, true))
    if (fixture.adoptedStylesheets) {
      await page.evaluate((stylesheets) => {
        document.adoptedStyleSheets = stylesheets.map((cssText) => {
          const sheet = new CSSStyleSheet()
          sheet.replaceSync(cssText)
          return sheet
        })
      }, fixture.adoptedStylesheets)
    }
    if (fixture.typography === 'deterministic') {
      await page.evaluate(async (fontFamily) => {
        await document.fonts.load(`20px "${fontFamily}"`)
        await document.fonts.ready
        if (!document.fonts.check(`20px "${fontFamily}"`)) {
          throw new Error(`Deterministic parity font did not load: ${fontFamily}`)
        }
      }, deterministicFontFamily)
    }
    if (fixture.scroll) {
      await page.evaluate(({ x, y }) => window.scrollTo(x, y), fixture.scroll)
    }
    if (fixture.elementScrolls) {
      await page.evaluate((scrolls) => {
        for (const scroll of scrolls) {
          const element = document.querySelector(scroll.selector)

          if (!element) {
            throw new Error(`Missing element: ${scroll.selector}`)
          }

          element.scrollTo(scroll.x, scroll.y)
        }
      }, fixture.elementScrolls)
    }
    if (fixture.scrollIntoView) {
      await page.evaluate(({ selector, arg }) => {
        const element = document.querySelector(selector)

        if (!element) {
          throw new Error(`Missing element: ${selector}`)
        }

        element.scrollIntoView(arg)
      }, fixture.scrollIntoView)
    }

    const results = await page.evaluate(
      ({ queries, runQueriesSource }) => {
        const runQueries = new Function(`return (${runQueriesSource})`)() as (
          windowLike: QueryWindow,
          queries: BrowserParityQuery[],
        ) => QueryResult[]

        return runQueries(window as unknown as QueryWindow, queries)
      },
      { queries: fixture.queries, runQueriesSource: runQueries.toString() },
    )
    const heapAfter = await devtools.send('Runtime.getHeapUsage')
    recordParitySample({
      kind: 'memory',
      phase: 'chromium',
      heapGrowthBytes: heapAfter.usedSize - heapBefore.usedSize,
    })
    const processRssBytes = readProcessTreeRss(inject('browserParityChromiumPid'))

    if (processRssBytes !== undefined) {
      recordParitySample({ kind: 'process-memory', phase: 'chromium', rssBytes: processRssBytes })
    }

    return results
  } finally {
    await devtools.detach().catch(() => {})
    await page.close().catch(() => {})
  }
}

function readProcessTreeRss(rootPid: number | undefined): number | undefined {
  const shouldSample = chromiumProcessMemoryOpportunities % 10 === 0
  chromiumProcessMemoryOpportunities += 1

  if (rootPid === undefined || !shouldSample) {
    return undefined
  }

  const start = performance.now()

  try {
    const processes = readProcessTable()
    const included = new Set([rootPid])
    let changed = true

    while (changed) {
      changed = false

      for (const [pid, processInfo] of processes) {
        if (!included.has(pid) && included.has(processInfo.parentPid)) {
          included.add(pid)
          changed = true
        }
      }
    }

    return [...included].reduce((total, pid) => total + (processes.get(pid)?.rssBytes ?? 0), 0)
  } finally {
    memorySamplingMs += performance.now() - start
  }
}

function readProcessTable(): Map<number, { parentPid: number; rssBytes: number }> {
  if (process.platform === 'linux') {
    return readLinuxProcessTable()
  }

  if (process.platform === 'darwin') {
    return parseProcessTable(
      execFileSync('ps', ['-axo', 'pid=,ppid=,rss='], { encoding: 'utf8' }),
      1024,
    )
  }

  if (process.platform === 'win32') {
    const command = [
      '$rss = @{}',
      'Get-Process | ForEach-Object { $rss[[int]$_.Id] = [int64]$_.WorkingSet64 }',
      'Get-CimInstance Win32_Process | ForEach-Object {',
      '  $workingSet = $rss[[int]$_.ProcessId]',
      '  if ($null -ne $workingSet) {',
      '    Write-Output "$($_.ProcessId) $($_.ParentProcessId) $workingSet"',
      '  }',
      '}',
    ].join('\n')

    return parseProcessTable(
      execFileSync(
        'powershell.exe',
        ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', command],
        { encoding: 'utf8' },
      ),
      1,
    )
  }

  throw new Error(`Chromium process memory measurement is not supported on ${process.platform}.`)
}

function readLinuxProcessTable(): Map<number, { parentPid: number; rssBytes: number }> {
  const processes = new Map<number, { parentPid: number; rssBytes: number }>()

  for (const entry of readdirSync('/proc', { withFileTypes: true })) {
    if (!entry.isDirectory() || !/^\d+$/.test(entry.name)) {
      continue
    }

    try {
      const status = readFileSync(`/proc/${entry.name}/status`, 'utf8')
      const parentPid = Number(/^PPid:\s+(\d+)/m.exec(status)?.[1])
      const rssKiB = Number(/^VmRSS:\s+(\d+)\s+kB/m.exec(status)?.[1])

      if (Number.isFinite(parentPid) && Number.isFinite(rssKiB)) {
        processes.set(Number(entry.name), { parentPid, rssBytes: rssKiB * 1024 })
      }
    } catch {
      // Processes can exit while /proc is being read.
    }
  }

  return processes
}

function parseProcessTable(
  output: string,
  rssMultiplier: number,
): Map<number, { parentPid: number; rssBytes: number }> {
  const processes = new Map<number, { parentPid: number; rssBytes: number }>()

  for (const line of output.split(/\r?\n/)) {
    const [pidText, parentPidText, rssText] = line.trim().split(/\s+/)
    const pid = Number(pidText)
    const parentPid = Number(parentPidText)
    const rss = Number(rssText)

    if (Number.isFinite(pid) && Number.isFinite(parentPid) && Number.isFinite(rss)) {
      processes.set(pid, { parentPid, rssBytes: rss * rssMultiplier })
    }
  }

  return processes
}

async function getChromiumBrowser(): Promise<Browser> {
  browserPromise ??= chromium.connect(inject('browserParityChromiumWsEndpoint'))

  return browserPromise
}

async function runInHappyDom(fixture: BrowserParityFixture): Promise<QueryResult[]> {
  const heapBefore = process.memoryUsage().heapUsed
  const window = new HappyDomWindow({
    url: 'http://localhost/',
    width: fixture.viewport.width,
    height: fixture.viewport.height,
  })
  const document = window.document
  document.body.innerHTML = fixtureHtml(fixture, false)
  if (fixture.adoptedStylesheets) {
    document.adoptedStyleSheets = fixture.adoptedStylesheets.map((cssText) => {
      const sheet = new window.CSSStyleSheet()
      sheet.replaceSync(cssText)
      return sheet
    })
  }
  if (fixture.scroll) {
    window.scrollTo(fixture.scroll.x, fixture.scroll.y)
  }
  if (fixture.elementScrolls) {
    for (const scroll of fixture.elementScrolls) {
      const element = document.querySelector(scroll.selector)

      if (!element) {
        throw new Error(`Missing element: ${scroll.selector}`)
      }

      element.scrollTo(scroll.x, scroll.y)
    }
  }

  await attachLayoutEngine({
    window,
    viewport: fixture.viewport,
    nativeControls: { profile: fixture.nativeControlProfile ?? 'portable' },
  })
  if (fixture.scrollIntoView) {
    const element = document.querySelector(fixture.scrollIntoView.selector)

    if (!element) {
      throw new Error(`Missing element: ${fixture.scrollIntoView.selector}`)
    }

    element.scrollIntoView(fixture.scrollIntoView.arg)
  }

  const results = runQueries(window as unknown as QueryWindow, fixture.queries)
  recordParitySample({
    kind: 'memory',
    phase: 'engine',
    heapGrowthBytes: process.memoryUsage().heapUsed - heapBefore,
  })
  window.close()

  return results
}

function fixtureHtml(fixture: BrowserParityFixture, includeFontFace: boolean): string {
  if (fixture.typography !== 'deterministic') {
    return fixture.html
  }

  const fontFace = includeFontFace
    ? `@font-face {
        font-family: '${deterministicFontFamily}';
        src: url(data:font/otf;base64,${deterministicFontData}) format('opentype');
        font-style: normal;
        font-weight: 400;
      }`
    : ''

  return `<style>
    ${fontFace}
    html {
      font-family: '${deterministicFontFamily}';
      font-size: 20px;
      line-height: 20px;
    }
  </style>${fixture.html}`
}

function describeQuery(query: BrowserParityQuery): string {
  return JSON.stringify(query)
}

function runQueries(windowLike: QueryWindow, queries: BrowserParityQuery[]): QueryResult[] {
  const document = windowLike.document

  return queries.map((query) => {
    if (query.type === 'scroll') {
      if (!query.selector) {
        return {
          scroll: {
            x: windowLike.scrollX,
            y: windowLike.scrollY,
          },
        }
      }

      const scroller = document.querySelector(query.selector)

      if (!scroller) {
        throw new Error(`Missing element: ${query.selector}`)
      }

      return {
        scroll: {
          x: scroller.scrollLeft,
          y: scroller.scrollTop,
        },
      }
    }

    if (query.type === 'point') {
      return {
        elementFromPoint: describeElement(document.elementFromPoint(query.x, query.y)),
        elementsFromPoint: document
          .elementsFromPoint(query.x, query.y)
          .map(describeElement)
          .filter((value): value is string => value !== null),
      }
    }

    const element = document.querySelector(query.selector)

    if (!element) {
      throw new Error(`Missing element: ${query.selector}`)
    }

    const rect = element.getBoundingClientRect()

    if (query.type === 'rect') {
      return {
        rect: serializeRect(rect),
      }
    }

    if (query.type === 'dimensions') {
      const htmlElement = element as HTMLElement

      return {
        dimensions: {
          offsetWidth: htmlElement.offsetWidth,
          offsetHeight: htmlElement.offsetHeight,
          offsetTop: htmlElement.offsetTop,
          offsetLeft: htmlElement.offsetLeft,
          clientWidth: htmlElement.clientWidth,
          clientHeight: htmlElement.clientHeight,
        },
        offsetParent: describeOffsetParent(htmlElement.offsetParent),
      }
    }

    const top = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)

    return {
      receivesPointerAtCenter: top === element || Boolean(top && element.contains(top)),
    }
  })

  function describeElement(element: Element | null): string | null {
    return element?.id ? `#${element.id}` : null
  }

  function describeOffsetParent(element: Element | null): string | null {
    if (!element) {
      return null
    }

    return element.id ? `#${element.id}` : element.tagName.toLowerCase()
  }

  function serializeRect(rect: DOMRect): SerializedRect {
    return {
      left: normalizeNumber(rect.left),
      top: normalizeNumber(rect.top),
      width: normalizeNumber(rect.width),
      height: normalizeNumber(rect.height),
    }
  }

  function normalizeNumber(value: number): number {
    return Object.is(value, -0) ? 0 : Number(value.toFixed(4))
  }
}
