import { it } from 'vitest'
import { expectChromiumParity } from '../parity-harness.ts'

it('closed dialogs are hidden while open dialogs are absolutely positioned outside normal flow', async () => {
  await expectChromiumParity({
    viewport: { width: 400, height: 240 },
    html: `
      <style>
        body {
          margin: 0;
        }

        dialog {
          width: 100px;
          height: 40px;
          margin: 0;
          padding: 0;
          border-width: 0;
          border-style: none;
        }

        #after {
          width: 50px;
          height: 10px;
        }
      </style>
      <dialog id="closed"></dialog>
      <dialog id="open" open></dialog>
      <div id="after"></div>
    `,
    queries: [
      { type: 'rect', selector: '#closed' },
      { type: 'rect', selector: '#open' },
      { type: 'rect', selector: '#after' },
      { type: 'point', x: 10, y: 5 },
    ],
  })
})

it('author display can make a closed dialog participate in layout', async () => {
  await expectChromiumParity({
    viewport: { width: 400, height: 240 },
    html: `
      <style>
        body {
          margin: 0;
        }

        dialog {
          display: block;
          width: 100px;
          height: 40px;
          margin: 0;
          padding: 0;
          border-width: 0;
          border-style: none;
        }
      </style>
      <dialog id="closed"></dialog>
    `,
    queries: [
      { type: 'rect', selector: '#closed' },
      { type: 'point', x: 10, y: 5 },
    ],
  })
})
