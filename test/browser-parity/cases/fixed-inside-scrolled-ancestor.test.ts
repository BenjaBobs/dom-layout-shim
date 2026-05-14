import { it } from 'vitest'
import { expectChromiumParity } from '../parity-harness.ts'

it('fixed descendants stay viewport anchored inside scrolled ancestors', async () => {
  await expectChromiumParity({
    viewport: { width: 260, height: 180 },
    elementScrolls: [{ selector: '#scroller', x: 0, y: 40 }],
    html: `
      <style>
        body {
          margin: 0;
        }

        #scroller {
          position: relative;
          left: 10px;
          top: 20px;
          width: 100px;
          height: 60px;
          overflow: auto;
        }

        #spacer {
          height: 160px;
        }

        #fixed {
          position: fixed;
          left: 30px;
          top: 40px;
          width: 50px;
          height: 30px;
        }
      </style>
      <div id="scroller">
        <div id="spacer"></div>
        <div id="fixed"></div>
      </div>
    `,
    queries: [
      { type: 'rect', selector: '#scroller' },
      { type: 'rect', selector: '#fixed' },
      { type: 'point', x: 40, y: 50 },
    ],
  })
})
