import { it } from 'vitest'
import { expectChromiumParity } from '../parity-harness.ts'

it('static text line height determines block height', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #text {
          width: 100px;
          font-size: 20px;
          line-height: 30px;
        }
      </style>
      <div id="text">Hello</div>
    `,
    queries: [{ type: 'rect', selector: '#text' }],
  })
})
