import { it } from 'vitest'
import { expectChromiumParity } from '../parity-harness.ts'

it('percentage dimensions resolve against containing block size', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #parent {
          width: 200px;
          height: 80px;
        }

        #child {
          width: 50%;
          height: 25%;
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
