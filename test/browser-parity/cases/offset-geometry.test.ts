import { it } from 'vitest'
import { expectChromiumParity } from '../parity-harness.ts'

it('reports offset geometry relative to the nearest positioned ancestor', async () => {
  await expectChromiumParity({
    viewport: { width: 400, height: 300 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #outer {
          position: relative;
          left: 20px;
          top: 10px;
          width: 200px;
          height: 120px;
          padding: 12px;
          border: 4px solid;
          overflow: auto;
        }

        #inner {
          margin-left: 7px;
          margin-top: 9px;
          width: 80px;
          height: 40px;
          border: 2px solid;
        }

        #fixed {
          position: fixed;
          left: 30px;
          top: 40px;
          width: 20px;
          height: 10px;
        }
      </style>
      <div id="outer">
        <div id="inner"></div>
      </div>
      <div id="fixed"></div>
    `,
    elementScrolls: [
      { selector: '#outer', x: 3, y: 5 },
    ],
    queries: [
      { type: 'dimensions', selector: '#outer' },
      { type: 'dimensions', selector: '#inner' },
      { type: 'dimensions', selector: '#fixed' },
    ],
  })
})
