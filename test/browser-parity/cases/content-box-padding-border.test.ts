import { it } from 'vitest'
import { expectChromiumParity } from '../parity-harness.ts'

it('content-box dimensions include padding and border outside the declared size', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        #box {
          position: absolute;
          left: 10px;
          top: 20px;
          width: 100px;
          height: 50px;
          padding: 5px 10px;
          border-style: solid;
          border-width: 2px 4px;
        }
      </style>
      <div id="box"></div>
    `,
    queries: [
      { type: 'rect', selector: '#box' },
      { type: 'dimensions', selector: '#box' },
      { type: 'point', x: 137, y: 83 },
      { type: 'point', x: 138, y: 83 },
    ],
  })
})
