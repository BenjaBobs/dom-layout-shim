import { it } from 'vitest'
import { expectChromiumParity } from '../parity-harness.ts'

it('pointer-events none skips the overlay target', async () => {
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

        #skip {
          position: absolute;
          left: 0;
          top: 0;
          width: 100px;
          height: 100px;
          z-index: 2;
          pointer-events: none;
        }
      </style>
      <div id="target"></div>
      <div id="skip"></div>
    `,
    queries: [{ type: 'point', x: 50, y: 50 }],
  })
})
