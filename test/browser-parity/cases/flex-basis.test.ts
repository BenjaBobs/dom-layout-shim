import { it } from 'vitest'
import { expectChromiumParity } from '../parity-harness.ts'

it('flex basis controls flex item base size', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #parent {
          display: flex;
          width: 200px;
        }

        #first {
          width: 20px;
          height: 20px;
          flex-basis: 60px;
          flex-shrink: 0;
        }

        #second {
          width: 30px;
          height: 10px;
        }
      </style>
      <div id="parent">
        <div id="first"></div>
        <div id="second"></div>
      </div>
    `,
    queries: [
      { type: 'rect', selector: '#parent' },
      { type: 'rect', selector: '#first' },
      { type: 'rect', selector: '#second' },
    ],
  })
})
