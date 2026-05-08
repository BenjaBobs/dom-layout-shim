import { it } from 'vitest'
import { expectChromiumParity } from '../parity-harness.ts'

it('grid numeric line placement positions items on explicit tracks', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #parent {
          display: grid;
          grid-template-columns: 40px 30px;
          grid-template-rows: 20px 10px;
          width: 200px;
        }

        #first {
          grid-column: 2;
          grid-row: 2;
        }
      </style>
      <div id="parent">
        <div id="first"></div>
      </div>
    `,
    queries: [
      { type: 'rect', selector: '#parent' },
      { type: 'rect', selector: '#first' },
    ],
  })
})
