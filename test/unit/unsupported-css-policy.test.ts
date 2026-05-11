import { afterEach, describe, expect, it } from 'vitest'
import { attach, requiredElement } from './layout-engine-helpers.ts'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('unsupported CSS policy', () => {
  it('throws on unsupported transform values by default', async () => {
    document.body.innerHTML = `
      <div id="box" style="position:absolute; left:0; top:0; width:100px; height:100px; transform:translateX(10px)"></div>
    `

    await attach()

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

    await attach()

    expect(document.elementFromPoint(50, 50)).toBe(requiredElement('#box'))
  })

  it('throws when custom properties are referenced from supported layout declarations', async () => {
    document.body.innerHTML = `
      <div id="box" style="--box-size:100px; position:absolute; left:0; top:0; width:var(--box-size); height:100px"></div>
    `

    await attach()

    expect(() => document.body.getBoundingClientRect()).toThrow(/Unsupported CSS unsupported-value/)
  })

  it('throws on unsupported border shorthand styles by default', async () => {
    document.body.innerHTML = `
      <div id="box" style="position:absolute; left:0; top:0; width:100px; height:100px; border:1px wave red"></div>
    `

    await attach()

    expect(() => document.body.getBoundingClientRect()).toThrow(/Unsupported CSS unsupported-value/)
  })

  it('throws on unsupported border shorthand keywords by default', async () => {
    document.body.innerHTML = `
      <div id="box" style="position:absolute; left:0; top:0; width:100px; height:100px; border:inherit"></div>
    `

    await attach()

    expect(() => document.body.getBoundingClientRect()).toThrow(/Unsupported CSS unsupported-value/)
  })

  it('throws on invalid opacity values by default', async () => {
    document.body.innerHTML = `
      <div id="box" style="position:absolute; left:0; top:0; width:100px; height:100px; opacity:2"></div>
    `

    await attach()

    expect(() => document.body.getBoundingClientRect()).toThrow(/Unsupported CSS unsupported-value/)
  })

  it('throws on invalid visual color values by default', async () => {
    document.body.innerHTML = `
      <div id="box" style="position:absolute; left:0; top:0; width:100px; height:100px; border-color:not-a-color"></div>
    `

    await attach()

    expect(() => document.body.getBoundingClientRect()).toThrow(/Unsupported CSS unsupported-value/)
  })

  it('throws on invalid outline shorthands by default', async () => {
    document.body.innerHTML = `
      <div id="box" style="position:absolute; left:0; top:0; width:100px; height:100px; outline:1px solid solid"></div>
    `

    await attach()

    expect(() => document.body.getBoundingClientRect()).toThrow(/Unsupported CSS unsupported-value/)
  })

  it('throws on unsupported background shorthand values by default', async () => {
    document.body.innerHTML = `
      <div id="box" style="position:absolute; left:0; top:0; width:100px; height:100px; background:url(image.png)"></div>
    `

    await attach()

    expect(() => document.body.getBoundingClientRect()).toThrow(/Unsupported CSS unsupported-value/)
  })

  it('throws on unsupported background image values by default', async () => {
    document.body.innerHTML = `
      <div id="box" style="position:absolute; left:0; top:0; width:100px; height:100px; background-image:url(image.png)"></div>
    `

    await attach()

    expect(() => document.body.getBoundingClientRect()).toThrow(/Unsupported CSS unsupported-value/)
  })

  it('throws on unsupported visual hint values by default', async () => {
    document.body.innerHTML = `
      <div id="box" style="position:absolute; left:0; top:0; width:100px; height:100px; cursor:url(pointer.cur), pointer"></div>
    `

    await attach()

    expect(() => document.body.getBoundingClientRect()).toThrow(/Unsupported CSS unsupported-value/)
  })

  it('throws on unsupported box shadow values by default', async () => {
    document.body.innerHTML = `
      <div id="box" style="position:absolute; left:0; top:0; width:100px; height:100px; box-shadow:solid red"></div>
    `

    await attach()

    expect(() => document.body.getBoundingClientRect()).toThrow(/Unsupported CSS unsupported-value/)
  })

  it('throws on unsupported border radius values by default', async () => {
    document.body.innerHTML = `
      <div id="box" style="position:absolute; left:0; top:0; width:100px; height:100px; border-radius:4px / 5px / 6px"></div>
    `

    await attach()

    expect(() => document.body.getBoundingClientRect()).toThrow(/Unsupported CSS unsupported-value/)
  })

  it('throws on unsupported overflow values by default', async () => {
    document.body.innerHTML = `
      <div id="box" style="position:absolute; left:0; top:0; width:100px; height:100px; overflow:overlay"></div>
    `

    await attach()

    expect(() => document.body.getBoundingClientRect()).toThrow(/Unsupported CSS unsupported-value/)
  })

  it('throws on unsupported filter values by default', async () => {
    document.body.innerHTML = `
      <div id="box" style="position:absolute; left:0; top:0; width:100px; height:100px; filter:url(#filter)"></div>
    `

    await attach()

    expect(() => document.body.getBoundingClientRect()).toThrow(/Unsupported CSS unsupported-value/)
  })

  it('throws on unsupported text decoration values by default', async () => {
    document.body.innerHTML = `
      <div id="box" style="position:absolute; left:0; top:0; width:100px; height:100px; text-decoration:underline underline"></div>
    `

    await attach()

    expect(() => document.body.getBoundingClientRect()).toThrow(/Unsupported CSS unsupported-value/)
  })

  it('throws on unsupported list style image values by default', async () => {
    document.body.innerHTML = `
      <div id="box" style="position:absolute; left:0; top:0; width:100px; height:100px; list-style-image:url(marker.png)"></div>
    `

    await attach()

    expect(() => document.body.getBoundingClientRect()).toThrow(/Unsupported CSS unsupported-value/)
  })

  it('throws on unsupported logical spacing values by default', async () => {
    document.body.innerHTML = `
      <div id="box" style="position:absolute; inset-inline-start:0; inset-block-start:0; inline-size:100px; block-size:100px; padding-inline:auto"></div>
    `

    await attach()

    expect(() => document.body.getBoundingClientRect()).toThrow(/Unsupported CSS unsupported-value/)
  })

  it('accepts default writing direction declarations used by logical CSS', async () => {
    document.body.innerHTML = `
      <div id="box" style="direction:ltr; writing-mode:horizontal-tb; position:absolute; inset-inline-start:0; inset-block-start:0; inline-size:100px; block-size:100px"></div>
    `

    await attach()

    expect(document.elementFromPoint(50, 50)).toBe(requiredElement('#box'))
  })

  it('throws on unsupported non-default writing direction values by default', async () => {
    document.body.innerHTML = `
      <div id="box" style="direction:rtl; position:absolute; left:0; top:0; width:100px; height:100px"></div>
    `

    await attach()

    expect(() => document.body.getBoundingClientRect()).toThrow(/Unsupported CSS unsupported-value/)
  })

  it('accepts default float and clear declarations', async () => {
    document.body.innerHTML = `
      <div id="box" style="float:none; clear:none; position:absolute; left:0; top:0; width:100px; height:100px"></div>
    `

    await attach()

    expect(document.elementFromPoint(50, 50)).toBe(requiredElement('#box'))
  })

  it('throws on unsupported non-default float and clear values by default', async () => {
    document.body.innerHTML = `
      <div id="box" style="float:left; clear:both; width:100px; height:100px"></div>
    `

    await attach()

    expect(() => document.body.getBoundingClientRect()).toThrow(/Unsupported CSS unsupported-value/)
  })

  it('accepts default transform and containment declarations', async () => {
    document.body.innerHTML = `
      <div id="box" style="transform:none; contain:none; container-type:normal; container-name:none; position:absolute; left:0; top:0; width:100px; height:100px"></div>
    `

    await attach()

    expect(document.elementFromPoint(50, 50)).toBe(requiredElement('#box'))
  })

  it('throws on unsupported non-default containment values by default', async () => {
    document.body.innerHTML = `
      <div id="box" style="contain:layout; container-type:inline-size; width:100px; height:100px"></div>
    `

    await attach()

    expect(() => document.body.getBoundingClientRect()).toThrow(/Unsupported CSS unsupported-value/)
  })

  it('throws on unsupported place alignment values by default', async () => {
    document.body.innerHTML = `
      <div id="box" style="display:grid; width:100px; height:100px; place-items:baseline center"></div>
    `

    await attach()

    expect(() => document.body.getBoundingClientRect()).toThrow(/Unsupported CSS unsupported-value/)
  })

  it('throws on unsupported flex flow values by default', async () => {
    document.body.innerHTML = `
      <div id="box" style="display:flex; width:100px; height:100px; flex-flow:row row"></div>
    `

    await attach()

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
