import { it } from 'vitest'
import { expectChromiumParity } from '../parity-harness.ts'

it('window scroll offsets viewport rects and point queries without moving fixed boxes', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    scroll: { x: 0, y: 80 },
    html: `
      <style>
        body {
          margin: 0;
          min-height: 500px;
        }

        #normal {
          position: absolute;
          left: 10px;
          top: 100px;
          width: 80px;
          height: 50px;
        }

        #fixed {
          position: fixed;
          left: 10px;
          top: 10px;
          width: 80px;
          height: 40px;
        }
      </style>
      <div id="normal"></div>
      <div id="fixed"></div>
    `,
    queries: [
      { type: 'rect', selector: '#normal' },
      { type: 'rect', selector: '#fixed' },
      { type: 'point', x: 20, y: 20 },
      { type: 'point', x: 20, y: 60 },
    ],
  })
})
