import { afterEach, describe, expect, it } from 'vitest'
import { Window } from 'happy-dom'
import { attachLayoutEngine, debugLayout, type AttachLayoutEngineOptions } from '../../src/index.ts'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('layout engine attachment', () => {
  it('patches getBoundingClientRect from supported stylesheet CSS', async () => {
    document.body.innerHTML = `
      <style>
        #save {
          position: absolute;
          left: 100px;
          top: 80px;
          width: 120px;
          height: 40px;
        }
      </style>
      <button id="save">Save</button>
    `

    await attach()

    const save = requiredElement('#save')
    const rect = save.getBoundingClientRect()

    expect(rect.left).toBe(100)
    expect(rect.top).toBe(80)
    expect(rect.width).toBe(120)
    expect(rect.height).toBe(40)
  })

  it('uses z-index before DOM order for elementFromPoint', async () => {
    document.body.innerHTML = `
      <style>
        #back {
          position: absolute;
          left: 0;
          top: 0;
          width: 100px;
          height: 100px;
          z-index: 10;
        }

        #front {
          position: absolute;
          left: 0;
          top: 0;
          width: 100px;
          height: 100px;
          z-index: 20;
        }
      </style>
      <div id="front"></div>
      <div id="back"></div>
    `

    await attach()

    expect(document.elementFromPoint(50, 50)).toBe(requiredElement('#front'))
    expect(document.elementsFromPoint(50, 50)).toEqual([
      requiredElement('#front'),
      requiredElement('#back'),
    ])
  })

  it('uses later DOM order when z-index ties', async () => {
    document.body.innerHTML = `
      <div id="first" style="position:absolute; left:0; top:0; width:100px; height:100px"></div>
      <div id="second" style="position:absolute; left:0; top:0; width:100px; height:100px"></div>
    `

    await attach()

    expect(document.elementFromPoint(50, 50)).toBe(requiredElement('#second'))
  })

  it('offsets relative boxes without changing normal flow placement', async () => {
    document.body.innerHTML = `
      <div id="one" style="position:relative; left:10px; top:5px; width:100px; height:30px"></div>
      <div id="two" style="width:80px; height:40px"></div>
    `

    await attach({ viewport: { width: 300, height: 200 } })

    expectRect(requiredElement('#one').getBoundingClientRect(), {
      left: 10,
      top: 5,
      width: 100,
      height: 30,
    })
    expectRect(requiredElement('#two').getBoundingClientRect(), {
      left: 0,
      top: 30,
      width: 80,
      height: 40,
    })
  })

  it('positions absolute children against the nearest positioned padding box', async () => {
    document.body.innerHTML = `
      <div id="parent" style="position:relative; left:5px; top:10px; width:100px; height:80px; padding:10px; border-style:solid; border-width:2px">
        <div id="child" style="position:absolute; left:3px; top:4px; width:20px; height:10px"></div>
      </div>
    `

    await attach({ viewport: { width: 300, height: 200 } })

    expectRect(requiredElement('#child').getBoundingClientRect(), {
      left: 10,
      top: 16,
      width: 20,
      height: 10,
    })
  })

  it('filters pointer-events none and visibility hidden from point queries', async () => {
    document.body.innerHTML = `
      <div id="target" style="position:absolute; left:0; top:0; width:100px; height:100px"></div>
      <div id="transparent" style="position:absolute; left:0; top:0; width:100px; height:100px; z-index:10; pointer-events:none"></div>
      <div id="hidden" style="position:absolute; left:0; top:0; width:100px; height:100px; z-index:20; visibility:hidden"></div>
    `

    await attach()

    expect(document.elementFromPoint(50, 50)).toBe(requiredElement('#target'))
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

    expect(debugLayout(window)).toContain('button#save x=10 y=10 w=100 h=40 z=0 BLOCKED_BY=div#overlay')
  })

  it('computes right and bottom positioned boxes', async () => {
    document.body.innerHTML = `
      <div id="box" style="position:absolute; right:25px; bottom:30px; width:50px; height:40px"></div>
    `

    await attach({ viewport: { width: 300, height: 200 } })

    const rect = requiredElement('#box').getBoundingClientRect()
    expect(rect.left).toBe(225)
    expect(rect.top).toBe(130)
    expect(rect.width).toBe(50)
    expect(rect.height).toBe(40)
  })

  it('computes auto dimensions from opposing inset edges', async () => {
    document.body.innerHTML = `
      <div id="box" style="position:fixed; inset:10px 20px"></div>
    `

    await attach({ viewport: { width: 300, height: 200 } })

    const rect = requiredElement('#box').getBoundingClientRect()
    expect(rect.left).toBe(20)
    expect(rect.top).toBe(10)
    expect(rect.width).toBe(260)
    expect(rect.height).toBe(180)
  })

  it('returns a zero rect for display none elements', async () => {
    document.body.innerHTML = `
      <div id="box" style="display:none; position:absolute; left:10px; top:20px; width:30px; height:40px"></div>
    `

    await attach()

    const rect = requiredElement('#box').getBoundingClientRect()
    expect(rect.left).toBe(0)
    expect(rect.top).toBe(0)
    expect(rect.width).toBe(0)
    expect(rect.height).toBe(0)
  })

  it('throws on unsupported display values by default', async () => {
    document.body.innerHTML = `
      <div id="box" style="display:table; position:absolute; left:0; top:0; width:100px; height:100px"></div>
    `

    await attach()

    expect(() => document.body.getBoundingClientRect()).toThrow(/Unsupported CSS unsupported-value/)
  })

  it('returns a zero rect for hidden attribute elements and descendants', async () => {
    document.body.innerHTML = `
      <div id="box" hidden style="position:absolute; left:10px; top:20px; width:30px; height:40px">
        <div id="child" style="position:absolute; left:0; top:0; width:10px; height:10px"></div>
      </div>
    `

    await attach()

    expectRect(requiredElement('#box').getBoundingClientRect(), {
      left: 0,
      top: 0,
      width: 0,
      height: 0,
    })
    expectRect(requiredElement('#child').getBoundingClientRect(), {
      left: 0,
      top: 0,
      width: 0,
      height: 0,
    })
  })

  it('includes padding and solid border widths in content-box rects', async () => {
    document.body.innerHTML = `
      <div
        id="box"
        style="position:absolute; left:10px; top:20px; width:100px; height:50px; padding:5px 10px; border-style:solid; border-width:2px 4px"
      ></div>
    `

    await attach()

    const rect = requiredElement('#box').getBoundingClientRect()
    expect(rect.left).toBe(10)
    expect(rect.top).toBe(20)
    expect(rect.width).toBe(128)
    expect(rect.height).toBe(64)
  })

  it('patches offset and client dimensions from layout boxes', async () => {
    document.body.innerHTML = `
      <div
        id="box"
        style="position:absolute; left:10px; top:20px; width:100px; height:50px; padding:5px 10px; border-style:solid; border-width:2px 4px"
      ></div>
    `

    await attach()

    const box = requiredElement('#box') as HTMLElement
    expect(box.offsetWidth).toBe(128)
    expect(box.offsetHeight).toBe(64)
    expect(box.clientWidth).toBe(120)
    expect(box.clientHeight).toBe(60)
  })

  it('does not expand border-box rects for padding and borders', async () => {
    document.body.innerHTML = `
      <div
        id="box"
        style="position:absolute; left:10px; top:20px; box-sizing:border-box; width:100px; height:50px; padding:5px 10px; border-style:solid; border-width:2px 4px"
      ></div>
    `

    await attach()

    const rect = requiredElement('#box').getBoundingClientRect()
    expect(rect.width).toBe(100)
    expect(rect.height).toBe(50)
  })

  it('applies min and max size constraints to positioned boxes', async () => {
    document.body.innerHTML = `
      <div id="min" style="position:absolute; left:0; top:0; width:50px; height:20px; min-width:80px; min-height:40px"></div>
      <div id="max" style="position:absolute; left:100px; top:0; width:90px; height:60px; max-width:70px; max-height:30px"></div>
    `

    await attach()

    expectRect(requiredElement('#min').getBoundingClientRect(), {
      left: 0,
      top: 0,
      width: 80,
      height: 40,
    })
    expectRect(requiredElement('#max').getBoundingClientRect(), {
      left: 100,
      top: 0,
      width: 70,
      height: 30,
    })
  })

  it('applies min and max size constraints in the active box-sizing model', async () => {
    document.body.innerHTML = `
      <div id="content-box" style="position:absolute; left:0; top:0; width:10px; height:10px; min-width:20px; min-height:15px; padding:5px; border-style:solid; border-width:2px"></div>
      <div id="border-box" style="position:absolute; left:0; top:40px; box-sizing:border-box; width:100px; height:60px; max-width:80px; max-height:30px; padding:5px; border-style:solid; border-width:2px"></div>
    `

    await attach()

    expectRect(requiredElement('#content-box').getBoundingClientRect(), {
      left: 0,
      top: 0,
      width: 34,
      height: 29,
    })
    expectRect(requiredElement('#border-box').getBoundingClientRect(), {
      left: 0,
      top: 40,
      width: 80,
      height: 30,
    })
  })

  it('ignores border width for none border styles', async () => {
    document.body.innerHTML = `
      <div
        id="box"
        style="position:absolute; left:10px; top:20px; width:100px; height:50px; border-style:none; border-width:10px"
      ></div>
    `

    await attach()

    const rect = requiredElement('#box').getBoundingClientRect()
    expect(rect.width).toBe(100)
    expect(rect.height).toBe(50)
  })

  it('stacks static block siblings vertically', async () => {
    document.body.innerHTML = `
      <div id="one" style="width:100px; height:30px"></div>
      <div id="two" style="width:80px; height:40px"></div>
    `

    await attach({ viewport: { width: 300, height: 200 } })

    expectRect(requiredElement('#one').getBoundingClientRect(), {
      left: 0,
      top: 0,
      width: 100,
      height: 30,
    })
    expectRect(requiredElement('#two').getBoundingClientRect(), {
      left: 0,
      top: 30,
      width: 80,
      height: 40,
    })
  })

  it('lays out static children inside parent padding and borders', async () => {
    document.body.innerHTML = `
      <div id="parent" style="width:100px; padding:10px; border-style:solid; border-width:2px">
        <div id="child" style="height:20px"></div>
      </div>
    `

    await attach({ viewport: { width: 300, height: 200 } })

    expectRect(requiredElement('#parent').getBoundingClientRect(), {
      left: 0,
      top: 0,
      width: 124,
      height: 44,
    })
    expectRect(requiredElement('#child').getBoundingClientRect(), {
      left: 12,
      top: 12,
      width: 100,
      height: 20,
    })
  })

  it('includes static child margins in block flow without margin collapse', async () => {
    document.body.innerHTML = `
      <div id="parent" style="width:100px; padding:1px">
        <div id="child" style="height:20px; margin-top:5px; margin-bottom:7px"></div>
      </div>
    `

    await attach({ viewport: { width: 300, height: 200 } })

    expectRect(requiredElement('#child').getBoundingClientRect(), {
      left: 1,
      top: 6,
      width: 100,
      height: 20,
    })
    expect(requiredElement('#parent').getBoundingClientRect().height).toBe(34)
  })

  it('uses the configured text measurer for text-only leaf auto height', async () => {
    document.body.innerHTML = `
      <div id="text" style="width:100px">Hello</div>
    `

    await attach({
      textMeasurer: {
        measure() {
          return { width: 25, height: 30 }
        },
      },
    })

    const rect = requiredElement('#text').getBoundingClientRect()
    expect(rect.width).toBe(100)
    expect(rect.height).toBe(30)
  })

  it('measures text auto height with the constrained content width', async () => {
    document.body.innerHTML = `
      <div id="text" style="max-width:50px">Hello world</div>
    `

    await attach({
      viewport: { width: 300, height: 200 },
      textMeasurer: {
        measure(input) {
          return input.maxWidth === 50 ? { width: 50, height: 40 } : { width: 100, height: 20 }
        },
      },
    })

    expectRect(requiredElement('#text').getBoundingClientRect(), {
      left: 0,
      top: 0,
      width: 50,
      height: 40,
    })
  })

  it('uses text measurement for positioned auto sizes', async () => {
    document.body.innerHTML = `
      <div id="text" style="position:absolute; left:10px; top:20px; font-size:20px; line-height:30px; white-space:nowrap">Hello</div>
    `

    await attach()

    expectRect(requiredElement('#text').getBoundingClientRect(), {
      left: 10,
      top: 20,
      width: 50,
      height: 30,
    })
  })

  it('uses data layout metadata as intrinsic dimensions', async () => {
    document.body.innerHTML = `
      <div id="icon" data-layout-width="32" data-layout-height="18"></div>
    `

    await attach({ viewport: { width: 300, height: 200 } })

    expectRect(requiredElement('#icon').getBoundingClientRect(), {
      left: 0,
      top: 0,
      width: 32,
      height: 18,
    })
  })

  it('uses measured text as flex item intrinsic size', async () => {
    document.body.innerHTML = `
      <div id="parent" style="display:flex; width:200px">
        <div id="label">Measured label</div>
        <div id="box" style="width:40px; height:10px"></div>
      </div>
    `

    await attach({
      viewport: { width: 300, height: 200 },
      textMeasurer: {
        measure(input) {
          return input.text.includes('Measured') ? { width: 70, height: 24 } : { width: 1, height: 1 }
        },
      },
    })

    expectRect(requiredElement('#label').getBoundingClientRect(), {
      left: 0,
      top: 0,
      width: 70,
      height: 24,
    })
    expectRect(requiredElement('#box').getBoundingClientRect(), {
      left: 70,
      top: 0,
      width: 40,
      height: 10,
    })
    expectRect(requiredElement('#parent').getBoundingClientRect(), {
      left: 0,
      top: 0,
      width: 200,
      height: 24,
    })
  })

  it('uses the configured text measurer for Taffy text leaves', async () => {
    document.body.innerHTML = `
      <div id="text" style="width:100px">Hello</div>
    `

    await attach({
      viewport: { width: 300, height: 200 },
      textMeasurer: {
        measure(input) {
          return input.maxWidth === 100 ? { width: 20, height: 45 } : { width: 10, height: 15 }
        },
      },
    })

    expectRect(requiredElement('#text').getBoundingClientRect(), {
      left: 0,
      top: 0,
      width: 100,
      height: 45,
    })
  })

  it('throws on unknown CSS by default', async () => {
    document.body.innerHTML = `
      <div id="box" style="position:absolute; left:0; top:0; width:100px; height:100px; transform:translateX(10px)"></div>
    `

    await attach()

    expect(() => document.body.getBoundingClientRect()).toThrow(/Unsupported CSS unknown-property/)
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
      <div id="box" style="position:absolute; left:0; top:0; width:100px; height:100px; border:1px dashed red"></div>
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
      <div id="box" style="position:absolute; left:0; top:0; width:100px; height:100px; overflow:auto"></div>
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
      <div id="box" style="position:absolute; inset-inline-start:0; inset-block-start:0; inline-size:100px; block-size:100px; margin-inline:auto"></div>
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

  it('supports stylesheet selector lists through Lightning CSS parsing', async () => {
    document.body.innerHTML = `
      <style>
        #one, #two {
          position: absolute;
          left: 10px;
          top: 10px;
          width: 30px;
          height: 30px;
        }

        #two {
          z-index: 1;
        }
      </style>
      <div id="one"></div>
      <div id="two"></div>
    `

    await attach()

    expect(document.elementFromPoint(20, 20)).toBe(requiredElement('#two'))
  })

  it('applies stylesheet rules by specificity before source order', async () => {
    document.body.innerHTML = `
      <style>
        #box {
          position: absolute;
          left: 10px;
          top: 0;
          width: 50px;
          height: 50px;
        }

        .box {
          left: 100px;
        }
      </style>
      <div id="box" class="box"></div>
    `

    await attach()

    expect(requiredElement('#box').getBoundingClientRect().left).toBe(10)
  })

  it('uses later stylesheet rules when specificity ties', async () => {
    document.body.innerHTML = `
      <style>
        .box {
          position: absolute;
          left: 10px;
          top: 0;
          width: 50px;
          height: 50px;
        }

        .box {
          left: 100px;
        }
      </style>
      <div id="box" class="box"></div>
    `

    await attach()

    expect(requiredElement('#box').getBoundingClientRect().left).toBe(100)
  })

  it('supports descendant and child selectors in stylesheets', async () => {
    document.body.innerHTML = `
      <style>
        .button {
          position: absolute;
          left: 10px;
          top: 0;
          width: 50px;
          height: 50px;
        }

        .dialog .button {
          left: 40px;
        }

        #app > .panel {
          position: absolute;
          left: 0;
          top: 60px;
          width: 80px;
          height: 30px;
        }
      </style>
      <div class="dialog">
        <button id="button" class="button"></button>
      </div>
      <div id="app">
        <div id="panel" class="panel"></div>
      </div>
    `

    await attach()

    expectRect(requiredElement('#button').getBoundingClientRect(), {
      left: 40,
      top: 0,
      width: 50,
      height: 50,
    })
    expectRect(requiredElement('#panel').getBoundingClientRect(), {
      left: 0,
      top: 60,
      width: 80,
      height: 30,
    })
  })

  it('supports attribute selectors in stylesheets', async () => {
    document.body.innerHTML = `
      <style>
        [data-state] {
          position: absolute;
          left: 10px;
          top: 0;
          width: 50px;
          height: 50px;
        }

        [data-state="open"] {
          left: 30px;
        }

        [data-tags~="primary"] {
          top: 20px;
        }

        [data-name^="save"] {
          width: 80px;
        }
      </style>
      <button id="button" data-state="open" data-tags="primary action" data-name="save-button"></button>
    `

    await attach()

    expectRect(requiredElement('#button').getBoundingClientRect(), {
      left: 30,
      top: 20,
      width: 80,
      height: 50,
    })
  })

  it('routes case-insensitive attribute selectors through the unsupported CSS policy', async () => {
    document.body.innerHTML = `
      <style>
        [data-state="open" i] {
          position: absolute;
          left: 10px;
          top: 0;
          width: 50px;
          height: 50px;
        }
      </style>
      <button id="button" data-state="OPEN"></button>
    `

    await attach()

    expect(() => document.body.getBoundingClientRect()).toThrow(/Unsupported CSS unsupported-rule/)
  })

  it('supports where is and not pseudo selectors in stylesheets', async () => {
    document.body.innerHTML = `
      <style>
        :where([data-state="open"]) {
          position: absolute;
          left: 10px;
          top: 0;
          width: 50px;
          height: 50px;
        }

        :is(.primary, [data-priority="high"]) {
          left: 30px;
        }

        button:not([hidden]) {
          top: 20px;
        }
      </style>
      <button id="button" data-state="open" data-priority="high"></button>
    `

    await attach()

    expectRect(requiredElement('#button').getBoundingClientRect(), {
      left: 30,
      top: 20,
      width: 50,
      height: 50,
    })
  })

  it('applies configured stylesheet CSS before document styles', async () => {
    document.body.innerHTML = `
      <style>
        .box {
          left: 40px;
        }
      </style>
      <div id="box" class="box"></div>
    `

    await attach({
      stylesheets: [
        `
          .box {
            position: absolute;
            left: 10px;
            top: 20px;
            width: 100px;
            height: 50px;
          }
        `,
      ],
    })

    expectRect(requiredElement('#box').getBoundingClientRect(), {
      left: 40,
      top: 20,
      width: 100,
      height: 50,
    })
  })

  it('lets inline styles override configured stylesheet CSS', async () => {
    document.body.innerHTML = `
      <div id="box" class="box" style="left:60px"></div>
    `

    await attach({
      stylesheets: [
        `
          .box {
            position: absolute;
            left: 10px;
            top: 20px;
            width: 100px;
            height: 50px;
          }
        `,
      ],
    })

    expect(requiredElement('#box').getBoundingClientRect().left).toBe(60)
  })

  it('routes unsupported configured stylesheet rules through the unsupported CSS policy', async () => {
    document.body.innerHTML = `
      <div id="box"></div>
    `

    await attach({
      stylesheets: [
        `
          @media (min-width: 1px) {
            #box {
              position: absolute;
              left: 0;
              top: 0;
              width: 100px;
              height: 100px;
            }
          }
        `,
      ],
    })

    expect(() => document.body.getBoundingClientRect()).toThrow(/Unsupported CSS unsupported-rule: @media: media/)
  })

  it('routes unsupported at-rules through the unsupported CSS policy', async () => {
    document.body.innerHTML = `
      <style>
        @media (min-width: 1px) {
          #box {
            position: absolute;
            left: 0;
            top: 0;
            width: 100px;
            height: 100px;
          }
        }
      </style>
      <div id="box"></div>
    `

    await attach()

    expect(() => document.body.getBoundingClientRect()).toThrow(/Unsupported CSS unsupported-rule: @media: media/)
  })

  it('routes unsupported selectors through the unsupported CSS policy', async () => {
    document.body.innerHTML = `
      <style>
        .box:focus-visible {
          left: 10px;
        }
      </style>
      <div id="box" class="box"></div>
    `

    await attach()

    expect(() => document.body.getBoundingClientRect()).toThrow(/Unsupported CSS unsupported-rule/)
  })

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

async function attach(config: Omit<AttachLayoutEngineOptions, 'window'> = {}): Promise<void> {
  await attachLayoutEngine({ window, ...config })
}

async function waitForMutationDelivery(): Promise<void> {
  await Promise.resolve()
}

function requiredElement(selector: string): Element {
  const element = document.querySelector(selector)

  if (!element) {
    throw new Error(`Missing test element: ${selector}`)
  }

  return element
}

function receivesPointerAtCenter(element: Element): boolean {
  const rect = element.getBoundingClientRect()
  const top = element.ownerDocument.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)

  return top === element || Boolean(top && element.contains(top))
}

function expectRect(
  rect: DOMRect,
  expected: { left: number; top: number; width: number; height: number },
): void {
  expect(rect.left).toBe(expected.left)
  expect(rect.top).toBe(expected.top)
  expect(rect.width).toBe(expected.width)
  expect(rect.height).toBe(expected.height)
}
