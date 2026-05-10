import { it } from 'vitest'
import { expectChromiumParity } from '../parity-harness.ts'

it('grid order changes auto-placement order', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #parent {
          display: grid;
          grid-template-columns: 40px 30px 20px;
          grid-template-rows: 20px;
          width: 200px;
        }

        #first {
          order: 2;
        }

        #second {
          order: -1;
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
