import { it } from 'vitest'
import { expectChromiumParity } from '../parity-harness.ts'

it('static block flow stacks blocks vertically', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #one {
          width: 100px;
          height: 30px;
        }

        #two {
          width: 80px;
          height: 40px;
        }
      </style>
      <div id="one"></div>
      <div id="two"></div>
    `,
    queries: [
      { type: 'rect', selector: '#one' },
      { type: 'rect', selector: '#two' },
      { type: 'point', x: 10, y: 35 },
    ],
  })
})

it('static positioned blocks ignore inset properties', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #one {
          position: static;
          left: 50px;
          top: 50px;
          width: 100px;
          height: 30px;
        }

        #two {
          width: 80px;
          height: 40px;
        }
      </style>
      <div id="one"></div>
      <div id="two"></div>
    `,
    queries: [
      { type: 'rect', selector: '#one' },
      { type: 'rect', selector: '#two' },
    ],
  })
})
