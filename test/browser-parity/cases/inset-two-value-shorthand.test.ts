import { it } from 'vitest'
import { expectChromiumParity } from '../parity-harness.ts'

it('two-value inset shorthand applies vertical and horizontal offsets', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        #panel {
          position: fixed;
          inset: 10px 20px;
        }
      </style>
      <div id="panel"></div>
    `,
    queries: [
      { type: 'rect', selector: '#panel' },
      { type: 'point', x: 19, y: 100 },
      { type: 'point', x: 20, y: 100 },
    ],
  })
})
