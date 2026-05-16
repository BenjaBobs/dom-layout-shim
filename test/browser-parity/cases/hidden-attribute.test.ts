import { it } from 'vitest'
import { expectChromiumParity } from '../parity-harness.ts'

it('hidden attribute removes the element from hit testing and layout rects', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        #target {
          position: absolute;
          left: 0;
          top: 0;
          width: 100px;
          height: 100px;
        }

        #hidden {
          position: absolute;
          left: 0;
          top: 0;
          width: 100px;
          height: 100px;
          z-index: 2;
        }
      </style>
      <div id="target"></div>
      <div id="hidden" hidden></div>
    `,
    queries: [
      { type: 'point', x: 50, y: 50 },
      { type: 'rect', selector: '#hidden' },
    ],
  })
})

it('hidden until-found keeps its own box while suppressing descendant hit testing', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #before,
        #after {
          height: 20px;
        }

        #hidden {
          width: 200px;
          height: 40px;
        }

        #child {
          width: 50px;
          height: 20px;
        }
      </style>
      <div id="before"></div>
      <div id="hidden" hidden="until-found">
        <div id="child"></div>
      </div>
      <div id="after"></div>
    `,
    queries: [
      { type: 'rect', selector: '#hidden' },
      { type: 'rect', selector: '#child' },
      { type: 'rect', selector: '#after' },
      { type: 'point', x: 10, y: 25 },
    ],
  })
})
