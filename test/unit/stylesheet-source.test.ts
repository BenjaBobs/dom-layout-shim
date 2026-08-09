import { afterEach, describe, expect, it } from 'vitest'
import { attach, expectRect, requiredElement } from './layout-engine-helpers.ts'

afterEach(() => {
  document.body.innerHTML = ''
  document.adoptedStyleSheets = []
})

describe('stylesheet source handling', () => {
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

    await attachStrict()

    expect(() => document.body.getBoundingClientRect()).toThrow(/Unsupported CSS unsupported-rule/)
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

  it('reads rules inserted through the stylesheet CSSOM', async () => {
    document.body.innerHTML = `
      <style id="styles"></style>
      <div id="box" class="box"></div>
    `

    const styleElement = requiredElement('#styles') as HTMLStyleElement
    styleElement.sheet?.insertRule(`
      .box {
        position: absolute;
        left: 10px;
        top: 20px;
        width: 100px;
        height: 50px;
      }
    `)

    await attach()

    expectRect(requiredElement('#box').getBoundingClientRect(), {
      left: 10,
      top: 20,
      width: 100,
      height: 50,
    })
  })

  it('applies accessible external stylesheets in document order', async () => {
    document.body.innerHTML = `
      <style>
        .box {
          position: absolute;
          left: 10px;
          top: 20px;
          width: 100px;
          height: 50px;
        }
      </style>
      <link id="external" rel="stylesheet">
      <style>.box { left: 30px; }</style>
      <div id="box" class="box"></div>
    `

    const sheet = new CSSStyleSheet()
    sheet.replaceSync('.box { left: 20px; }')
    setLinkStylesheet(requiredElement('#external'), sheet)

    await attach()

    expectRect(requiredElement('#box').getBoundingClientRect(), {
      left: 30,
      top: 20,
      width: 100,
      height: 50,
    })
  })

  it('applies adopted stylesheets after document stylesheets', async () => {
    document.body.innerHTML = `
      <style>
        .box {
          position: absolute;
          left: 10px;
          top: 20px;
          width: 100px;
          height: 50px;
        }
      </style>
      <div id="box" class="box"></div>
    `

    const sheet = new CSSStyleSheet()
    sheet.replaceSync('.box { left: 40px; }')
    document.adoptedStyleSheets = [sheet]

    await attach()

    expect(requiredElement('#box').getBoundingClientRect().left).toBe(40)
  })

  it('invalidates layout when adopted stylesheets change or reorder', async () => {
    document.body.innerHTML = `
      <div
        id="box"
        class="box"
        style="position:absolute; top:0; width:10px; height:10px"
      ></div>
    `

    const first = new CSSStyleSheet()
    const second = new CSSStyleSheet()
    first.replaceSync('.box { left: 10px; }')
    second.replaceSync('.box { left: 20px; }')
    document.adoptedStyleSheets = [first, second]

    await attach()

    const box = requiredElement('#box')
    expect(box.getBoundingClientRect().left).toBe(20)

    document.adoptedStyleSheets = [second, first]
    expect(box.getBoundingClientRect().left).toBe(10)

    document.adoptedStyleSheets = [second]
    expect(box.getBoundingClientRect().left).toBe(20)
  })

  it('invalidates layout when adopted CSSOM rules change', async () => {
    document.body.innerHTML = `
      <div
        id="box"
        class="box"
        style="position:absolute; top:0; width:10px; height:10px"
      ></div>
    `

    const sheet = new CSSStyleSheet()
    sheet.replaceSync('.box { left: 10px; }')
    document.adoptedStyleSheets = [sheet]

    await attach()

    const box = requiredElement('#box')
    expect(box.getBoundingClientRect().left).toBe(10)

    sheet.replaceSync('.box { left: 25px; }')
    expect(box.getBoundingClientRect().left).toBe(25)

    sheet.insertRule('.box { left: 35px; }')
    expect(box.getBoundingClientRect().left).toBe(35)

    sheet.deleteRule(1)
    expect(box.getBoundingClientRect().left).toBe(25)
  })

  it('invalidates layout when accessible external CSSOM rules change', async () => {
    document.body.innerHTML = `
      <link id="external" rel="stylesheet">
      <div
        id="box"
        class="box"
        style="position:absolute; top:0; width:10px; height:10px"
      ></div>
    `

    const sheet = new CSSStyleSheet()
    sheet.replaceSync('.box { left: 10px; }')
    setLinkStylesheet(requiredElement('#external'), sheet)

    await attach()

    const box = requiredElement('#box')
    expect(box.getBoundingClientRect().left).toBe(10)

    sheet.replaceSync('.box { left: 30px; }')
    expect(box.getBoundingClientRect().left).toBe(30)
  })

  it('routes inaccessible external stylesheets through the unsupported CSS policy', async () => {
    document.body.innerHTML = `
      <link id="external" rel="stylesheet">
      <div id="box"></div>
    `

    const inaccessibleSheet = {
      disabled: false,
      get cssRules() {
        throw new DOMException('Blocked by cross-origin policy', 'SecurityError')
      },
    } as unknown as CSSStyleSheet
    setLinkStylesheet(requiredElement('#external'), inaccessibleSheet)

    await attachStrict()

    expect(() => document.body.getBoundingClientRect()).toThrow(
      /external stylesheet .*Blocked by cross-origin policy/,
    )
  })

  it('applies configured media rules against the layout viewport', async () => {
    document.body.innerHTML = `
      <div id="box"></div>
    `

    await attach({
      viewport: { width: 320, height: 640 },
      unsupportedCss: {
        default: 'throw',
      },
      stylesheets: [
        `
          @media (width: 320px) and (orientation: portrait) {
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

    expect(requiredElement('#box').getBoundingClientRect()).toMatchObject({ width: 100, height: 100 })
  })

  it('routes unsupported media features through the unsupported CSS policy', async () => {
    document.body.innerHTML = `
      <style>
        @media (prefers-color-scheme: dark) {
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

    await attachStrict()

    expect(() => document.body.getBoundingClientRect()).toThrow(/Unsupported CSS unsupported-rule.*@media/)
  })

  it('continues to route non-media at-rules through the unsupported CSS policy', async () => {
    document.body.innerHTML = `
      <style>
        @supports (display: grid) {
          #box { width: 100px; }
        }
      </style>
      <div id="box"></div>
    `

    await attachStrict()

    expect(() => document.body.getBoundingClientRect()).toThrow(/Unsupported CSS unsupported-rule.*@supports/)
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

    await attachStrict()

    expect(() => document.body.getBoundingClientRect()).toThrow(/Unsupported CSS unsupported-rule/)
  })
})

async function attachStrict(): Promise<void> {
  await attach({ unsupportedCss: { default: 'throw' } })
}

function setLinkStylesheet(link: Element, sheet: CSSStyleSheet): void {
  Object.defineProperty(link, 'sheet', {
    configurable: true,
    value: sheet,
  })
}
