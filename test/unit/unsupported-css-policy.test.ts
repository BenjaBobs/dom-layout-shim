import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createUnsupportedCssReporter,
  type UnsupportedCssContext,
} from '../../src/index.ts'
import { attach, requiredElement } from './layout-engine-helpers.ts'

afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

describe('unsupported CSS policy', () => {
  it('warns once and continues layout by default', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    document.body.innerHTML = `
      <div id="box" style="width:100px; height:40px; transform:rotate(10deg)"></div>
    `

    await attach()

    expect(requiredElement('#box').getBoundingClientRect().width).toBe(100)
    expect(requiredElement('#box').getBoundingClientRect().width).toBe(100)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('[dom-layout-shim] Unsupported CSS unsupported-value'))
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('css-support-status.html?q=transform'))
  })

  it('reports warning context through a callback without logging', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const warnings: UnsupportedCssContext[] = []
    document.body.innerHTML = `
      <div id="box" style="width:100px; height:40px; transform:rotate(10deg)"></div>
    `

    await attach({
      unsupportedCss: {
        onWarning: (context) => warnings.push(context),
      },
    })

    document.body.getBoundingClientRect()
    document.body.getBoundingClientRect()

    expect(warn).not.toHaveBeenCalled()
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toMatchObject({
      property: 'transform',
      value: 'rotate(10deg)',
      reason: 'unsupported-value',
      source: 'inline-style',
      defaultDecision: 'warn',
    })
  })

  it('summarizes unique unsupported declarations across a test suite', async () => {
    const reporter = createUnsupportedCssReporter()
    document.body.innerHTML = `
      <div style="transform:rotate(10deg)"></div>
      <div style="transform:rotate(10deg)"></div>
      <div style="transform:skewX(10deg)"></div>
    `

    await attach({
      unsupportedCss: {
        onWarning: reporter.onWarning,
      },
    })
    document.body.getBoundingClientRect()
    reporter.onWarning({
      property: 'transform',
      value: 'rotate(10deg)',
      reason: 'unsupported-value',
      source: 'stylesheet',
      defaultDecision: 'warn',
    })

    expect(reporter.getSummary()).toEqual({
      unsupportedDeclarationCount: 2,
      declarations: [
        {
          property: 'transform',
          value: 'rotate(10deg)',
          reason: 'unsupported-value',
          sources: ['inline-style', 'stylesheet'],
        },
        {
          property: 'transform',
          value: 'skewX(10deg)',
          reason: 'unsupported-value',
          sources: ['inline-style'],
        },
      ],
    })

    document.body.innerHTML = '<div style="transform:rotate(10deg)"></div>'
    await attach({
      unsupportedCss: {
        onWarning: reporter.onWarning,
      },
    })
    document.body.getBoundingClientRect()

    expect(reporter.getSummary().unsupportedDeclarationCount).toBe(2)
  })

  it('resets an unsupported CSS summary between suites', () => {
    const reporter = createUnsupportedCssReporter()

    reporter.onWarning({
      property: 'transform',
      value: 'translateX(10px)',
      reason: 'unsupported-value',
      source: 'inline-style',
      defaultDecision: 'warn',
    })
    reporter.reset()

    expect(reporter.getSummary()).toEqual({
      unsupportedDeclarationCount: 0,
      declarations: [],
    })
  })

  it('throws on unsupported transform values in strict mode', async () => {
    document.body.innerHTML = `
      <div id="box" style="position:absolute; left:0; top:0; width:100px; height:100px; transform:rotate(10deg)"></div>
    `

    await attachStrict()

    expect(() => document.body.getBoundingClientRect()).toThrow(/Unsupported CSS unsupported-value/)
  })

  it('accepts inert custom properties and transitions', async () => {
    document.body.innerHTML = `
      <style>
        #box {
          --box-size: 100px;
          position: absolute;
          left: 0;
          top: 0;
          width: 100px;
          height: 100px;
          transition: opacity 100ms ease, left 1s;
          transition-property: opacity, transform;
          transition-duration: 100ms, 1s;
          transition-timing-function: ease-in-out;
          transition-delay: 50ms;
          transition-behavior: allow-discrete;
        }
      </style>
      <div id="box" style="--inline-token: 1; transition: opacity 50ms"></div>
    `

    await attachStrict()

    expect(document.elementFromPoint(50, 50)).toBe(requiredElement('#box'))
  })

  it('throws when an unresolved custom property is referenced from a supported layout declaration', async () => {
    document.body.innerHTML = `
      <div id="box" style="position:absolute; left:0; top:0; width:var(--missing-size); height:100px"></div>
    `

    await attachStrict()

    expect(() => document.body.getBoundingClientRect()).toThrow(/Unsupported CSS unsupported-value/)
  })

  it('throws on unsupported border shorthand styles in strict mode', async () => {
    document.body.innerHTML = `
      <div id="box" style="position:absolute; left:0; top:0; width:100px; height:100px; border:1px wave red"></div>
    `

    await attachStrict()

    expect(() => document.body.getBoundingClientRect()).toThrow(/Unsupported CSS unsupported-value/)
  })

  it('throws on unsupported border shorthand keywords in strict mode', async () => {
    document.body.innerHTML = `
      <div id="box" style="position:absolute; left:0; top:0; width:100px; height:100px; border:inherit"></div>
    `

    await attachStrict()

    expect(() => document.body.getBoundingClientRect()).toThrow(/Unsupported CSS unsupported-value/)
  })

  it('throws on invalid opacity values in strict mode', async () => {
    document.body.innerHTML = `
      <div id="box" style="position:absolute; left:0; top:0; width:100px; height:100px; opacity:2"></div>
    `

    await attachStrict()

    expect(() => document.body.getBoundingClientRect()).toThrow(/Unsupported CSS unsupported-value/)
  })

  it('throws on invalid visual color values in strict mode', async () => {
    document.body.innerHTML = `
      <div id="box" style="position:absolute; left:0; top:0; width:100px; height:100px; border-color:not-a-color"></div>
    `

    await attachStrict()

    expect(() => document.body.getBoundingClientRect()).toThrow(/Unsupported CSS unsupported-value/)
  })

  it('throws on invalid outline shorthands in strict mode', async () => {
    document.body.innerHTML = `
      <div id="box" style="position:absolute; left:0; top:0; width:100px; height:100px; outline:1px solid solid"></div>
    `

    await attachStrict()

    expect(() => document.body.getBoundingClientRect()).toThrow(/Unsupported CSS unsupported-value/)
  })

  it('throws on unsupported background shorthand values in strict mode', async () => {
    document.body.innerHTML = `
      <div id="box" style="position:absolute; left:0; top:0; width:100px; height:100px; background:url(image.png)"></div>
    `

    await attachStrict()

    expect(() => document.body.getBoundingClientRect()).toThrow(/Unsupported CSS unsupported-value/)
  })

  it('throws on unsupported background image values in strict mode', async () => {
    document.body.innerHTML = `
      <div id="box" style="position:absolute; left:0; top:0; width:100px; height:100px; background-image:url(image.png)"></div>
    `

    await attachStrict()

    expect(() => document.body.getBoundingClientRect()).toThrow(/Unsupported CSS unsupported-value/)
  })

  it('throws on unsupported visual hint values in strict mode', async () => {
    document.body.innerHTML = `
      <div id="box" style="position:absolute; left:0; top:0; width:100px; height:100px; cursor:url(pointer.cur), pointer"></div>
    `

    await attachStrict()

    expect(() => document.body.getBoundingClientRect()).toThrow(/Unsupported CSS unsupported-value/)
  })

  it('throws on unsupported box shadow values in strict mode', async () => {
    document.body.innerHTML = `
      <div id="box" style="position:absolute; left:0; top:0; width:100px; height:100px; box-shadow:solid red"></div>
    `

    await attachStrict()

    expect(() => document.body.getBoundingClientRect()).toThrow(/Unsupported CSS unsupported-value/)
  })

  it('throws on unsupported border radius values in strict mode', async () => {
    document.body.innerHTML = `
      <div id="box" style="position:absolute; left:0; top:0; width:100px; height:100px; border-radius:4px / 5px / 6px"></div>
    `

    await attachStrict()

    expect(() => document.body.getBoundingClientRect()).toThrow(/Unsupported CSS unsupported-value/)
  })

  it('throws on unsupported overflow values in strict mode', async () => {
    document.body.innerHTML = `
      <div id="box" style="position:absolute; left:0; top:0; width:100px; height:100px; overflow:overlay"></div>
    `

    await attachStrict()

    expect(() => document.body.getBoundingClientRect()).toThrow(/Unsupported CSS unsupported-value/)
  })

  it('throws on unsupported filter values in strict mode', async () => {
    document.body.innerHTML = `
      <div id="box" style="position:absolute; left:0; top:0; width:100px; height:100px; filter:url(#filter)"></div>
    `

    await attachStrict()

    expect(() => document.body.getBoundingClientRect()).toThrow(/Unsupported CSS unsupported-value/)
  })

  it('throws on unsupported text decoration values in strict mode', async () => {
    document.body.innerHTML = `
      <div id="box" style="position:absolute; left:0; top:0; width:100px; height:100px; text-decoration:underline underline"></div>
    `

    await attachStrict()

    expect(() => document.body.getBoundingClientRect()).toThrow(/Unsupported CSS unsupported-value/)
  })

  it('throws on unsupported list style image values in strict mode', async () => {
    document.body.innerHTML = `
      <div id="box" style="position:absolute; left:0; top:0; width:100px; height:100px; list-style-image:url(marker.png)"></div>
    `

    await attachStrict()

    expect(() => document.body.getBoundingClientRect()).toThrow(/Unsupported CSS unsupported-value/)
  })

  it('throws on unsupported logical spacing values in strict mode', async () => {
    document.body.innerHTML = `
      <div id="box" style="position:absolute; inset-inline-start:0; inset-block-start:0; inline-size:100px; block-size:100px; padding-inline:auto"></div>
    `

    await attachStrict()

    expect(() => document.body.getBoundingClientRect()).toThrow(/Unsupported CSS unsupported-value/)
  })

  it('accepts default writing direction declarations used by logical CSS', async () => {
    document.body.innerHTML = `
      <div id="box" style="direction:ltr; writing-mode:horizontal-tb; position:absolute; inset-inline-start:0; inset-block-start:0; inline-size:100px; block-size:100px"></div>
    `

    await attachStrict()

    expect(document.elementFromPoint(50, 50)).toBe(requiredElement('#box'))
  })

  it('throws on unsupported non-default writing direction values in strict mode', async () => {
    document.body.innerHTML = `
      <div id="box" style="direction:rtl; position:absolute; left:0; top:0; width:100px; height:100px"></div>
    `

    await attachStrict()

    expect(() => document.body.getBoundingClientRect()).toThrow(/Unsupported CSS unsupported-value/)
  })

  it('accepts default float and clear declarations', async () => {
    document.body.innerHTML = `
      <div id="box" style="float:none; clear:none; position:absolute; left:0; top:0; width:100px; height:100px"></div>
    `

    await attachStrict()

    expect(document.elementFromPoint(50, 50)).toBe(requiredElement('#box'))
  })

  it('throws on unsupported non-default float and clear values in strict mode', async () => {
    document.body.innerHTML = `
      <div id="box" style="float:left; clear:both; width:100px; height:100px"></div>
    `

    await attachStrict()

    expect(() => document.body.getBoundingClientRect()).toThrow(/Unsupported CSS unsupported-value/)
  })

  it('accepts default transform and containment declarations', async () => {
    document.body.innerHTML = `
      <div id="box" style="transform:none; contain:none; container-type:normal; container-name:none; position:absolute; left:0; top:0; width:100px; height:100px"></div>
    `

    await attachStrict()

    expect(document.elementFromPoint(50, 50)).toBe(requiredElement('#box'))
  })

  it('throws on unsupported non-default containment values in strict mode', async () => {
    document.body.innerHTML = `
      <div id="box" style="contain:layout; container-type:inline-size; width:100px; height:100px"></div>
    `

    await attachStrict()

    expect(() => document.body.getBoundingClientRect()).toThrow(/Unsupported CSS unsupported-value/)
  })

  it('throws on unsupported place alignment values in strict mode', async () => {
    document.body.innerHTML = `
      <div id="box" style="display:grid; width:100px; height:100px; place-items:baseline center"></div>
    `

    await attachStrict()

    expect(() => document.body.getBoundingClientRect()).toThrow(/Unsupported CSS unsupported-value/)
  })

  it('throws on unsupported flex flow values in strict mode', async () => {
    document.body.innerHTML = `
      <div id="box" style="display:flex; width:100px; height:100px; flex-flow:row row"></div>
    `

    await attachStrict()

    expect(() => document.body.getBoundingClientRect()).toThrow(/Unsupported CSS unsupported-value/)
  })

  it('can ignore unknown CSS through policy', async () => {
    document.body.innerHTML = `
      <div id="box" style="position:absolute; left:0; top:0; width:100px; height:100px; transition:opacity 100ms"></div>
    `

    await attach({
      unsupportedCss: {
        default: 'throw',
        properties: {
          transition: 'ignore',
        },
      },
    })

    expect(document.elementFromPoint(50, 50)).toBe(requiredElement('#box'))
  })
})

async function attachStrict(): Promise<void> {
  await attach({ unsupportedCss: { default: 'throw' } })
}
