import { it } from 'vitest'
import { expectChromiumParity } from '../parity-harness.ts'

it('border width keywords contribute browser-equivalent geometry', async () => {
  await expectChromiumParity({
    viewport: { width: 320, height: 220 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #box {
          box-sizing: content-box;
          width: 100px;
          height: 50px;
          border-style: solid dashed double dotted;
          border-width: thin medium thick thin;
        }
      </style>
      <div id="box"></div>
    `,
    queries: [
      { type: 'rect', selector: '#box' },
      { type: 'dimensions', selector: '#box' },
    ],
  })
})
