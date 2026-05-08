import { it } from 'vitest'
import { expectChromiumParity } from '../parity-harness.ts'

it('flex align content positions wrapped lines on the cross axis', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #parent {
          display: flex;
          flex-wrap: wrap;
          align-content: center;
          width: 100px;
          height: 80px;
        }

        #first {
          width: 70px;
          height: 20px;
        }

        #second {
          width: 40px;
          height: 10px;
        }
      </style>
      <div id="parent">
        <div id="first"></div>
        <div id="second"></div>
      </div>
    `,
    queries: [
      { type: 'rect', selector: '#parent' },
      { type: 'rect', selector: '#first' },
      { type: 'rect', selector: '#second' },
    ],
  })
})
