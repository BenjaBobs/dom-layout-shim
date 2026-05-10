import { afterEach, describe, expect, it } from 'vitest'
import { Window } from 'happy-dom'
import { attachLayoutEngine } from '../../src/index.ts'
import { attach, receivesPointerAtCenter, requiredElement, waitForMutationDelivery } from './layout-engine-helpers.ts'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('layout invalidation and isolation', () => {
  it('marks layout dirty when inline styles change', async () => {
    document.body.innerHTML = `
      <div id="box" style="position:absolute; left:0; top:0; width:100px; height:100px"></div>
    `

    await attach()
    expect(document.elementFromPoint(50, 50)).toBe(requiredElement('#box'))

    requiredElement('#box').setAttribute(
      'style',
      'position:absolute; left:100px; top:0; width:100px; height:100px',
    )
    await waitForMutationDelivery()

    expect(document.elementFromPoint(50, 50)).toBe(null)
    expect(document.elementFromPoint(150, 50)).toBe(requiredElement('#box'))
  })

  it('marks layout dirty when hidden attributes change', async () => {
    document.body.innerHTML = `
      <div id="box" hidden style="position:absolute; left:0; top:0; width:100px; height:100px"></div>
    `

    await attach()
    expect(document.elementFromPoint(50, 50)).toBe(null)

    requiredElement('#box').removeAttribute('hidden')
    await waitForMutationDelivery()

    expect(document.elementFromPoint(50, 50)).toBe(requiredElement('#box'))
  })

  it('marks layout dirty when class attributes change against configured stylesheets', async () => {
    document.body.innerHTML = `
      <div id="box" class="left"></div>
    `

    await attach({
      stylesheets: [
        `
          .left,
          .right {
            position: absolute;
            top: 0;
            width: 100px;
            height: 100px;
          }

          .left {
            left: 0;
          }

          .right {
            left: 100px;
          }
        `,
      ],
    })
    expect(document.elementFromPoint(50, 50)).toBe(requiredElement('#box'))

    requiredElement('#box').setAttribute('class', 'right')
    await waitForMutationDelivery()

    expect(document.elementFromPoint(50, 50)).toBe(null)
    expect(document.elementFromPoint(150, 50)).toBe(requiredElement('#box'))
  })

  it('marks layout dirty when elements are inserted', async () => {
    document.body.innerHTML = `
      <button id="save" style="position:absolute; left:0; top:0; width:100px; height:40px"></button>
    `

    await attach()
    expect(receivesPointerAtCenter(requiredElement('#save'))).toBe(true)

    document.body.insertAdjacentHTML(
      'beforeend',
      '<div id="overlay" style="position:absolute; inset:0; z-index:10"></div>',
    )
    await waitForMutationDelivery()

    expect(receivesPointerAtCenter(requiredElement('#save'))).toBe(false)
  })

  it('isolates layout attachments by happy-dom window', async () => {
    const narrowWindow = new Window({ width: 100, height: 100 })
    const wideWindow = new Window({ width: 300, height: 100 })

    try {
      narrowWindow.document.body.innerHTML = '<div id="box" style="position:fixed; inset:0"></div>'
      wideWindow.document.body.innerHTML = '<div id="box" style="position:fixed; inset:0"></div>'

      await attachLayoutEngine({
        window: narrowWindow,
        viewport: { width: 100, height: 100 },
      })
      await attachLayoutEngine({
        window: wideWindow,
        viewport: { width: 300, height: 100 },
      })

      expect(narrowWindow.document.getElementById('box')?.getBoundingClientRect().width).toBe(100)
      expect(wideWindow.document.getElementById('box')?.getBoundingClientRect().width).toBe(300)
    } finally {
      narrowWindow.close()
      wideWindow.close()
    }
  })
})
