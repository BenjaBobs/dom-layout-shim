import { it } from 'vitest'
import { expectChromiumParity } from '../parity-harness.ts'

it('display contents removes the parent box and lays out children in the parent context', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #before,
        #after {
          width: 30px;
          height: 10px;
        }

        #contents {
          display: contents;
          width: 200px;
          height: 100px;
        }

        #child {
          width: 80px;
          height: 20px;
        }
      </style>
      <div id="before"></div>
      <div id="contents">
        <div id="child"></div>
      </div>
      <div id="after"></div>
    `,
    queries: [
      { type: 'rect', selector: '#contents' },
      { type: 'rect', selector: '#child' },
      { type: 'rect', selector: '#after' },
      { type: 'point', x: 10, y: 15 },
    ],
  })
})

it('display contents flattens flex children into the flex formatting context', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #row {
          display: flex;
          gap: 5px;
        }

        #contents {
          display: contents;
        }

        #one,
        #two {
          width: 40px;
          height: 20px;
        }
      </style>
      <div id="row">
        <div id="contents">
          <div id="one"></div>
        </div>
        <div id="two"></div>
      </div>
    `,
    queries: [
      { type: 'rect', selector: '#contents' },
      { type: 'rect', selector: '#one' },
      { type: 'rect', selector: '#two' },
      { type: 'point', x: 45, y: 10 },
    ],
  })
})
