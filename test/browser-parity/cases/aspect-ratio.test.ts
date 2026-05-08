import { it } from 'vitest'
import { expectChromiumParity } from '../parity-harness.ts'

it('aspect ratio resolves auto height from explicit width', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #box {
          width: 80px;
          aspect-ratio: 2 / 1;
        }
      </style>
      <div id="box"></div>
    `,
    queries: [{ type: 'rect', selector: '#box' }],
  })
})
