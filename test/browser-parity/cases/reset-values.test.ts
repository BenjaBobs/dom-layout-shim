import { it } from 'vitest'
import { expectChromiumParity } from '../parity-harness.ts'

it('applies supported CSS reset values', async () => {
  await expectChromiumParity({
    viewport: { width: 320, height: 240 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #parent {
          position: relative;
          width: 200px;
          height: 150px;
        }

        #width-auto {
          width: 100px;
          width: auto;
          height: 12px;
        }

        #max-none {
          width: 50px;
          max-width: 20px;
          max-width: none;
          height: 10px;
        }

        #min-auto {
          width: 50px;
          min-width: 120px;
          min-width: auto;
          height: 10px;
        }

        #inset-auto {
          position: absolute;
          left: 20px;
          left: auto;
          right: 10px;
          top: 80px;
          width: 30px;
          height: 10px;
        }

        #gap-normal {
          display: flex;
          gap: 20px;
          gap: normal;
        }

        #gap-normal > div {
          width: 30px;
          height: 10px;
        }
      </style>
      <div id="parent">
        <div id="width-auto"></div>
        <div id="max-none"></div>
        <div id="min-auto"></div>
        <div id="inset-auto"></div>
        <div id="gap-normal">
          <div id="gap-first"></div>
          <div id="gap-second"></div>
        </div>
      </div>
    `,
    queries: [
      { type: 'rect', selector: '#width-auto' },
      { type: 'rect', selector: '#max-none' },
      { type: 'rect', selector: '#min-auto' },
      { type: 'rect', selector: '#inset-auto' },
      { type: 'rect', selector: '#gap-first' },
      { type: 'rect', selector: '#gap-second' },
    ],
  })
})
