import { chromium, type Browser } from '@playwright/test'
import { Window as HappyDomWindow } from 'happy-dom'
import { expect, inject } from 'vitest'
import { attachLayoutEngine } from '../../src/index.ts'

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

export type BrowserParityQuery = PointQuery | CenterClickabilityQuery | RectQuery | DimensionsQuery

export type BrowserParityFixture = {
  viewport: {
    width: number
    height: number
  }
  html: string
  queries: BrowserParityQuery[]
}

type QueryResult = {
  elementFromPoint?: string | null
  elementsFromPoint?: string[]
  rect?: SerializedRect
  dimensions?: SerializedDimensions
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
  clientWidth: number
  clientHeight: number
}

type QueryWindow = {
  document: {
    querySelector(selector: string): Element | null
    elementFromPoint(x: number, y: number): Element | null
    elementsFromPoint(x: number, y: number): Element[]
  }
}

let browserPromise: Promise<Browser> | undefined

export async function expectChromiumParity(fixture: BrowserParityFixture): Promise<void> {
  const chromiumResult = await runInChromium(fixture)
  const engineResult = await runInHappyDom(fixture)

  expect(engineResult.length, 'Parity result count should match query count').toBe(fixture.queries.length)
  expect(chromiumResult.length, 'Chromium result count should match query count').toBe(fixture.queries.length)

  for (const [index, query] of fixture.queries.entries()) {
    expect(
      engineResult[index],
      `Parity mismatch for query ${index}: ${describeQuery(query)}\n` +
        'Chromium result is expected; happy-dom engine result is received.',
    ).toEqual(chromiumResult[index])
  }
}

async function runInChromium(fixture: BrowserParityFixture): Promise<QueryResult[]> {
  const browser = await getChromiumBrowser()
  const page = await browser.newPage({ viewport: fixture.viewport })

  try {
    await page.setContent(fixture.html)

    return await page.evaluate(
      ({ queries, runQueriesSource }) => {
        const runQueries = new Function(`return (${runQueriesSource})`)() as (
          windowLike: QueryWindow,
          queries: BrowserParityQuery[],
        ) => QueryResult[]

        return runQueries(window as unknown as QueryWindow, queries)
      },
      { queries: fixture.queries, runQueriesSource: runQueries.toString() },
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
  document.body.innerHTML = fixture.html

  await attachLayoutEngine({ window, viewport: fixture.viewport })

  const results = runQueries(window as unknown as QueryWindow, fixture.queries)
  window.close()

  return results
}

function describeQuery(query: BrowserParityQuery): string {
  return JSON.stringify(query)
}

function runQueries(windowLike: QueryWindow, queries: BrowserParityQuery[]): QueryResult[] {
  const document = windowLike.document

  return queries.map((query) => {
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
          clientWidth: htmlElement.clientWidth,
          clientHeight: htmlElement.clientHeight,
        },
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
