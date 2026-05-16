import { it } from 'vitest'
import { expectChromiumParity } from '../parity-harness.ts'

it('figure applies native block margins around block children', async () => {
  await expectChromiumParity({
    viewport: { width: 500, height: 300 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #child {
          height: 20px;
        }

        #after {
          height: 10px;
        }
      </style>
      <figure id="figure">
        <div id="child"></div>
      </figure>
      <div id="after"></div>
    `,
    queries: [
      { type: 'rect', selector: '#figure' },
      { type: 'rect', selector: '#child' },
      { type: 'rect', selector: '#after' },
    ],
  })
})

it('author CSS can reset figure margins', async () => {
  await expectChromiumParity({
    viewport: { width: 500, height: 300 },
    html: `
      <style>
        body {
          margin: 0;
        }

        figure {
          margin: 0;
        }

        #child {
          height: 20px;
        }
      </style>
      <figure id="figure">
        <div id="child"></div>
      </figure>
    `,
    queries: [
      { type: 'rect', selector: '#figure' },
      { type: 'rect', selector: '#child' },
    ],
  })
})
