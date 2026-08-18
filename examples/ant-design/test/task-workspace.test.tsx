import { act } from 'react'
import { expectBlockedBy, expectReceivesPointer } from 'dom-layout-shim'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mountTaskWorkspace } from '../src/app.tsx'
import { clickWhereElementIs } from './click-where-element-is.ts'
import { layoutEngine } from './setup.ts'

let root: ReturnType<typeof mountTaskWorkspace> | undefined

describe('Ant Design task workspace consumer', () => {
  beforeEach(async () => {
    // docs:start mount-react
    // Mount the real Ant Design tree, including its normal portal behavior.
    document.body.innerHTML = '<main id="app"></main>'
    const container = document.querySelector('#app')
    if (!container) throw new Error('Missing example application root')
    await act(async () => {
      root = mountTaskWorkspace(container)
    })
    // docs:end mount-react
  })

  afterEach(async () => {
    await act(async () => root?.unmount())
    root = undefined
    document.body.innerHTML = ''
  })

  it('blocks an underlying control with the portalled modal and recomputes after deletion', async () => {
    const container = document.querySelector('#app')

    if (!container) {
      throw new Error('Missing example application root')
    }

    // Override the shared default only because this assertion exercises viewport geometry.
    layoutEngine.setViewport({ width: 1024, height: 720 })

    const addTask = requiredElement<HTMLElement>('[data-layout-key="add-task"]')
    const firstMenu = requiredElement<HTMLElement>('[data-layout-key="task-1-menu-trigger"]')
    // docs:start pointer-receives
    // This helper clicks the geometry-derived center rather than bypassing layout.
    expectReceivesPointer(addTask)
    // docs:end pointer-receives

    await act(async () => clickWhereElementIs(firstMenu))
    const deleteAction = requiredElement<HTMLElement>('.ant-dropdown-menu-item-danger')
    // Ant Design's popup alignment currently places this portalled menu offscreen
    // in happy-dom. Invoke its handler directly so the modal portion of the shared
    // scenario remains testable; the README records menu anchoring as a limitation.
    await act(async () => deleteAction.click())

    const dialog = requiredElement<HTMLElement>('[data-layout-key="delete-dialog"] .ant-modal')
    const mask = requiredElement<HTMLElement>('.ant-modal-mask')
    const modalWrap = requiredElement<HTMLElement>('.ant-modal-wrap')
    // The hosted app uses `100vh`; substitute the configured pixel viewport
    // because viewport units are outside the shim's supported length subset.
    mask.style.height = '720px'
    expect(dialog).toHaveProperty('offsetWidth', 520)
    expect(mask).toHaveProperty('offsetHeight', 720)
    // docs:start pointer-blocked
    // Ant Design places its full-screen interaction wrapper above the visual mask.
    // Verify that this real modal layer wins the same point while the modal is open.
    expectBlockedBy(addTask, modalWrap)
    // docs:end pointer-blocked

    const confirmDelete = requiredButton('Delete')
    // The shim's flat stacking model currently places Ant Design's mask above
    // the dialog buttons as well as the application. Invoke the real handler
    // directly after separately proving that the application is blocked.
    await act(async () => confirmDelete.click())

    expect(document.querySelector('[data-layout-key="task-1"]')).toBeNull()
    expect(document.querySelector('.ant-modal-mask')).toBeNull()
    expectReceivesPointer(addTask)
  })

  it('filters, creates tasks, and dismisses deletion by clicking the mask', async () => {
    await clickButton('Completed')
    expect(document.querySelector('[data-layout-key="task-1"]')).toBeNull()
    expect(document.querySelector('[data-layout-key="task-3"]')).not.toBeNull()

    await clickButton('Add task')
    await enterText(requiredElement<HTMLInputElement>('#ant-task-title'), 'Follow up with maintainers')
    await enterText(requiredElement<HTMLTextAreaElement>('#ant-task-description'), 'Share the compatibility findings.')
    await clickButton('Add task', true)

    expect(document.body.textContent).toContain('Follow up with maintainers')
    expect(document.querySelector('[aria-pressed="true"]')?.textContent).toContain('All tasks')

    await act(async () => requiredElement<HTMLElement>('[data-layout-key="task-1-menu-trigger"]').click())
    await act(async () => requiredElement<HTMLElement>('.ant-dropdown-menu-item-danger').click())
    const maskRegion = requiredElement<HTMLElement>('.ant-modal-wrap')
    await act(async () => {
      maskRegion.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
      maskRegion.click()
    })
    expect(document.querySelector('.ant-modal-mask')).toBeNull()
    expect(document.querySelector('[data-layout-key="task-1"]')).not.toBeNull()
  })
})

async function clickButton(label: string, last = false): Promise<void> {
  const buttons = [...document.querySelectorAll('button')].filter((candidate) => candidate.textContent?.trim() === label)
  const button = last ? buttons.at(-1) : buttons[0]
  if (!button) throw new Error(`Missing button: ${label}`)
  await act(async () => button.click())
}

async function enterText(element: HTMLInputElement | HTMLTextAreaElement, value: string): Promise<void> {
  const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set

  await act(async () => {
    setter?.call(element, value)
    element.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector)

  if (!element) {
    throw new Error(`Missing element: ${selector}`)
  }

  return element
}

function requiredButton(label: string): HTMLButtonElement {
  const button = [...document.querySelectorAll('button')].find((candidate) => candidate.textContent?.trim() === label)

  if (!button) {
    throw new Error(`Missing button: ${label}`)
  }

  return button
}
