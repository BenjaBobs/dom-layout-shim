import { it } from 'vitest'
import { expectChromiumParity } from '../parity-harness.ts'

it('box sizing changes how min and max constraints are applied', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        #content-box {
          position: absolute;
          left: 0;
          top: 0;
          width: 10px;
          height: 10px;
          min-width: 20px;
          min-height: 15px;
          padding: 5px;
          border-style: solid;
          border-width: 2px;
        }

        #border-box {
          position: absolute;
          left: 0;
          top: 40px;
          box-sizing: border-box;
          width: 100px;
          height: 60px;
          max-width: 80px;
          max-height: 30px;
          padding: 5px;
          border-style: solid;
          border-width: 2px;
        }
      </style>
      <div id="content-box"></div>
      <div id="border-box"></div>
    `,
    queries: [
      { type: 'rect', selector: '#content-box' },
      { type: 'rect', selector: '#border-box' },
    ],
  })
})
