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
