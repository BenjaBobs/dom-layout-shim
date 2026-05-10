import { afterEach, describe, expect, it } from 'vitest'
import { attach, expectRect, requiredElement } from './layout-engine-helpers.ts'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('stylesheet source handling', () => {
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
})
