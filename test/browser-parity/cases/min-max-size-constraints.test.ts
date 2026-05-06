import { it } from 'vitest'
import { expectChromiumParity } from '../parity-harness.ts'

it('min and max size constraints clamp absolute box dimensions', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        #min {
          position: absolute;
          left: 0;
          top: 0;
          width: 50px;
          height: 20px;
          min-width: 80px;
          min-height: 40px;
        }

        #max {
          position: absolute;
          left: 100px;
          top: 0;
          width: 90px;
          height: 60px;
          max-width: 70px;
          max-height: 30px;
        }
      </style>
      <div id="min"></div>
      <div id="max"></div>
    `,
    queries: [
      { type: 'rect', selector: '#min' },
      { type: 'rect', selector: '#max' },
      { type: 'point', x: 79, y: 39 },
      { type: 'point', x: 80, y: 39 },
      { type: 'point', x: 169, y: 29 },
      { type: 'point', x: 170, y: 29 },
    ],
  })
})
