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

        #position-initial {
          position: absolute;
          left: 50px;
          top: 50px;
          position: initial;
          width: 40px;
          height: 10px;
        }

        #box-sizing-initial {
          box-sizing: border-box;
          box-sizing: initial;
          width: 40px;
          height: 10px;
          padding: 5px;
          border: 2px solid black;
        }

        #flex-reset {
          display: flex;
          align-items: center;
          align-items: initial;
          width: 120px;
          height: 40px;
        }

        #flex-reset-a {
          order: 2;
          order: initial;
          flex-grow: 1;
          flex-grow: initial;
          width: 20px;
          height: 10px;
        }

        #flex-reset-b {
          order: 1;
          order: initial;
          width: 20px;
          height: 20px;
        }

        #grid-reset {
          display: grid;
          grid-template-columns: 30px 40px;
          grid-template-rows: 10px 20px;
          grid-auto-flow: column;
          grid-auto-flow: initial;
          width: 120px;
        }

        #grid-reset-a {
          grid-area: 2 / 2 / 3 / 3;
          grid-area: initial;
        }

        #grid-reset-b {
          grid-column: 2;
          grid-column: unset;
          grid-row-start: 2;
          grid-row-start: initial;
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
        <div id="position-initial"></div>
        <div id="box-sizing-initial"></div>
        <div id="flex-reset">
          <div id="flex-reset-a"></div>
          <div id="flex-reset-b"></div>
        </div>
        <div id="grid-reset">
          <div id="grid-reset-a"></div>
          <div id="grid-reset-b"></div>
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
      { type: 'rect', selector: '#position-initial' },
      { type: 'rect', selector: '#box-sizing-initial' },
      { type: 'rect', selector: '#flex-reset-a' },
      { type: 'rect', selector: '#flex-reset-b' },
      { type: 'rect', selector: '#grid-reset-a' },
      { type: 'rect', selector: '#grid-reset-b' },
    ],
  })
})
