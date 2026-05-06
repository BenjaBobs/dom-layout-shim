import { it } from 'vitest'
import { expectChromiumParity } from '../parity-harness.ts'

it('static children are laid out inside parent padding and border', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #parent {
          width: 100px;
          padding: 10px;
          border-style: solid;
          border-width: 2px;
        }

        #child {
          height: 20px;
        }
      </style>
      <div id="parent">
        <div id="child"></div>
      </div>
    `,
    queries: [
      { type: 'rect', selector: '#parent' },
      { type: 'rect', selector: '#child' },
      { type: 'point', x: 13, y: 13 },
    ],
  })
})
