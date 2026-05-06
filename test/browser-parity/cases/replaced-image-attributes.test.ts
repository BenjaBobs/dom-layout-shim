import { it } from 'vitest'
import { expectChromiumParity } from '../parity-harness.ts'

it('image width and height attributes provide replaced element dimensions', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }
      </style>
      <img id="logo" width="24" height="16" alt="">
    `,
    queries: [{ type: 'rect', selector: '#logo' }],
  })
})
