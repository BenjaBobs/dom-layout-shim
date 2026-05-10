import { afterEach, describe, expect, it } from 'vitest'
import { debugLayout } from '../../src/index.ts'
import { attach, expectRect, receivesPointerAtCenter, requiredElement } from './layout-engine-helpers.ts'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('layout geometry and DOM API attachment', () => {
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
})
