import { it } from 'vitest'
import { expectChromiumParity } from '../parity-harness.ts'

it('center clickability is blocked by an overlay', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        #save {
          position: absolute;
          left: 20px;
          top: 20px;
          width: 80px;
          height: 40px;
        }

        #overlay {
          position: fixed;
          inset: 0;
          z-index: 10;
        }
      </style>
      <button id="save">Save</button>
      <div id="overlay"></div>
    `,
    queries: [{ type: 'center-clickability', selector: '#save' }],
  })
})
