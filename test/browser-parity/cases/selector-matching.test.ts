import { it } from 'vitest'
import { expectChromiumParity } from '../parity-harness.ts'

it('matches selector lists descendant and child combinators', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }

        #button, #panel {
          position: absolute;
          width: 50px;
          height: 30px;
        }

        .dialog .button {
          left: 40px;
        }

        #app > .panel {
          top: 60px;
        }
      </style>
      <div class="dialog">
        <button id="button" class="button"></button>
      </div>
      <div id="app">
        <div id="panel" class="panel"></div>
      </div>
    `,
    queries: [
      { type: 'rect', selector: '#button' },
      { type: 'rect', selector: '#panel' },
    ],
  })
})

it('matches supported attribute and functional pseudo-class selectors', async () => {
  await expectChromiumParity({
    viewport: { width: 300, height: 200 },
    html: `
      <style>
        body {
          margin: 0;
        }

        [data-state] {
          position: absolute;
          left: 10px;
          width: 50px;
          height: 50px;
        }

        :where([data-state="open"]) {
          top: 10px;
        }

        :is(.primary, [data-priority="high"]) {
          left: 30px;
        }

        button:not([hidden]) {
          top: 20px;
        }

        [data-tags~="primary"] {
          width: 70px;
        }

        [data-name^="save"] {
          height: 60px;
        }
      </style>
      <button
        id="button"
        data-state="open"
        data-priority="high"
        data-tags="primary action"
        data-name="save-button"
      ></button>
    `,
    queries: [{ type: 'rect', selector: '#button' }],
  })
})
