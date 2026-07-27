import { it } from 'vitest'
import { expectChromiumParity } from '../parity-harness.ts'

it('grid items stretch auto sizes to their grid areas', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #grid {
          display: grid;
          grid-template-columns: 80px 100px;
          grid-template-rows: 50px;
          width: 200px;
          height: 80px;
          align-items: stretch;
          justify-items: stretch;
        }

        #explicit {
          width: 30px;
          height: 20px;
        }
      </style>
      <div id="grid">
        <div id="auto"></div>
        <div id="explicit"></div>
      </div>
    `,
    queries: [
      { type: 'rect', selector: '#auto' },
      { type: 'rect', selector: '#explicit' },
    ],
  })
})

it('grid self alignment overrides container item alignment', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #grid {
          display: grid;
          grid-template-columns: 80px 80px;
          grid-template-rows: 60px;
          align-items: start;
          justify-items: start;
        }

        #grid > div {
          width: 20px;
          height: 10px;
        }

        #second {
          align-self: end;
          justify-self: end;
        }
      </style>
      <div id="grid">
        <div id="first"></div>
        <div id="second"></div>
      </div>
    `,
    queries: [
      { type: 'rect', selector: '#first' },
      { type: 'rect', selector: '#second' },
    ],
  })
})
