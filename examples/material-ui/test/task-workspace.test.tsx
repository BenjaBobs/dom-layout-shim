import { attachLayoutEngine } from 'dom-layout-shim'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { TaskWorkspace } from '../src/task-workspace.tsx'

let reactRoot: Root

function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector)

  if (!element) {
    throw new Error(`Missing element: ${selector}`)
  }

  return element
}

async function click(element: Element): Promise<void> {
  await act(async () => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

async function enterText(element: HTMLInputElement | HTMLTextAreaElement, value: string): Promise<void> {
  const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set

  await act(async () => {
    setter?.call(element, value)
    element.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

async function settleTransitions(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

describe('Material UI task workspace consumer', () => {
  beforeEach(async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
    document.body.innerHTML = '<div id="app"></div>'
    reactRoot = createRoot(requiredElement('#app'))
    await act(async () => reactRoot.render(<TaskWorkspace />))
  })

  afterEach(async () => {
    await act(async () => reactRoot.unmount())
  })

  it('uses idiomatic portalled overlays and deletes a task', async () => {
    await click(requiredElement('[data-layout-key="task-1-menu-trigger"]'))

    expect(requiredElement('[data-layout-key="task-menu"]')).toBeTruthy()
    await click(requiredElement('[role="menuitem"]'))
    expect(requiredElement('[data-layout-key="delete-dialog"]')).toBeTruthy()

    await click(requiredElement('[data-layout-key="delete-dialog"] button:last-child'))

    expect(document.querySelector('[data-layout-key="task-1"]')).toBeNull()
    expect(document.body.textContent).toContain('Task deleted')
  })

  it('filters tasks and creates a new task through the hosted controls', async () => {
    await click([...document.querySelectorAll('button')].find((button) => button.textContent === 'Completed')!)
    expect(document.querySelector('[data-layout-key="task-1"]')).toBeNull()
    expect(document.querySelector('[data-layout-key="task-2"]')).not.toBeNull()
    expect(document.body.textContent).toContain('1 task shown')

    await click(requiredElement('[data-layout-key="underlying-control"]'))
    await enterText(requiredElement<HTMLInputElement>('input[required]'), 'Follow up with maintainers')
    await enterText(requiredElement<HTMLTextAreaElement>('textarea'), 'Share the compatibility findings.')
    await click(requiredElement('[role="dialog"] button:last-child'))

    expect(document.body.textContent).toContain('Follow up with maintainers')
    expect(document.body.textContent).toContain('4 tasks shown')
    expect(document.body.textContent).toContain('Task added')
  })

  it('proves a dialog backdrop blocks an underlying control by coordinates', async () => {
    await attachLayoutEngine({
      window,
      viewport: { width: 1024, height: 768 },
      unsupportedCss: { default: 'ignore' },
    })

    const underlyingControl = requiredElement<HTMLElement>('[data-layout-key="underlying-control"]')
    const rect = underlyingControl.getBoundingClientRect()
    const point = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }

    expect(rect.width).toBeGreaterThan(0)
    expect(document.elementFromPoint(point.x, point.y)).toBe(underlyingControl)

    await click(requiredElement('[data-layout-key="task-1-menu-trigger"]'))
    await click(requiredElement('[role="menuitem"]'))

    const backdrop = requiredElement('[data-layout-key="delete-backdrop"]')
    const overlayHit = document.elementFromPoint(point.x, point.y)

    // MUI's full-viewport Modal root owns the hit in the shim. Its first child
    // is the visible Backdrop; either way, the covered application control is
    // no longer reachable at this coordinate.
    expect(overlayHit).toBe(backdrop.parentElement)
    expect(overlayHit).not.toBe(underlyingControl)

    await click(requiredElement('[data-layout-key="delete-dialog"] button:first-of-type'))
    await settleTransitions()
    expect(document.elementFromPoint(point.x, point.y)).toBe(underlyingControl)
  })
})
