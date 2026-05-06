import { it } from 'vitest'
import { expectChromiumParity } from '../parity-harness.ts'

it('pre-wrap text preserves explicit line breaks', async () => {
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
          white-space: pre-wrap;
        }
      </style>
      <div id="text">Hello
World</div>
    `,
    queries: [{ type: 'rect', selector: '#text' }],
  })
})
