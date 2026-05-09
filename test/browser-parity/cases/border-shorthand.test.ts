import { it } from 'vitest'
import { expectChromiumParity } from '../parity-harness.ts'

it('applies border shorthands to layout geometry', async () => {
  await expectChromiumParity({
    viewport: { width: 320, height: 220 },
    html: `
      <style>
        #stylesheet {
          position: absolute;
          left: 10px;
          top: 20px;
          width: 100px;
          height: 50px;
          border: 2px solid red;
        }

        #edge {
          position: absolute;
          left: 10px;
          top: 100px;
          width: 100px;
          height: 50px;
          border: solid currentColor;
          border-left: 5px solid #00f;
        }
      </style>
      <div id="stylesheet"></div>
      <div id="inline" style="position:absolute; left:150px; top:20px; width:100px; height:50px; border:4px solid black"></div>
      <div id="edge"></div>
    `,
    queries: [
      { type: 'rect', selector: '#stylesheet' },
      { type: 'dimensions', selector: '#stylesheet' },
      { type: 'rect', selector: '#inline' },
      { type: 'dimensions', selector: '#inline' },
      { type: 'rect', selector: '#edge' },
      { type: 'dimensions', selector: '#edge' },
    ],
  })
})
