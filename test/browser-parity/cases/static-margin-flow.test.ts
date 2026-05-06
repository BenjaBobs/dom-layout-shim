import { it } from 'vitest'
import { expectChromiumParity } from '../parity-harness.ts'

it('static block margins affect parent and child flow geometry', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #parent {
          width: 100px;
          padding: 1px;
        }

        #child {
          height: 20px;
          margin-top: 5px;
          margin-bottom: 7px;
        }
      </style>
      <div id="parent">
        <div id="child"></div>
      </div>
    `,
    queries: [
      { type: 'rect', selector: '#parent' },
      { type: 'rect', selector: '#child' },
    ],
  })
})
