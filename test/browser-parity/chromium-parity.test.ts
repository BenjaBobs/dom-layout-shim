import { chromium, type Browser } from '@playwright/test'
import { Window } from 'happy-dom'
import { describe, expect, it } from 'vitest'
import { createLayoutEngine, type DocumentAttachment } from '../../src'
import {
  browserParityFixtures,
  type BrowserParityFixture,
  type BrowserParityQuery,
} from './fixtures/fixtures'

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

describe('Chromium behavior parity', () => {
  for (const fixture of browserParityFixtures) {
    it(fixture.name, async () => {
      const chromiumResult = await runInChromium(fixture)
      const engineResult = await runInHappyDom(fixture)

      expect(engineResult).toEqual(chromiumResult)
    })
  }
})

async function runInChromium(fixture: BrowserParityFixture): Promise<QueryResult[]> {
  const browser = await launchChromium()
  const page = await browser.newPage({ viewport: fixture.viewport })

  try {
    await page.setContent(fixture.html)

    return await page.evaluate((queries) => {
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
    }, fixture.queries)
  } finally {
    await page.close().catch(() => {})
    await browser.close().catch(() => {})
  }
}

async function launchChromium(): Promise<Browser> {
  return chromium.launch({
    args: ['--disable-gpu', '--disable-software-rasterizer', '--no-sandbox', '--no-zygote', '--single-process'],
    chromiumSandbox: false,
    headless: true,
  })
}

async function runInHappyDom(fixture: BrowserParityFixture): Promise<QueryResult[]> {
  const window = new Window({
    url: 'http://localhost/',
    width: fixture.viewport.width,
    height: fixture.viewport.height,
  })
  const document = window.document
  document.body.innerHTML = fixture.html

  const engine = createLayoutEngine({ viewport: fixture.viewport })
  await engine.initialize()
  const attachment = engine.attachTo(document)

  const results = fixture.queries.map((query) => runHappyDomQuery(document, attachment, query))
  attachment.detach()
  window.close()

  return results
}

function runHappyDomQuery(
  document: Window['document'],
  attachment: DocumentAttachment,
  query: BrowserParityQuery,
): QueryResult {
  if (query.type === 'point') {
    return {
      elementFromPoint: describeElement(attachment.elementFromPoint(query.x, query.y)),
      elementsFromPoint: attachment
        .elementsFromPoint(query.x, query.y)
        .map(describeElement)
        .filter((value): value is string => value !== null),
    }
  }

  const element = document.querySelector(query.selector)

  if (!element) {
    throw new Error(`Missing element: ${query.selector}`)
  }

  if (query.type === 'rect') {
    return {
      rect: serializeRect(attachment.getBoundingClientRect(element as unknown as Element)),
    }
  }

  if (query.type === 'dimensions') {
    const htmlElement = element as unknown as HTMLElement

    return {
      dimensions: {
        offsetWidth: htmlElement.offsetWidth,
        offsetHeight: htmlElement.offsetHeight,
        clientWidth: htmlElement.clientWidth,
        clientHeight: htmlElement.clientHeight,
      },
    }
  }

  return {
    receivesPointerAtCenter: attachment.receivesPointerAtCenter(element as unknown as Element),
  }
}

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
