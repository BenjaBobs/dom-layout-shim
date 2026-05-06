import { it } from 'vitest'
import { expectChromiumParity } from '../parity-harness.ts'

it('elementsFromPoint returns elements in visual stacking order', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        #bottom,
        #middle,
        #top {
          position: absolute;
          left: 0;
          top: 0;
          width: 100px;
          height: 100px;
        }

        #bottom {
          z-index: 1;
        }

        #middle {
          z-index: 2;
        }

        #top {
          z-index: 3;
        }
      </style>
      <div id="bottom"></div>
      <div id="top"></div>
      <div id="middle"></div>
    `,
    queries: [{ type: 'point', x: 50, y: 50 }],
  })
})
