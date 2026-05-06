import { it } from 'vitest'
import { expectChromiumParity } from '../parity-harness.ts'

it('border-box dimensions include padding and border inside the declared size', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        #box {
          position: absolute;
          box-sizing: border-box;
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
      { type: 'point', x: 109, y: 69 },
      { type: 'point', x: 110, y: 69 },
    ],
  })
})
