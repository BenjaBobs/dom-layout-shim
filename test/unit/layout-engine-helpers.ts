import { expect } from 'vitest'
import { attachLayoutEngine, type AttachLayoutEngineOptions } from '../../src/index.ts'

export async function attach(config: Omit<AttachLayoutEngineOptions, 'window'> = {}): Promise<void> {
  await attachLayoutEngine({ window, ...config })
}

export async function waitForMutationDelivery(): Promise<void> {
  await Promise.resolve()
}

export function requiredElement(selector: string): Element {
  const element = document.querySelector(selector)

  if (!element) {
    throw new Error(`Missing test element: ${selector}`)
  }

  return element
}

export function receivesPointerAtCenter(element: Element): boolean {
  const rect = element.getBoundingClientRect()
  const top = element.ownerDocument.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)

  return top === element || Boolean(top && element.contains(top))
}

export function expectRect(
  rect: DOMRect,
  expected: { left: number; top: number; width: number; height: number },
): void {
  expect(rect.left).toBe(expected.left)
  expect(rect.top).toBe(expected.top)
  expect(rect.width).toBe(expected.width)
  expect(rect.height).toBe(expected.height)
}
