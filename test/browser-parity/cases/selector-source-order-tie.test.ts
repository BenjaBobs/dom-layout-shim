import { it } from 'vitest'
import { expectChromiumParity } from '../parity-harness.ts'

it('source order wins when selector specificity is tied', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        .box {
          position: absolute;
          left: 10px;
          top: 20px;
          width: 50px;
          height: 40px;
        }

        .box {
          left: 100px;
        }
      </style>
      <div id="box" class="box"></div>
    `,
    queries: [{ type: 'rect', selector: '#box' }],
  })
})
