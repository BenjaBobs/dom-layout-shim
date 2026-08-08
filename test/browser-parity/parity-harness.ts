import { chromium, type Browser } from '@playwright/test'
import { appendFileSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname } from 'node:path'
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

type ExplainedTolerance<T extends string> =
  | {
      tolerance?: never
      toleranceReason?: never
    }
  | {
      tolerance: Partial<Record<T, number>>
      toleranceReason: string
    }

export type RectQuery = {
  type: 'rect'
  selector: string
} & ExplainedTolerance<'left' | 'top' | 'width' | 'height'>

export type DimensionsQuery = {
  type: 'dimensions'
  selector: string
} & ExplainedTolerance<
  | 'offsetWidth'
  | 'offsetHeight'
  | 'offsetTop'
  | 'offsetLeft'
  | 'clientWidth'
  | 'clientHeight'
>

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
  typography?: 'deterministic'
  nativeControlProfile?: NativeControlProfile
  observationGroup?: 'native-controls'
  observationQueries?: BrowserParityQuery[]
  queries: BrowserParityQuery[]
}

type QueryResult = {
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
const deterministicFontFamily = 'DOM Layout Shim Deterministic'
const deterministicFontData = readFileSync(
  new URL('./assets/fonts/deterministic-layout.otf', import.meta.url),
).toString('base64')

export async function expectChromiumParity(fixture: BrowserParityFixture): Promise<void> {
  const queries = fixtureQueries(fixture)
  const chromiumResult = await runInChromium(fixture)
  const engineResult = await runInHappyDom(fixture)

  expect(engineResult.length, 'Parity result count should match query count').toBe(queries.length)
  expect(chromiumResult.length, 'Chromium result count should match query count').toBe(queries.length)

  for (const [index, query] of queries.entries()) {
    recordObservation(fixture, query, engineResult[index], chromiumResult[index])
    if (index < fixture.queries.length) {
      expectQueryParity(engineResult[index], chromiumResult[index], query, index)
    }
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

  if (query.type === 'rect' && query.tolerance) {
    expectNumericRecordParity(
      engineResult?.rect,
      chromiumResult?.rect,
      query.tolerance,
      `${message}\nTolerance reason: ${query.toleranceReason}`,
    )
    return
  }

  if (query.type === 'dimensions' && query.tolerance) {
    expectNumericRecordParity(
      engineResult?.dimensions,
      chromiumResult?.dimensions,
      query.tolerance,
      `${message}\nTolerance reason: ${query.toleranceReason}`,
    )
    return
  }

  expect(engineResult, message).toEqual(chromiumResult)
}

function expectNumericRecordParity<T extends Record<string, number>>(
  engineResult: T | undefined,
  chromiumResult: T | undefined,
  tolerance: Partial<Record<keyof T, number>>,
  message: string,
): void {
  expect(engineResult, message).toBeDefined()
  expect(chromiumResult, message).toBeDefined()

  for (const key of Object.keys(chromiumResult ?? {}) as (keyof T)[]) {
    const difference = Math.abs((engineResult?.[key] ?? Number.NaN) - (chromiumResult?.[key] ?? Number.NaN))
    expect(difference, `${message}\nNumeric field: ${String(key)}`).toBeLessThanOrEqual(tolerance[key] ?? 0)
  }
}

async function runInChromium(fixture: BrowserParityFixture): Promise<QueryResult[]> {
  const browser = await getChromiumBrowser()
  chromiumVersion ??= browser.version()
  const page = await browser.newPage({ viewport: fixture.viewport })

  try {
    await page.setContent(fixtureHtml(fixture, true))
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

    return await page.evaluate(
      ({ queries, runQueriesSource }) => {
        const runQueries = new Function(`return (${runQueriesSource})`)() as (
          windowLike: QueryWindow,
          queries: BrowserParityQuery[],
        ) => QueryResult[]

        return runQueries(window as unknown as QueryWindow, queries)
      },
      { queries: fixtureQueries(fixture), runQueriesSource: runQueries.toString() },
    )
  } finally {
    await page.close().catch(() => {})
  }
}

async function getChromiumBrowser(): Promise<Browser> {
  browserPromise ??= chromium.connect(inject('browserParityChromiumWsEndpoint'))

  return browserPromise
}

async function runInHappyDom(fixture: BrowserParityFixture): Promise<QueryResult[]> {
  const window = new HappyDomWindow({
    url: 'http://localhost/',
    width: fixture.viewport.width,
    height: fixture.viewport.height,
  })
  const document = window.document
  document.body.innerHTML = fixtureHtml(fixture, false)
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

  const results = runQueries(window as unknown as QueryWindow, fixtureQueries(fixture))
  window.close()

  return results
}

function fixtureQueries(fixture: BrowserParityFixture): BrowserParityQuery[] {
  return process.env.NATIVE_CONTROL_OBSERVATIONS_PATH
    ? [...fixture.queries, ...(fixture.observationQueries ?? [])]
    : fixture.queries
}

function recordObservation(
  fixture: BrowserParityFixture,
  query: BrowserParityQuery,
  engineResult: QueryResult | undefined,
  chromiumResult: QueryResult | undefined,
): void {
  const outputPath = process.env.NATIVE_CONTROL_OBSERVATIONS_PATH

  if (!outputPath || fixture.observationGroup !== 'native-controls') {
    return
  }

  mkdirSync(dirname(outputPath), { recursive: true })
  appendFileSync(outputPath, `${JSON.stringify({
    test: expect.getState().currentTestName,
    platform: process.platform,
    architecture: process.arch,
    chromiumVersion,
    runnerImage: process.env.ImageOS,
    runnerImageVersion: process.env.ImageVersion,
    profile: fixture.nativeControlProfile ?? 'portable',
    group: fixture.observationGroup,
    query,
    chromium: chromiumResult,
    engine: engineResult,
  })}\n`)
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
