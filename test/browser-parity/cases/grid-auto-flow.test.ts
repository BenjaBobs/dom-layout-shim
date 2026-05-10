import { it } from 'vitest'
import { expectChromiumParity } from '../parity-harness.ts'

it('grid auto flow column places items down columns', async () => {
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
          grid-auto-flow: column;
          width: 200px;
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

it('grid auto flow dense backfills available cells', async () => {
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
          grid-template-rows: 20px 10px;
          grid-auto-flow: row dense;
          width: 200px;
        }

        #first {
          grid-column: span 2;
        }

        #second {
          grid-column: span 2;
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
