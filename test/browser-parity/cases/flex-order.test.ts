import { it } from 'vitest'
import { expectChromiumParity } from '../parity-harness.ts'

it('flex order changes item layout order', async () => {
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
          order: 2;
          width: 40px;
          height: 20px;
        }

        #second {
          order: -1;
          width: 30px;
          height: 10px;
        }

        #third {
          width: 20px;
          height: 15px;
        }
      </style>
      <div id="parent">
        <div id="first"></div>
        <div id="second"></div>
        <div id="third"></div>
      </div>
    `,
    queries: [
      { type: 'rect', selector: '#first' },
      { type: 'rect', selector: '#second' },
      { type: 'rect', selector: '#third' },
    ],
  })
})
