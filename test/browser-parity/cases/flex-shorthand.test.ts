import { it } from 'vitest'
import { expectChromiumParity } from '../parity-harness.ts'

it('flex shorthand expands into grow shrink and basis inputs', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #parent {
          display: flex;
          width: 200px;
        }

        #first {
          height: 20px;
          flex: 1 0 50px;
        }

        #second {
          height: 10px;
          flex: 3 0 50px;
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
