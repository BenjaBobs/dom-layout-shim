import { afterEach, describe, expect, it } from 'vitest'
import { debugLayout, expectBlockedBy, expectReceivesPointer, guardedClick } from '../../src/index.ts'
import { attach, receivesPointerAtCenter, requiredElement } from './layout-engine-helpers.ts'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('layout DOM API and package contracts', () => {
  it('uses the portable user-agent presentation profile by default', async () => {
    document.body.innerHTML = '<p id="paragraph">Text</p>'

    await attach()

    expect(requiredElement('#paragraph').getBoundingClientRect().y).toBe(16)
  })

  it('disables only presentation defaults with the none profile', async () => {
    document.body.innerHTML = '<p id="paragraph">Text</p><input id="hidden" type="hidden" style="display:block">'

    await attach({ userAgentStyles: { profile: 'none' } })

    const paragraph = requiredElement('#paragraph').getBoundingClientRect()
    expect(paragraph.y).toBe(0)
    expect(paragraph.height).toBeCloseTo(19.2)
    // Non-rendered HTML semantics remain structural rather than profile styling.
    expect(requiredElement('#hidden').getBoundingClientRect().height).toBe(0)
  })

  it('cascades user-agent overrides below document and inline styles', async () => {
    document.body.innerHTML = `
      <style>#document-rule { margin-top: 7px }</style>
      <p id="ua-rule">UA override</p>
      <p id="document-rule">Document rule</p>
      <p id="inline-rule" style="margin-top:9px">Inline rule</p>
    `

    await attach({
      userAgentStyles: {
        profile: 'none',
        overrides: 'p { margin-top: 5px; margin-bottom: 0 }',
      },
    })

    expect(requiredElement('#ua-rule').getBoundingClientRect().y).toBe(5)
    expect(requiredElement('#document-rule').getBoundingClientRect().y).toBeCloseTo(31.2)
    expect(requiredElement('#inline-rule').getBoundingClientRect().y).toBeCloseTo(59.4)
  })

  it('accepts the explicit portable native-control profile', async () => {
    document.body.innerHTML = '<input id="text">'

    await attach({ nativeControls: { profile: 'portable' } })

    const rect = requiredElement('#text').getBoundingClientRect()
    expect(rect.width).toBe(192)
    expect(rect.height).toBe(23)
  })

  it('merges native-control overrides with the selected profile', async () => {
    document.body.innerHTML = '<input id="text"><input id="checkbox" type="checkbox">'

    await attach({
      nativeControls: {
        profile: 'portable',
        overrides: {
          textInput: { width: 240 },
          checkboxRadio: { width: 18, height: 16 },
        },
      },
    })

    const textRect = requiredElement('#text').getBoundingClientRect()
    const checkboxRect = requiredElement('#checkbox').getBoundingClientRect()
    expect({ width: textRect.width, height: textRect.height }).toEqual({ width: 240, height: 23 })
    expect({ width: checkboxRect.width, height: checkboxRect.height }).toEqual({ width: 18, height: 16 })
  })

  it('patches element dimension APIs from the computed layout snapshot', async () => {
    document.body.innerHTML = `
      <div
        id="box"
        style="position:absolute; left:10px; top:20px; width:100px; height:50px; padding:5px 10px; border-style:solid; border-width:2px 4px"
      ></div>
    `

    await attach()

    const box = requiredElement('#box') as HTMLElement
    const rect = box.getBoundingClientRect()

    expect(rect.width).toBe(128)
    expect(rect.height).toBe(64)
    expect(box.offsetWidth).toBe(128)
    expect(box.offsetHeight).toBe(64)
    expect(box.clientWidth).toBe(120)
    expect(box.clientHeight).toBe(60)
  })

  it('checks whether an element receives pointer events at its center', async () => {
    document.body.innerHTML = `
      <button id="save" style="position:absolute; left:10px; top:10px; width:100px; height:40px"></button>
      <div id="overlay" style="position:absolute; inset:0; z-index:10"></div>
    `

    await attach()

    expect(receivesPointerAtCenter(requiredElement('#save'))).toBe(false)
    expect(receivesPointerAtCenter(requiredElement('#overlay'))).toBe(true)
  })

  it('debug output identifies the element blocking another element at its center', async () => {
    document.body.innerHTML = `
      <button id="save" style="position:absolute; left:10px; top:10px; width:100px; height:40px"></button>
      <div id="overlay" style="position:absolute; inset:0; z-index:10"></div>
    `

    await attach()

    expect(debugLayout(window)).toContain('button#save x=10 y=10 w=100 h=40 z=0 pe=auto visibility=visible BLOCKED_BY=div#overlay')
  })

  it('asserts pointer reachability with debug output on failure', async () => {
    document.body.innerHTML = `
      <button id="save" style="position:absolute; left:10px; top:10px; width:100px; height:40px"></button>
      <div id="overlay" style="position:absolute; inset:0; z-index:10"></div>
    `

    await attach()

    expect(() => expectReceivesPointer(requiredElement('#overlay'))).not.toThrow()
    expect(() => expectReceivesPointer(requiredElement('#save'))).toThrow(/Top element: div#overlay/)
    expect(() => expectReceivesPointer(requiredElement('#save'))).toThrow(/Layout debug:/)
  })

  it('asserts center blockers and returns the blocking element', async () => {
    document.body.innerHTML = `
      <button id="save" style="position:absolute; left:10px; top:10px; width:100px; height:40px"></button>
      <div id="overlay" style="position:absolute; inset:0; z-index:10"></div>
    `

    await attach()

    expect(expectBlockedBy(requiredElement('#save'))).toBe(requiredElement('#overlay'))
    expect(() => expectBlockedBy(requiredElement('#save'), requiredElement('#overlay'))).not.toThrow()
    expect(() => expectBlockedBy(requiredElement('#overlay'))).toThrow(/Expected div#overlay to be blocked/)
  })

  it('guards click dispatch with pointer reachability', async () => {
    let clicks = 0
    document.body.innerHTML = `
      <button id="save" style="position:absolute; left:10px; top:10px; width:100px; height:40px"></button>
      <div id="overlay" style="position:absolute; inset:0; z-index:10"></div>
    `
    requiredElement('#save').addEventListener('click', () => {
      clicks += 1
    })

    await attach()

    expect(() => guardedClick(requiredElement('#save') as HTMLElement)).toThrow(/Top element: div#overlay/)
    expect(clicks).toBe(0)

    requiredElement('#overlay').setAttribute('style', 'display:none')
    await Promise.resolve()

    guardedClick(requiredElement('#save') as HTMLElement)
    expect(clicks).toBe(1)
  })

  it('passes constrained text inputs to the configured text measurer', async () => {
    const inputs: Array<{ maxWidth: number | undefined; fontWeight?: number; letterSpacing?: number }> = []
    document.body.innerHTML = '<div id="text" style="max-width:50px;font-weight:700;letter-spacing:2px">Hello world</div>'

    await attach({
      viewport: { width: 300, height: 200 },
      textMeasurer: {
        measure(input) {
          inputs.push({ maxWidth: input.maxWidth, fontWeight: input.fontWeight, letterSpacing: input.letterSpacing })
          return input.maxWidth === 50 ? { width: 50, height: 40 } : { width: 100, height: 20 }
        },
      },
    })

    requiredElement('#text').getBoundingClientRect()
    expect(inputs).toContainEqual({ maxWidth: 50, fontWeight: 700, letterSpacing: 2 })
  })

  it('passes inherited and overridden text transforms to the configured measurer', async () => {
    const texts: string[] = []
    document.body.innerHTML = `
      <style>#transform-container { text-transform: uppercase }</style>
      <div id="transform-container">
        <span id="inherited">Mixed case</span>
        <span id="overridden" style="display:block;text-transform:lowercase">Other TEXT</span>
      </div>
    `

    await attach({
      textMeasurer: {
        measure(input) {
          texts.push(input.text)
          return { width: input.text.length * 10, height: 20 }
        },
      },
    })

    requiredElement('#inherited').parentElement?.getBoundingClientRect()
    requiredElement('#overridden').getBoundingClientRect()

    expect(texts).toContain('MIXED CASE')
    expect(texts).toContain('other text')
    expect(requiredElement('#inherited').textContent).toBe('Mixed case')
  })

  it('uses data layout metadata as intrinsic dimensions', async () => {
    document.body.innerHTML = '<div id="icon" data-layout-width="32" data-layout-height="18"></div>'

    await attach({ viewport: { width: 300, height: 200 } })

    const rect = requiredElement('#icon').getBoundingClientRect()
    expect(rect.width).toBe(32)
    expect(rect.height).toBe(18)
  })

  it('uses configured text measurement in Taffy leaf sizing', async () => {
    const inputs: Array<{ text: string; maxWidth: number | undefined }> = []
    document.body.innerHTML = '<div id="text" style="width:100px">Hello</div>'

    await attach({
      viewport: { width: 300, height: 200 },
      textMeasurer: {
        measure(input) {
          inputs.push({ text: input.text, maxWidth: input.maxWidth })
          return { width: 20, height: 45 }
        },
      },
    })

    expect(requiredElement('#text').getBoundingClientRect().height).toBe(45)
    expect(inputs).toContainEqual({ text: 'Hello', maxWidth: 100 })
  })
})
